import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

const fmtWIK  = (v) => { const n = Number(v) / 1e18; return n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(2)}K` : n.toFixed(2); };
const fmtPct  = (v) => { return `${(Number(v) / 1e16).toFixed(2)}%`; };
const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

const LOCK_DURATIONS = [
  { label: '1 Week',   secs: 7  * 86400, multiplier: 0.019 },
  { label: '1 Month',  secs: 30 * 86400, multiplier: 0.082 },
  { label: '3 Months', secs: 90 * 86400, multiplier: 0.25  },
  { label: '6 Months', secs: 180* 86400, multiplier: 0.5   },
  { label: '1 Year',   secs: 365* 86400, multiplier: 1.0   },
  { label: '2 Years',  secs: 730* 86400, multiplier: 2.0   },
  { label: '4 Years',  secs: 1461*86400, multiplier: 4.0   },
];

function StatCard({ label, value, sub, accent = '#5B7FFF' }) {
  return (
    <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ color: accent, fontSize: 26, fontWeight: 800, fontFamily: 'monospace', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ color: '#4A5270', fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function LockPanel({ userData }) {
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(LOCK_DURATIONS[4]);

  const veWIK = amount ? (parseFloat(amount) * duration.multiplier).toFixed(2) : '0';
  const share  = userData?.currentVeWIK && amount
    ? ((parseFloat(veWIK) / (Number(userData.currentVeWIK)/1e18 + parseFloat(veWIK))) * 100).toFixed(2)
    : '0';

  return (
    <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#EDF0FA', marginBottom: 20 }}>Lock WIK → veWIK</div>

      {/* Duration selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>LOCK DURATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {LOCK_DURATIONS.map(d => (
            <button key={d.label} onClick={() => setDuration(d)}
              style={{ padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                borderColor: duration.label === d.label ? '#5B7FFF' : '#1C2138',
                background: duration.label === d.label ? '#5B7FFF15' : 'transparent',
                color: duration.label === d.label ? '#5B7FFF' : '#4A5270', transition: 'all 0.15s' }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>AMOUNT (WIK)</div>
        <div style={{ position: 'relative' }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
            style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8,
              color: '#EDF0FA', fontSize: 18, fontWeight: 700, fontFamily: 'monospace',
              padding: '12px 80px 12px 16px', outline: 'none', boxSizing: 'border-box' }} />
          <button style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6,
            color: '#5B7FFF', fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}>MAX</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ background: '#0A0C16', borderRadius: 8, padding: 16, marginBottom: 20, border: '1px solid #1C2138' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#4A5270', fontSize: 12 }}>You will receive</span>
          <span style={{ color: '#5B7FFF', fontSize: 14, fontWeight: 800, fontFamily: 'monospace' }}>{veWIK} veWIK</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#4A5270', fontSize: 12 }}>Fee share</span>
          <span style={{ color: '#00E5A0', fontSize: 12, fontWeight: 700 }}>{share}% of protocol fees</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#4A5270', fontSize: 12 }}>Unlock date</span>
          <span style={{ color: '#8892B0', fontSize: 12, fontFamily: 'monospace' }}>
            {new Date(Date.now() + duration.secs * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <button style={{ width: '100%', padding: 14, borderRadius: 10, background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)',
        border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}>
        LOCK WIK
      </button>
    </div>
  );
}

function FarmingPool({ pool, userData }) {
  const poolData = userData?.pools?.find(p => p.pid === pool.id);
  const [depositAmt, setDepositAmt] = useState('');

  return (
    <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5B7FFF30', border: '2px solid #5B7FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#5B7FFF' }}>W</div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#00E5A020', border: '2px solid #00E5A0',
              marginLeft: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#00E5A0' }}>U</div>
          </div>
          <div>
            <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 14 }}>Pool #{pool.id}</div>
            <div style={{ color: '#4A5270', fontSize: 11 }}>{pool.lpToken?.slice(0,8)}...</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00E5A0', fontWeight: 800, fontSize: 16 }}>142.8% APR</div>
          <div style={{ color: '#4A5270', fontSize: 11 }}>+ boost up to 2.5×</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { l: 'TVL', v: `$${fmtWIK(pool.totalBoosted)}` },
          { l: 'My Deposit', v: poolData ? fmtWIK(poolData.lpAmount) : '—' },
          { l: 'Pending WIK', v: poolData ? fmtWIK(poolData.pendingWIK) : '—' },
        ].map(({ l, v }) => (
          <div key={l} style={{ background: '#0A0C16', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{l}</div>
            <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Amount to deposit"
          style={{ flex: 1, background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8,
            color: '#EDF0FA', fontSize: 13, padding: '10px 12px', outline: 'none' }} />
        <button style={{ padding: '10px 16px', borderRadius: 8, background: '#5B7FFF20', border: '1px solid #5B7FFF40',
          color: '#5B7FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Deposit</button>
        <button style={{ padding: '10px 16px', borderRadius: 8, background: '#00E5A010', border: '1px solid #00E5A040',
          color: '#00E5A0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Harvest</button>
      </div>
    </div>
  );
}

export default function StakingPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('lock');

  const { data: stats } = useQuery({ queryKey: ['staking-stats'], queryFn: () => api('/api/staking/stats'), refetchInterval: 15000 });
  const { data: pools = [] } = useQuery({ queryKey: ['staking-pools'], queryFn: () => api('/api/staking/pools') });
  const { data: userData } = useQuery({ queryKey: ['staking-user', address], queryFn: () => api(`/api/staking/user/${address}`), enabled: !!address, refetchInterval: 10000 });

  return (
    <AppLayout active="staking">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #5B7FFF20, #7B5EA720)',
              border: '1px solid #5B7FFF40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Stake & Farm</h1>
          </div>
          <p style={{ color: '#4A5270', fontSize: 14, margin: 0 }}>Lock WIK for veWIK to earn protocol fees. Farm LP tokens for WIK emissions.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total WIK Locked"   value={stats ? fmtWIK(stats.totalLockedWIK) : '—'} sub="WIK tokens" accent="#5B7FFF" />
          <StatCard label="Total veWIK Supply" value={stats ? fmtWIK(stats.totalVeWIK)     : '—'} sub="Voting power" accent="#A855F7" />
          <StatCard label="WIK/second Emitted" value={stats ? fmtWIK(stats.wikPerSecond)   : '—'} sub="Farm rewards" accent="#00E5A0" />
          <StatCard label="Active Farm Pools"  value={stats ? stats.poolCount              : '—'} sub="Earning pools" accent="#FFB800" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0A0C16', padding: 4, borderRadius: 10, width: 'fit-content',
          border: '1px solid #1C2138' }}>
          {[['lock','🔒 Lock WIK'],['farm','🌾 Farm LP'],['rewards','💰 Rewards']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: tab === id ? '#5B7FFF' : 'transparent',
                color: tab === id ? '#fff' : '#4A5270', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Lock Tab */}
        {tab === 'lock' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <LockPanel userData={userData} />
            <div>
              {/* Current lock info */}
              {userData?.lock?.amount && userData.lock.amount !== '0' ? (
                <div style={{ background: '#0E1120', border: '1px solid #5B7FFF40', borderRadius: 12, padding: 24, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#5B7FFF', marginBottom: 16 }}>Your Active Lock</div>
                  {[
                    ['Locked WIK', fmtWIK(userData.lock.amount)],
                    ['Your veWIK', fmtWIK(userData.currentVeWIK)],
                    ['Unlock Date', fmtDate(userData.lock.unlockTime)],
                    ['Pending Fees', `${(Number(userData.pendingFees)/1e6).toFixed(2)} USDC`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ color: '#4A5270', fontSize: 13 }}>{k}</span>
                      <span style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button style={{ flex: 1, padding: 10, borderRadius: 8, background: '#00E5A015', border: '1px solid #00E5A040',
                      color: '#00E5A0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Claim Fees</button>
                    <button style={{ flex: 1, padding: 10, borderRadius: 8, background: '#FF406015', border: '1px solid #FF406040',
                      color: '#FF4060', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Unlock (50% penalty)</button>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                  <div style={{ color: '#EDF0FA', fontWeight: 700, marginBottom: 8 }}>No active lock</div>
                  <div style={{ color: '#4A5270', fontSize: 13 }}>Lock WIK to earn protocol fees and boost farming rewards</div>
                </div>
              )}

              {/* veWIK benefits */}
              <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#EDF0FA', marginBottom: 16 }}>veWIK Benefits</div>
                {[
                  ['💰', 'Protocol Fee Revenue', '100% of trading fees distributed to veWIK holders'],
                  ['⚡', 'Farming Boost', 'Up to 2.5× boost on LP farming rewards'],
                  ['🚀', 'Launchpad Tier', 'Gold tier access to exclusive IDO allocations'],
                  ['🗳️', 'Governance Votes', 'Vote on protocol parameters and fee switches'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <div>
                      <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{title}</div>
                      <div style={{ color: '#4A5270', fontSize: 12 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Farm Tab */}
        {tab === 'farm' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {pools.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <FarmingPool key={i} pool={{ id: i, lpToken: '0x...', totalBoosted: '1000000000000000000000000', allocPoint: '100', active: true }} userData={userData} />
                ))
              : pools.map(p => <FarmingPool key={p.id} pool={p} userData={userData} />)
            }
          </div>
        )}

        {/* Rewards Tab */}
        {tab === 'rewards' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#EDF0FA', marginBottom: 20 }}>Claimable Rewards</div>
              {[
                { type: 'Protocol Fees', amount: userData ? `${(Number(userData.pendingFees||0)/1e6).toFixed(4)} USDC` : '—', color: '#5B7FFF', btn: 'Claim Fees' },
                { type: 'WIK Farming (Pool #0)', amount: userData?.pools?.[0] ? `${fmtWIK(userData.pools[0].pendingWIK)} WIK` : '—', color: '#00E5A0', btn: 'Harvest' },
                { type: 'WIK Farming (Pool #1)', amount: userData?.pools?.[1] ? `${fmtWIK(userData.pools[1].pendingWIK)} WIK` : '—', color: '#00E5A0', btn: 'Harvest' },
              ].map(({ type, amount, color, btn }) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: '1px solid #1C2138' }}>
                  <div>
                    <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 14 }}>{type}</div>
                    <div style={{ color, fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{amount}</div>
                  </div>
                  <button style={{ padding: '10px 20px', borderRadius: 8, background: `${color}15`, border: `1px solid ${color}40`,
                    color, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{btn}</button>
                </div>
              ))}
              <button style={{ width: '100%', marginTop: 20, padding: 14, borderRadius: 10,
                background: 'linear-gradient(135deg, #5B7FFF, #00E5A0)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                Claim All Rewards
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
