import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = path => axios.get(`${API_URL}${path}`).then(r => r.data);

// ── helpers ──────────────────────────────────────────────────────────────
const fmtUSD  = v => { const n = Number(v)/1e6; return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(2)}K` : `$${n.toFixed(2)}`; };
const fmtTok  = (v, d = 18) => { const n = Number(v)/10**d; return n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(2)}K` : n.toFixed(4); };
const fmtFee  = bps => `${Number(bps)/100}%`;
const tkLabel = addr => ({ '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': 'USDC', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 'WETH', '0x912CE59144191C1204E64559FE8253a0e49E6548': 'ARB' }[addr] || addr?.slice(0, 6) + '...');

// ── Mock pools ───────────────────────────────────────────────────────────
const MOCK_POOLS = [
  { id: 0, tokenA: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', tokenB: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', feeBps: '30', reserveA: '4820000000000', reserveB: '1256000000000000000000', totalLP: '2464000000000000000000000', totalVolumeA: '284000000000000', wikPerSecond: '1000000000000000', price: '3835600000000000000000', active: true },
  { id: 1, tokenA: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', tokenB: '0x912CE59144191C1204E64559FE8253a0e49E6548', feeBps: '30', reserveA: '1840000000000', reserveB: '1000000000000000000000000', totalLP: '1358000000000000000000000', totalVolumeA: '96000000000000', wikPerSecond: '500000000000000', price: '1840000000000000000', active: true },
  { id: 2, tokenA: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', tokenB: '0x912CE59144191C1204E64559FE8253a0e49E6548', feeBps: '100', reserveA: '480000000000000000000', reserveB: '1000000000000000000000000', totalLP: '693000000000000000000000', totalVolumeA: '34000000000000000000000', wikPerSecond: '0', price: '2000000000000000', active: true },
];

const FEE_COLORS = { '5': '#00E5A0', '30': '#5B7FFF', '100': '#FFB800' };

// ── PoolRow ──────────────────────────────────────────────────────────────
function PoolRow({ pool, userPos, onClick }) {
  const la   = tkLabel(pool.tokenA);
  const lb   = tkLabel(pool.tokenB);
  const fee  = fmtFee(pool.feeBps);
  const fc   = FEE_COLORS[pool.feeBps] || '#8892B0';
  const tvl  = fmtUSD(pool.reserveA);
  const vol  = fmtUSD(pool.totalVolumeA);
  const apr  = pool.wikPerSecond !== '0'
    ? `${(Number(pool.wikPerSecond) * 365 * 86400 * 100 / Math.max(Number(pool.totalLP), 1)).toFixed(1)}%`
    : `${(Number(pool.feeBps) / 100 * 2).toFixed(2)}%`;

  return (
    <div onClick={onClick} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.5fr', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #1C213840', cursor: 'pointer', transition: 'background .12s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#12151F'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      {/* Pair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex' }}>
          {[la, lb].map((t, i) => (
            <div key={t} style={{ width: 32, height: 32, borderRadius: '50%', background: '#5B7FFF20', border: '2px solid #0D0F17',
              marginLeft: i ? -10 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#5B7FFF', zIndex: i ? 1 : 0 }}>
              {t.slice(0, 3)}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#EDF0FA', fontSize: 14 }}>{la}/{lb}</div>
          <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${fc}20`, color: fc }}>
            {fee} fee
          </span>
        </div>
      </div>

      {/* TVL */}
      <div style={{ fontFamily: 'monospace', color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{tvl}</div>
      {/* Volume */}
      <div style={{ fontFamily: 'monospace', color: '#8892B0', fontSize: 13 }}>{vol}</div>
      {/* APR */}
      <div style={{ color: '#00E5A0', fontWeight: 800, fontSize: 14, fontFamily: 'monospace' }}>{apr}</div>
      {/* Price */}
      <div style={{ color: '#8892B0', fontFamily: 'monospace', fontSize: 12 }}>${(Number(pool.price)/1e18).toFixed(2)}</div>
      {/* My liquidity */}
      <div style={{ color: userPos ? '#5B7FFF' : '#4A5270', fontFamily: 'monospace', fontSize: 12 }}>
        {userPos ? fmtTok(userPos.lpBalance) + ' LP' : '—'}
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={e => { e.stopPropagation(); onClick('add'); }}
          style={{ padding: '6px 12px', borderRadius: 7, background: '#00E5A015', border: '1px solid #00E5A040',
            color: '#00E5A0', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>+ Add</button>
        {userPos && (
          <button onClick={e => { e.stopPropagation(); onClick('remove'); }}
            style={{ padding: '6px 12px', borderRadius: 7, background: '#FF406015', border: '1px solid #FF406040',
              color: '#FF4060', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>− Remove</button>
        )}
      </div>
    </div>
  );
}

// ── LiquidityModal ───────────────────────────────────────────────────────
function LiquidityModal({ pool, mode, onClose }) {
  const [amtA, setAmtA] = useState('');
  const [amtB, setAmtB] = useState('');
  const la = tkLabel(pool.tokenA), lb = tkLabel(pool.tokenB);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000B0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 20, padding: 28, width: 420, boxShadow: '0 24px 80px #00000080' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#EDF0FA' }}>
            {mode === 'add' ? '+ Add Liquidity' : '− Remove Liquidity'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A5270', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>{la} AMOUNT</div>
          <input value={amtA} onChange={e => setAmtA(e.target.value)} placeholder="0.00" type="number"
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#EDF0FA', fontSize: 22, fontWeight: 800, fontFamily: 'monospace', outline: 'none' }} />
        </div>

        <div style={{ textAlign: 'center', color: '#4A5270', margin: '8px 0', fontSize: 18 }}>+</div>

        <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>{lb} AMOUNT</div>
          <input value={amtB} onChange={e => setAmtB(e.target.value)} placeholder="0.00" type="number"
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#EDF0FA', fontSize: 22, fontWeight: 800, fontFamily: 'monospace', outline: 'none' }} />
        </div>

        <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          {[['Pool Share', '~0.00%'], ['Fee Tier', fmtFee(pool.feeBps)], ['Price', `${(Number(pool.price)/1e18).toFixed(4)} ${lb}/${la}`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
              <span style={{ color: '#8892B0', fontSize: 12, fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>

        <button style={{ width: '100%', padding: 15, borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: 'pointer', border: 'none',
          background: mode === 'add' ? 'linear-gradient(135deg, #00E5A0, #00B87A)' : 'linear-gradient(135deg, #FF4060, #CC2040)', color: mode === 'add' ? '#000' : '#fff' }}>
          {mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function LiquidityPoolsPage() {
  const { address } = useAccount();
  const [modal, setModal] = useState(null);
  const [sortBy, setSortBy] = useState('tvl');

  const { data: pools = MOCK_POOLS } = useQuery({ queryKey: ['lp-pools'], queryFn: () => api('/api/lp/pools'), refetchInterval: 30000 });
  const { data: userPos = [] }       = useQuery({ queryKey: ['lp-user', address], queryFn: () => api(`/api/lp/user/${address}`), enabled: !!address, refetchInterval: 15000 });

  const userPosMap = Object.fromEntries(userPos.map(p => [p.pid, p]));
  const totalTVL   = pools.reduce((a, p) => a + Number(p.reserveA) / 1e6 * 2, 0);

  return (
    <AppLayout active="pools">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💧</div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Liquidity Pools</h1>
                <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>Provide liquidity, earn trading fees + WIK incentives</p>
              </div>
            </div>
            <button style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)',
              border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              + Create Pool
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { l: 'Total TVL', v: `$${totalTVL >= 1e6 ? (totalTVL/1e6).toFixed(2)+'M' : (totalTVL/1e3).toFixed(1)+'K'}`, c: '#5B7FFF' },
            { l: 'Active Pools', v: pools.length, c: '#00E5A0' },
            { l: 'Your Positions', v: userPos.length, c: '#A855F7' },
            { l: 'Fee Tiers', v: '3 (0.05/0.3/1%)', c: '#FFB800' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{l.toUpperCase()}</div>
              <div style={{ color: c, fontSize: 22, fontWeight: 900, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.5fr',
            padding: '12px 20px', borderBottom: '1px solid #1C2138', background: '#0A0C16' }}>
            {[['Pool',''],['TVL','tvl'],['Volume 24h','vol'],['APR','apr'],['Price',''],['My Liquidity',''],['Actions','']].map(([h]) => (
              <div key={h} style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>{h.toUpperCase()}</div>
            ))}
          </div>

          {pools.map(p => (
            <PoolRow key={p.id} pool={p} userPos={userPosMap[p.id]}
              onClick={mode => setModal({ pool: p, mode: typeof mode === 'string' ? mode : 'add' })} />
          ))}
        </div>

        {/* Fee tiers explanation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
          {[
            { fee: '0.05%', color: '#00E5A0', title: 'Stable Pairs', desc: 'USDC/USDT, stablecoin swaps. Very low fee for near-peg assets.' },
            { fee: '0.30%', color: '#5B7FFF', title: 'Standard Pairs', desc: 'ETH/USDC, BTC/USDC. Most common pairs. Balanced fee/depth.' },
            { fee: '1.00%', color: '#FFB800', title: 'Exotic Pairs', desc: 'Low-liquidity alts. Higher fee compensates for volatility risk.' },
          ].map(({ fee, color, title, desc }) => (
            <div key={fee} style={{ background: '#0D0F17', border: `1px solid ${color}30`, borderRadius: 12, padding: 18 }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: `${color}20`, color, display: 'inline-block', marginBottom: 10 }}>{fee}</span>
              <div style={{ fontWeight: 800, color: '#EDF0FA', fontSize: 14, marginBottom: 6 }}>{title}</div>
              <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && <LiquidityModal pool={modal.pool} mode={modal.mode} onClose={() => setModal(null)} />}
    </AppLayout>
  );
}
