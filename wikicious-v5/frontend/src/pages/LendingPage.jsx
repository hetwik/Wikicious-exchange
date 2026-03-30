import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

const fmtPct  = (v, decimals = 18) => { const n = Number(v) / 10**decimals; return `${(n * 100).toFixed(2)}%`; };
const fmtUSDC = (v) => { const n = Number(v) / 1e6; return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(2)}K` : `$${n.toFixed(2)}`; };
const fmtHealth = (v) => { if (!v || v === '0') return '∞'; const n = Number(v)/1e18; if (n > 999) return '∞'; return n.toFixed(2); };
const healthColor = (v) => { const n = Number(v)/1e18; if (n >= 2) return '#00E5A0'; if (n >= 1.2) return '#FFB800'; return '#FF4060'; };

const MOCK_MARKETS = [
  { id: 0, symbol: 'USDC',  supplyAPY: '4500000000000000', borrowAPY: '7200000000000000', utilization: '620000000000000000', totalSupply: '1500000000000000000000000', totalBorrows: '930000000000000000000000', collateralFactor: '850000000000000000', supplyEnabled: true, borrowEnabled: true },
  { id: 1, symbol: 'WETH',  supplyAPY: '2100000000000000', borrowAPY: '4800000000000000', utilization: '430000000000000000', totalSupply: '450000000000000000000', totalBorrows: '193500000000000000000', collateralFactor: '800000000000000000', supplyEnabled: true, borrowEnabled: true },
  { id: 2, symbol: 'WBTC',  supplyAPY: '1800000000000000', borrowAPY: '3900000000000000', utilization: '380000000000000000', totalSupply: '120000000000000000000', totalBorrows: '45600000000000000000', collateralFactor: '750000000000000000', supplyEnabled: true, borrowEnabled: true },
  { id: 3, symbol: 'ARB',   supplyAPY: '8200000000000000', borrowAPY: '14100000000000000', utilization: '580000000000000000', totalSupply: '9200000000000000000000000', totalBorrows: '5336000000000000000000000', collateralFactor: '700000000000000000', supplyEnabled: true, borrowEnabled: true },
  { id: 4, symbol: 'WIK',   supplyAPY: '18500000000000000', borrowAPY: '0', utilization: '0', totalSupply: '50000000000000000000000000', totalBorrows: '0', collateralFactor: '600000000000000000', supplyEnabled: true, borrowEnabled: false },
];

function UtilBar({ util }) {
  const pct = Math.min(Number(util) / 1e16, 100);
  const color = pct > 80 ? '#FF4060' : pct > 60 ? '#FFB800' : '#00E5A0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#0A0C16', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function MarketModal({ market, mode, onClose }) {
  const [amount, setAmount] = useState('');
  const isSupply = mode === 'supply';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000A0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 20, padding: 28, width: 400,
        boxShadow: '0 24px 80px #00000080' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#EDF0FA' }}>
            {isSupply ? '📈 Supply' : '📉 Borrow'} {market.symbol}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A5270', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            [isSupply ? 'Supply APY' : 'Borrow APY', fmtPct(isSupply ? market.supplyAPY : market.borrowAPY)],
            ['Collateral Factor', fmtPct(market.collateralFactor)],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#0A0C16', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{k}</div>
              <div style={{ color: isSupply ? '#00E5A0' : '#FF8C42', fontWeight: 800, fontSize: 16, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>AMOUNT</div>
          <div style={{ position: 'relative' }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 10,
                color: '#EDF0FA', fontSize: 20, fontWeight: 800, fontFamily: 'monospace',
                padding: '12px 80px 12px 16px', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#8892B0', fontWeight: 700 }}>{market.symbol}</span>
              <button style={{ background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6,
                color: '#5B7FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', cursor: 'pointer' }}>MAX</button>
            </div>
          </div>
        </div>

        <button style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 900,
          cursor: 'pointer', border: 'none', background: isSupply ? 'linear-gradient(135deg, #00E5A0, #00B87A)' : 'linear-gradient(135deg, #FF8C42, #FF4060)',
          color: '#fff' }}>
          {isSupply ? 'Supply' : 'Borrow'} {market.symbol}
        </button>
      </div>
    </div>
  );
}

export default function LendingPage() {
  const { address } = useAccount();
  const [modal, setModal] = useState(null); // { market, mode }

  const { data: markets = MOCK_MARKETS } = useQuery({ queryKey: ['lending-markets'], queryFn: () => api('/api/lending/markets'), refetchInterval: 30000 });
  const { data: userData } = useQuery({ queryKey: ['lending-user', address], queryFn: () => api(`/api/lending/user/${address}`), enabled: !!address });

  const hf = userData?.healthFactor;
  const hfNum = hf ? Number(hf)/1e18 : null;

  return (
    <AppLayout active="lending">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#00E5A020', border: '1px solid #00E5A040',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏦</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Lend & Borrow</h1>
            </div>
            <p style={{ color: '#4A5270', fontSize: 14, margin: 0 }}>Supply assets to earn yield. Borrow against your collateral.</p>
          </div>

          {/* Health factor */}
          {address && hfNum && (
            <div style={{ background: '#0E1120', border: `1px solid ${healthColor(hf)}40`, borderRadius: 12, padding: '16px 24px', textAlign: 'center' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>HEALTH FACTOR</div>
              <div style={{ color: healthColor(hf), fontSize: 28, fontWeight: 900, fontFamily: 'monospace' }}>{fmtHealth(hf)}</div>
              <div style={{ color: '#4A5270', fontSize: 11, marginTop: 4 }}>
                {hfNum >= 2 ? '✅ Healthy' : hfNum >= 1.2 ? '⚠️ Caution' : '🚨 At Risk'}
              </div>
            </div>
          )}
        </div>

        {/* User positions */}
        {userData?.positions?.length > 0 && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>Your Positions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {userData.positions.map(p => (
                <div key={p.marketId} style={{ background: '#0A0C16', borderRadius: 8, padding: 12 }}>
                  <div style={{ color: '#8892B0', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Market #{p.marketId}</div>
                  {Number(p.supplied) > 0 && <div style={{ color: '#00E5A0', fontSize: 13, fontFamily: 'monospace' }}>
                    ↑ {fmtUSDC(p.supplied)} supplied
                  </div>}
                  {Number(p.borrowed) > 0 && <div style={{ color: '#FF8C42', fontSize: 13, fontFamily: 'monospace' }}>
                    ↓ {fmtUSDC(p.borrowed)} borrowed
                  </div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market table */}
        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 2fr 1fr', gap: 0,
            padding: '12px 20px', borderBottom: '1px solid #1C2138', background: '#0A0C16' }}>
            {['Asset','Supply APY','Borrow APY','Collateral','Utilization','Action'].map(h => (
              <div key={h} style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{h.toUpperCase()}</div>
            ))}
          </div>

          {/* Rows */}
          {markets.map(m => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 2fr 1fr', gap: 0,
              padding: '16px 20px', borderBottom: '1px solid #1C213880',
              transition: 'background 0.15s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = '#12151F'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

              {/* Asset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#5B7FFF' }}>
                  {m.symbol.slice(0,1)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#EDF0FA', fontSize: 14 }}>{m.symbol}</div>
                  <div style={{ color: '#4A5270', fontSize: 11 }}>
                    {m.supplyEnabled ? '✓ Supply' : ''} {m.borrowEnabled ? '✓ Borrow' : ''}
                  </div>
                </div>
              </div>

              {/* Supply APY */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#00E5A0', fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>
                  {fmtPct(m.supplyAPY)}
                </span>
              </div>

              {/* Borrow APY */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: m.borrowEnabled ? '#FF8C42' : '#4A5270', fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>
                  {m.borrowEnabled ? fmtPct(m.borrowAPY) : '—'}
                </span>
              </div>

              {/* Collateral Factor */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#8892B0', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
                  {fmtPct(m.collateralFactor)}
                </span>
              </div>

              {/* Utilization bar */}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16 }}>
                <UtilBar util={m.utilization} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {m.supplyEnabled && (
                  <button onClick={() => setModal({ market: m, mode: 'supply' })}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#00E5A015', border: '1px solid #00E5A040',
                      color: '#00E5A0', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Supply</button>
                )}
                {m.borrowEnabled && (
                  <button onClick={() => setModal({ market: m, mode: 'borrow' })}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#FF8C4215', border: '1px solid #FF8C4240',
                      color: '#FF8C42', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Borrow</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 24 }}>
          {[
            { icon: '📊', title: 'Dynamic Rates', desc: 'Interest rates adjust automatically based on pool utilization using a kinked rate model.' },
            { icon: '🛡️', title: 'Overcollateralized', desc: 'All loans require collateral worth more than the borrowed amount, protecting lenders.' },
            { icon: '⚡', title: 'WIK Incentives', desc: 'Earn WIK token rewards on top of base yield for both supplying and borrowing.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontWeight: 800, color: '#EDF0FA', fontSize: 14, marginBottom: 6 }}>{title}</div>
              <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && <MarketModal market={modal.market} mode={modal.mode} onClose={() => setModal(null)} />}
    </AppLayout>
  );
}
