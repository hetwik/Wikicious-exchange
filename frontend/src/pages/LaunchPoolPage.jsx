import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = path => axios.get(`${API_URL}${path}`).then(r => r.data);

// ── formatters ──────────────────────────────────────────────────────────
const fmtAmt = (v, dec = 18) => { const n = Number(v) / 10**dec; return n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(2)}K` : n.toFixed(2); };
const fmtSec = s => { const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60); return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`; };

// ── Mock pools for development ──────────────────────────────────────────
const MOCK_POOLS = [
  { id: 0, projectName: 'ApeSwap V3', projectURL: 'https://apeswap.finance', status: 'live', stakeToken: '0x...', rewardToken: '0x...', rewardBudget: '5000000000000000000000000', rewardPaid: '1200000000000000000000000', totalStaked: '840000000000000000000000', rewardPerSecond: '19290123456789012', startTime: String(Math.floor(Date.now()/1000)-86400*3), endTime: String(Math.floor(Date.now()/1000)+86400*27), progress: '11.1', maxStakePerUser: '50000000000000000000000', active: true },
  { id: 1, projectName: 'Vertex Edge', projectURL: 'https://vertex.xyz', status: 'live', stakeToken: '0x...', rewardToken: '0x...', rewardBudget: '10000000000000000000000000', rewardPaid: '3100000000000000000000000', totalStaked: '2100000000000000000000000', rewardPerSecond: '38580246913580246', startTime: String(Math.floor(Date.now()/1000)-86400*8), endTime: String(Math.floor(Date.now()/1000)+86400*22), progress: '31.0', maxStakePerUser: '0', active: true },
  { id: 2, projectName: 'KyberSwap Zap', projectURL: 'https://kyberswap.com', status: 'upcoming', stakeToken: '0x...', rewardToken: '0x...', rewardBudget: '8000000000000000000000000', rewardPaid: '0', totalStaked: '0', rewardPerSecond: '30864197530864197', startTime: String(Math.floor(Date.now()/1000)+86400*2), endTime: String(Math.floor(Date.now()/1000)+86400*32), progress: '0.0', maxStakePerUser: '0', active: true },
  { id: 3, projectName: 'Gamma LP', projectURL: 'https://gamma.xyz', status: 'ended', stakeToken: '0x...', rewardToken: '0x...', rewardBudget: '3000000000000000000000000', rewardPaid: '3000000000000000000000000', totalStaked: '420000000000000000000000', rewardPerSecond: '0', startTime: '1700000000', endTime: '1702591999', progress: '100.0', maxStakePerUser: '0', active: false },
];

// ── StatusBadge ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = { live: ['#00E5A0','LIVE'], upcoming: ['#FFB800','SOON'], ended: ['#555C78','ENDED'] }[status] || ['#555C78','—'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
      background: `${cfg[0]}18`, color: cfg[0], border: `1px solid ${cfg[0]}35` }}>
      {cfg[1]}
    </span>
  );
}

