import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

const STATUS_COLOR = { Pending: '#FFB800', Active: '#00E5A0', Filled: '#5B7FFF', Failed: '#FF4060', Finalized: '#A855F7' };
const TIER_LABEL   = { 0: 'Public', 1: '🥉 Bronze', 2: '🥈 Silver', 3: '🥇 Gold' };
const TIER_COLOR   = { 0: '#8892B0', 1: '#CD7F32', 2: '#C0C0C0', 3: '#FFD700' };

function Countdown({ endTime }) {
  const diff = Math.max(0, Number(endTime) * 1000 - Date.now());
  const d    = Math.floor(diff / 86400000);
  const h    = Math.floor((diff % 86400000) / 3600000);
  const m    = Math.floor((diff % 3600000) / 60000);
  const s    = Math.floor((diff % 60000) / 1000);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[[d,'D'],[h,'H'],[m,'M'],[s,'S']].map(([v, l]) => (
        <div key={l} style={{ textAlign: 'center' }}>
          <div style={{ background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 6, padding: '6px 10px',
            fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#EDF0FA', minWidth: 36 }}>
            {String(v).padStart(2, '0')}
          </div>
          <div style={{ color: '#4A5270', fontSize: 9, fontWeight: 700, marginTop: 3 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function SaleCard({ sale, userTier }) {
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const progress = parseFloat(sale.progress);
  const isActive = sale.status === 'Active';

  return (
    <div style={{ background: '#0E1120', border: `1px solid ${isActive ? '#00E5A040' : '#1C2138'}`, borderRadius: 16, overflow: 'hidden',
      transition: 'border-color 0.2s', boxShadow: isActive ? '0 0 40px #00E5A008' : 'none' }}>

      {/* Header band */}
      <div style={{ background: isActive ? 'linear-gradient(90deg, #00E5A008, #0E1120)' : '#0A0C16',
        padding: '16px 20px', borderBottom: '1px solid #1C2138', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${STATUS_COLOR[sale.status]}20`,
            border: `1px solid ${STATUS_COLOR[sale.status]}40`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#EDF0FA' }}>{sale.name}</div>
            <div style={{ color: '#4A5270', fontSize: 12, fontFamily: 'monospace' }}>
              {sale.saleToken ? `${sale.saleToken.slice(0, 8)}...` : 'Token pending'}
            </div>
          </div>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
          background: `${STATUS_COLOR[sale.status]}20`, color: STATUS_COLOR[sale.status], border: `1px solid ${STATUS_COLOR[sale.status]}40` }}>
          {sale.status.toUpperCase()}
        </span>
      </div>

      <div style={{ padding: 20 }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#4A5270', fontSize: 12 }}>Progress</span>
            <span style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
              {(Number(sale.totalRaised)/1e6).toFixed(0)} / {(Number(sale.hardcap)/1e6).toFixed(0)} USDC
            </span>
          </div>
          <div style={{ height: 6, background: '#0A0C16', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`,
              background: progress >= 100 ? '#5B7FFF' : 'linear-gradient(90deg, #00E5A0, #5B7FFF)',
              borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <div style={{ color: '#00E5A0', fontSize: 11, fontWeight: 700, marginTop: 4 }}>{progress}% raised</div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            ['Price', `${(Number(sale.pricePerToken)/1e18).toFixed(6)} USDC`],
            ['Hardcap', `$${(Number(sale.hardcap)/1e6).toLocaleString()}`],
            ['Your Tier', TIER_LABEL[userTier] || 'Public'],
            ['Status', sale.status],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#0A0C16', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{k.toUpperCase()}</div>
              <div style={{ color: k === 'Your Tier' ? TIER_COLOR[userTier] : '#EDF0FA', fontWeight: 700, fontSize: 12 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Countdown */}
        {(sale.status === 'Active' || sale.status === 'Pending') && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              {sale.status === 'Active' ? 'CLOSES IN' : 'OPENS IN'}
            </div>
            <Countdown endTime={sale.status === 'Active' ? sale.endTime : sale.startTime} />
          </div>
        )}

        {/* Participate */}
        {isActive && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="USDC amount"
              style={{ flex: 1, background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8,
                color: '#EDF0FA', fontSize: 13, padding: '10px 12px', outline: 'none' }} />
            <button style={{ padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #5B7FFF, #00E5A0)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Commit
            </button>
          </div>
        )}

        {sale.status === 'Finalized' && (
          <button style={{ width: '100%', padding: 12, borderRadius: 8, background: '#5B7FFF20',
            border: '1px solid #5B7FFF40', color: '#5B7FFF', fontWeight: 700, cursor: 'pointer' }}>
            Claim Tokens
          </button>
        )}
      </div>
    </div>
  );
}

// Mock sales for display when no contract deployed
const MOCK_SALES = [
  { id: 0, name: 'WikiSwap', status: 'Active', totalRaised: '450000000000', hardcap: '1000000000000', pricePerToken: '10000000000000', progress: '45.00', startTime: '1700000000', endTime: String(Math.floor(Date.now()/1000) + 86400*3) },
  { id: 1, name: 'ChainVault', status: 'Pending', totalRaised: '0', hardcap: '500000000000', pricePerToken: '5000000000000', progress: '0.00', startTime: String(Math.floor(Date.now()/1000) + 86400), endTime: String(Math.floor(Date.now()/1000) + 86400*7) },
  { id: 2, name: 'MetaFi', status: 'Finalized', totalRaised: '2000000000000', hardcap: '2000000000000', pricePerToken: '20000000000000', progress: '100.00', startTime: '1699000000', endTime: '1699086400' },
];

export default function LaunchpadPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState('all');

  const { data: sales = MOCK_SALES }     = useQuery({ queryKey: ['launchpad-sales'], queryFn: () => api('/api/launchpad/sales') });
  const { data: userData = { tier: 0 } } = useQuery({ queryKey: ['launchpad-user', address], queryFn: () => api(`/api/launchpad/user/${address}`), enabled: !!address });

  const filtered = filter === 'all' ? sales : sales.filter(s => s.status.toLowerCase() === filter);

  return (
    <AppLayout active="launchpad">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFB80020', border: '1px solid #FFB80040',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Launchpad</h1>
              </div>
              <p style={{ color: '#4A5270', fontSize: 14, margin: 0 }}>Exclusive token launches for WIK holders. Higher tier = bigger guaranteed allocation.</p>
            </div>

            {/* Tier badge */}
            {address && (
              <div style={{ background: `${TIER_COLOR[userData.tier]}15`, border: `1px solid ${TIER_COLOR[userData.tier]}40`,
                borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>YOUR TIER</div>
                <div style={{ color: TIER_COLOR[userData.tier], fontWeight: 900, fontSize: 18 }}>{TIER_LABEL[userData.tier]}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tier overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { tier: 'Public', req: 'No WIK', alloc: 'FCFS only', color: '#8892B0', icon: '👥' },
            { tier: 'Bronze', req: '500 veWIK', alloc: 'Bronze pool', color: '#CD7F32', icon: '🥉' },
            { tier: 'Silver', req: '2,000 veWIK', alloc: 'Silver + below', color: '#C0C0C0', icon: '🥈' },
            { tier: 'Gold',   req: '10,000 veWIK', alloc: 'All pools', color: '#FFD700', icon: '🥇' },
          ].map(({ tier, req, alloc, color, icon }) => (
            <div key={tier} style={{ background: '#0E1120', border: `1px solid ${color}30`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
              <div style={{ color, fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{tier}</div>
              <div style={{ color: '#4A5270', fontSize: 11, marginBottom: 4 }}>Min: {req}</div>
              <div style={{ color: '#8892B0', fontSize: 11 }}>{alloc}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0A0C16', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid #1C2138' }}>
          {[['all','All'],['active','Active'],['pending','Upcoming'],['finalized','Ended']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: filter === id ? '#5B7FFF' : 'transparent', color: filter === id ? '#fff' : '#4A5270', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sales grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map(s => <SaleCard key={s.id} sale={s} userTier={userData.tier} />)}
        </div>
      </div>
    </AppLayout>
  );
}