// ── ProgressBar ─────────────────────────────────────────────────────────
function ProgressBar({ pct, color = '#5B7FFF' }) {
  return (
    <div style={{ height: 4, background: '#0D0F17', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width .5s' }} />
    </div>
  );
}

// ── Countdown ───────────────────────────────────────────────────────────
function Countdown({ endTime, label = 'Ends in' }) {
  const [left, setLeft] = useState(Math.max(0, Number(endTime) - Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = Math.floor(left % 60);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#4A5270', fontSize: 11 }}>{label}</span>
      {[d,'d', h,'h', m,'m', s,'s'].reduce((acc, v, i) => {
        if (i % 2 === 0) acc.push(
          <span key={i} style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: left < 3600 ? '#FF4060' : '#EDF0FA' }}>
            {String(v).padStart(2,'0')}
          </span>
        );
        else acc.push(<span key={i} style={{ color: '#4A5270', fontSize: 11 }}>{v}</span>);
        return acc;
      }, [])}
    </div>
  );
}

// ── Pool Card ───────────────────────────────────────────────────────────
function PoolCard({ pool, userPosition, onSelectPool }) {
  const pct = parseFloat(pool.progress);
  const apr = pool.totalStaked !== '0'
    ? ((Number(pool.rewardPerSecond) * 365 * 86400 / Number(pool.totalStaked)) * 100).toFixed(1)
    : '—';

  const statusColors = { live: '#00E5A0', upcoming: '#FFB800', ended: '#555C78' };
  const accent = statusColors[pool.status] || '#5B7FFF';

  return (
    <div onClick={() => onSelectPool(pool)} style={{ background: '#0D0F17', border: `1px solid ${pool.status === 'live' ? '#00E5A030' : '#1C2138'}`,
      borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all .18s',
      boxShadow: pool.status === 'live' ? '0 0 40px #00E5A006' : 'none' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}60`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = pool.status === 'live' ? '#00E5A030' : '#1C2138'; e.currentTarget.style.transform = 'none'; }}>

      {/* Top stripe */}
      <div style={{ height: 3, background: pool.status === 'live' ? 'linear-gradient(90deg, #00E5A0, #5B7FFF)' : '#1C2138' }} />

      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${accent}20`, border: `1.5px solid ${accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: accent }}>
              {pool.projectName[0]}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA' }}>{pool.projectName}</div>
              <a href={pool.projectURL} target="_blank" rel="noopener noreferrer"
                style={{ color: '#4A5270', fontSize: 11, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                {pool.projectURL.replace('https://', '')} ↗
              </a>
            </div>
          </div>
          <StatusBadge status={pool.status} />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'APR', v: apr === '—' ? '—' : `${apr}%`, color: '#00E5A0' },
            { l: 'TVL', v: fmtAmt(pool.totalStaked), color: '#5B7FFF' },
            { l: 'Budget', v: fmtAmt(pool.rewardBudget), color: '#FFB800' },
            { l: 'Distributed', v: `${pct}%`, color: '#A855F7' },
          ].map(({ l, v, color }) => (
            <div key={l} style={{ background: '#0A0C16', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{l}</div>
              <div style={{ color, fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: '#4A5270', fontSize: 11 }}>Rewards distributed</span>
            <span style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} color={accent} />
        </div>

        {/* Timer */}
        {pool.status === 'live'     && <Countdown endTime={pool.endTime}   label="Ends in" />}
        {pool.status === 'upcoming' && <Countdown endTime={pool.startTime} label="Starts in" />}

        {/* User position badge */}
        {userPosition && Number(userPosition.staked) > 0 && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#5B7FFF12', border: '1px solid #5B7FFF30',
            borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8892B0', fontSize: 11 }}>Your stake</span>
            <span style={{ color: '#5B7FFF', fontWeight: 800, fontSize: 12, fontFamily: 'monospace' }}>
              {fmtAmt(userPosition.staked)} WIK
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StakePanel (side panel when pool selected) ───────────────────────────
function StakePanel({ pool, userPosition, onClose }) {
  const [tab, setTab] = useState('stake');
  const [amount, setAmount] = useState('');
  const apr = pool && pool.totalStaked !== '0'
    ? ((Number(pool.rewardPerSecond) * 365 * 86400 / Number(pool.totalStaked)) * 100).toFixed(2)
    : '0';

  if (!pool) return null;
  return (
    <div style={{ width: 340, background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 16,
      overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #00E5A0, #5B7FFF)' }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#EDF0FA' }}>{pool.projectName}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A5270', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* APR highlight */}
        <div style={{ background: 'linear-gradient(135deg, #00E5A012, #5B7FFF08)', border: '1px solid #00E5A030',
          borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>CURRENT APR</div>
          <div style={{ color: '#00E5A0', fontSize: 36, fontWeight: 900, fontFamily: 'monospace' }}>{apr}%</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, background: '#0A0C16',
          padding: 3, borderRadius: 9, marginBottom: 20 }}>
          {['stake','unstake','harvest'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '8px 4px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all .12s',
                background: tab === t ? '#5B7FFF' : 'transparent', color: tab === t ? '#fff' : '#4A5270', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            ['Your Stake', userPosition ? fmtAmt(userPosition.staked) + ' WIK' : '0 WIK'],
            ['Pending', userPosition ? fmtAmt(userPosition.pending || '0') + ' tokens' : '0'],
          ].map(([l, v]) => (
            <div key={l} style={{ background: '#0A0C16', borderRadius: 8, padding: 10 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{l}</div>
              <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {(tab === 'stake' || tab === 'unstake') && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
                {tab === 'stake' ? 'AMOUNT TO STAKE (WIK)' : 'AMOUNT TO UNSTAKE (WIK)'}
              </div>
              <div style={{ position: 'relative' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number"
                  style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 9,
                    color: '#EDF0FA', fontSize: 18, fontWeight: 800, fontFamily: 'monospace',
                    padding: '12px 72px 12px 14px', outline: 'none', boxSizing: 'border-box' }} />
                <button style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6,
                  color: '#5B7FFF', fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>MAX</button>
              </div>
            </div>
            <button style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer',
              background: tab === 'stake' ? 'linear-gradient(135deg, #00E5A0, #00B87A)' : 'linear-gradient(135deg, #FF4060, #CC2040)',
              color: '#fff', letterSpacing: '0.04em' }}>
              {tab === 'stake' ? '🌱 STAKE WIK' : '📤 UNSTAKE WIK'}
            </button>
          </>
        )}

        {tab === 'harvest' && (
          <>
            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ color: '#4A5270', fontSize: 11, marginBottom: 6 }}>Claimable rewards</div>
              <div style={{ color: '#FFB800', fontSize: 28, fontWeight: 900, fontFamily: 'monospace' }}>
                {userPosition ? fmtAmt(userPosition.pending || '0') : '0'} <span style={{ fontSize: 14, color: '#8892B0' }}>tokens</span>
              </div>
            </div>
            <button style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg, #FFB800, #FF8C00)', color: '#000', letterSpacing: '0.04em' }}>
              🌾 HARVEST REWARDS
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function LaunchPoolPage() {
  const { address } = useAccount();
  const [filter, setFilter]       = useState('all');
  const [selectedPool, setSelect] = useState(null);

  const { data: pools = MOCK_POOLS } = useQuery({ queryKey: ['launchpool-pools'], queryFn: () => api('/api/launchpool/pools'), refetchInterval: 30000 });
  const { data: userPositions = [] } = useQuery({ queryKey: ['launchpool-user', address], queryFn: () => api(`/api/launchpool/user/${address}`), enabled: !!address, refetchInterval: 15000 });

  const userPosMap = Object.fromEntries(userPositions.map(p => [p.pid, p]));
  const filtered   = filter === 'all' ? pools : pools.filter(p => p.status === filter);

  const tvl  = pools.reduce((a, p) => a + Number(p.totalStaked) / 1e18, 0);
  const live = pools.filter(p => p.status === 'live').length;

  return (
    <AppLayout active="launchpool">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #00E5A020, #5B7FFF20)',
              border: '1px solid #00E5A040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🌱</div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Launchpool</h1>
              <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>Stake WIK or WLP, earn new project tokens for free</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { l: 'Total Value Staked',   v: `${tvl >= 1e6 ? `${(tvl/1e6).toFixed(2)}M` : (tvl/1e3).toFixed(1)+'K'} WIK`, c: '#5B7FFF' },
            { l: 'Active Pools',         v: live, c: '#00E5A0' },
            { l: 'Total Pools',          v: pools.length, c: '#A855F7' },
            { l: 'Your Active Stakes',   v: userPositions.length, c: '#FFB800' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{l.toUpperCase()}</div>
              <div style={{ color: c, fontSize: 24, fontWeight: 900, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0A0C16', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid #1C2138' }}>
          {[['all','All'],['live','🟢 Live'],['upcoming','🟡 Upcoming'],['ended','⚫ Ended']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: filter === id ? '#5B7FFF' : 'transparent', color: filter === id ? '#fff' : '#4A5270', transition: 'all .12s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Main content: pool grid + stake panel */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(p => (
              <PoolCard key={p.id} pool={p} userPosition={userPosMap[p.id]} onSelectPool={setSelect} />
            ))}
          </div>
          {selectedPool && (
            <StakePanel pool={selectedPool} userPosition={userPosMap[selectedPool.id]} onClose={() => setSelect(null)} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
