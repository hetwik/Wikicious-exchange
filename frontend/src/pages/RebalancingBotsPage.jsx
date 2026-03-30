import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = path => axios.get(`${API_URL}${path}`).then(r => r.data);

const fmtUSD    = v => { const n = Number(v)/1e6; return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(2)}K` : `$${n.toFixed(2)}`; };
const fmtShares = v => { const n = Number(v)/1e18; return n.toFixed(4); };
const fmtPct    = bps => `${(Number(bps)/100).toFixed(2)}%`;
const timeSince = ts => { const s = Date.now()/1000 - Number(ts); return s < 60 ? `${Math.round(s)}s ago` : s < 3600 ? `${Math.round(s/60)}m ago` : `${Math.round(s/3600)}h ago`; };

// ── Mocks ─────────────────────────────────────────────────────────────────
const MOCK_STRATEGIES = [
  { id: '0', name: 'DeFi Blue Chips', description: 'Equal-weight ETH, BTC, ARB, LINK rebalanced monthly', creator: '0x1234...', driftBps: '300', keeperTip: '10', active: true, usage: '3', allocations: [{ token: 'WETH', targetBps: '2500' }, { token: 'WBTC', targetBps: '2500' }, { token: 'ARB', targetBps: '2500' }, { token: 'LINK', targetBps: '2500' }] },
  { id: '1', name: 'Yield Optimizer', description: '60% stablecoins, 30% ETH, 10% WIK — risk-adjusted', creator: '0x5678...', driftBps: '200', keeperTip: '15', active: true, usage: '1', allocations: [{ token: 'USDC', targetBps: '6000' }, { token: 'WETH', targetBps: '3000' }, { token: 'WIK', targetBps: '1000' }] },
  { id: '2', name: 'Momentum Index', description: 'Top 5 performers from the last 30 days, rebalanced weekly', creator: '0x9abc...', driftBps: '500', keeperTip: '20', active: true, usage: '0', allocations: [{ token: 'WETH', targetBps: '3000' }, { token: 'ARB', targetBps: '2500' }, { token: 'LINK', targetBps: '2000' }, { token: 'USDC', targetBps: '2500' }] },
];
const MOCK_VAULTS = [
  { id: 0, name: 'Blue Chip Index', strategyId: '0', depositToken: '0xaf88...', totalShares: '84200000000000000000000', sharePrice: '1240000', drift: '420', performanceFeeBps: '1000', mgmtFeeBps: '200', lastRebalance: String(Math.floor(Date.now()/1000)-3600), active: true },
  { id: 1, name: 'Stable Growth', strategyId: '1', depositToken: '0xaf88...', totalShares: '12800000000000000000000', sharePrice: '1080000', drift: '185', performanceFeeBps: '800', mgmtFeeBps: '100', lastRebalance: String(Math.floor(Date.now()/1000)-7200), active: true },
];

// ── AllocationBar ─────────────────────────────────────────────────────────
function AllocationBar({ allocations }) {
  const colors = ['#5B7FFF','#00E5A0','#FFB800','#A855F7','#FF8C42','#FF4060'];
  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8, gap: 1 }}>
        {allocations.map((a, i) => (
          <div key={a.token} style={{ width: `${Number(a.targetBps)/100}%`, background: colors[i % colors.length] }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allocations.map((a, i) => (
          <span key={a.token} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8892B0' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], display: 'inline-block' }} />
            {a.token} {fmtPct(a.targetBps)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── DriftIndicator ───────────────────────────────────────────────────────
function DriftIndicator({ driftBps, threshold }) {
  const pct = Number(driftBps) / 100;
  const thr = Number(threshold) / 100;
  const color = pct >= thr ? '#FF4060' : pct >= thr * 0.7 ? '#FFB800' : '#00E5A0';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color, fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>{pct.toFixed(2)}%</span>
        <span style={{ color: '#4A5270', fontSize: 11 }}>/{thr}% trigger</span>
      </div>
      <div style={{ height: 4, background: '#0A0C16', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct/thr * 100, 100)}%`, background: color, borderRadius: 2, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

// ── StrategyCard ─────────────────────────────────────────────────────────
function StrategyCard({ strat, onDeposit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 14, overflow: 'hidden', transition: 'all .2s' }}>
      <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 3 }}>{strat.name}</div>
            <div style={{ color: '#4A5270', fontSize: 12 }}>{strat.description}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: '#00E5A015', color: '#00E5A0', border: '1px solid #00E5A030' }}>
              {strat.usage} vaults
            </span>
            <span style={{ color: '#4A5270', fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        <AllocationBar allocations={strat.allocations} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
          {[
            ['Drift Trigger', fmtPct(strat.driftBps)],
            ['Keeper Tip', fmtPct(strat.keeperTip)],
            ['Creator', strat.creator.slice(0,10)+'...'],
          ].map(([l, v]) => (
            <div key={l} style={{ background: '#0A0C16', borderRadius: 7, padding: '8px 10px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{l}</div>
              <div style={{ color: '#8892B0', fontSize: 12, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1C2138' }}>
          <div style={{ paddingTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => onDeposit(strat)}
              style={{ flex: 1, padding: '11px 0', borderRadius: 9, background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Deposit Into This Strategy
            </button>
            <button style={{ padding: '11px 16px', borderRadius: 9, background: '#FFB80015', border: '1px solid #FFB80040', color: '#FFB800', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              📋 Copy Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VaultCard ─────────────────────────────────────────────────────────────
function VaultCard({ vault, strategy, userValue }) {
  const driftPct     = Number(vault.drift) / 100;
  const thresholdPct = Number(strategy?.driftBps || 300) / 100;
  const needsRebal   = driftPct >= thresholdPct;

  return (
    <div style={{ background: '#0D0F17', border: `1px solid ${needsRebal ? '#FF406040' : '#1C2138'}`, borderRadius: 14, padding: 20,
      boxShadow: needsRebal ? '0 0 20px #FF406008' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA' }}>{vault.name}</div>
          <div style={{ color: '#4A5270', fontSize: 12, marginTop: 2 }}>{strategy?.name || `Strategy #${vault.strategyId}`}</div>
        </div>
        {needsRebal && (
          <span style={{ padding: '4px 10px', borderRadius: 20, background: '#FF406020', color: '#FF4060', border: '1px solid #FF406040', fontSize: 10, fontWeight: 800 }}>
            ⚠ NEEDS REBALANCE
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'TVL', v: fmtUSD(Number(vault.totalShares) * Number(vault.sharePrice) / 1e18) },
          { l: 'Share Price', v: `$${(Number(vault.sharePrice)/1e6).toFixed(4)}` },
          { l: 'Perf Fee', v: fmtPct(vault.performanceFeeBps) },
          { l: 'Mgmt Fee', v: `${fmtPct(vault.mgmtFeeBps)}/yr` },
        ].map(({ l, v }) => (
          <div key={l} style={{ background: '#0A0C16', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{l}</div>
            <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>CURRENT DRIFT</div>
        <DriftIndicator driftBps={vault.drift} threshold={strategy?.driftBps || '300'} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
        background: '#0A0C16', borderRadius: 8, padding: '8px 12px' }}>
        <span style={{ color: '#4A5270', fontSize: 12 }}>Last rebalanced</span>
        <span style={{ color: '#8892B0', fontSize: 12, fontFamily: 'monospace' }}>{timeSince(vault.lastRebalance)}</span>
      </div>

      {userValue && Number(userValue) > 0 && (
        <div style={{ background: '#5B7FFF12', border: '1px solid #5B7FFF30', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8892B0', fontSize: 12 }}>Your position</span>
            <span style={{ color: '#5B7FFF', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{fmtUSD(userValue)}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {needsRebal && (
          <button style={{ flex: 1, padding: '10px 0', borderRadius: 9, background: 'linear-gradient(135deg, #FF4060, #CC2040)',
            border: 'none', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            🤖 Rebalance (earn tip)
          </button>
        )}
        <button style={{ flex: 1, padding: '10px 0', borderRadius: 9, background: '#5B7FFF20',
          border: '1px solid #5B7FFF40', color: '#5B7FFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          Deposit / Withdraw
        </button>
      </div>
    </div>
  );
}

// ── Deposit Modal ─────────────────────────────────────────────────────────
function DepositModal({ strategy, onClose }) {
  const [amount, setAmount] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000B0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 20, padding: 28, width: 420, boxShadow: '0 24px 80px #00000080' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#EDF0FA' }}>Deposit into {strategy.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A5270', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <AllocationBar allocations={strategy.allocations} />
        </div>
        <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>USDC AMOUNT</div>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number"
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#EDF0FA', fontSize: 22, fontWeight: 800, fontFamily: 'monospace', outline: 'none' }} />
        </div>
        <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          {[['Drift Trigger', fmtPct(strategy.driftBps)],['Keeper Tip', fmtPct(strategy.keeperTip)],['Rebalancing', 'Automated by keepers']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
              <span style={{ color: '#8892B0', fontSize: 12 }}>{v}</span>
            </div>
          ))}
        </div>
        <button style={{ width: '100%', padding: 15, borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: 'none',
          background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)', color: '#fff' }}>
          Deposit USDC
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RebalancingBotsPage() {
  const { address } = useAccount();
  const [tab, setTab]     = useState('vaults');
  const [modal, setModal] = useState(null);

  const { data: strategies = MOCK_STRATEGIES } = useQuery({ queryKey: ['rb-strategies'], queryFn: () => api('/api/rebalancer/strategies'), refetchInterval: 60000 });
  const { data: vaults = MOCK_VAULTS }         = useQuery({ queryKey: ['rb-vaults'], queryFn: () => api('/api/rebalancer/vaults'), refetchInterval: 15000 });
  const { data: userPositions = [] }           = useQuery({ queryKey: ['rb-user', address], queryFn: () => api(`/api/rebalancer/user/${address}`), enabled: !!address });

  const stratMap  = Object.fromEntries(strategies.map(s => [s.id, s]));
  const userPosMap = Object.fromEntries(userPositions.map(p => [p.vaultId, p]));
  const rebalNeeded = vaults.filter(v => Number(v.drift) >= Number(stratMap[v.strategyId]?.driftBps || 300)).length;

  return (
    <AppLayout active="rebalancer">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFB80020', border: '1px solid #FFB80040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Rebalancing Bots</h1>
                <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>Automated portfolio vaults — deposit USDC, bot keeps your weights on target</p>
              </div>
            </div>
            {rebalNeeded > 0 && (
              <div style={{ padding: '10px 18px', borderRadius: 10, background: '#FF406015', border: '1px solid #FF406040',
                color: '#FF4060', fontWeight: 800, fontSize: 13 }}>
                ⚠ {rebalNeeded} vault{rebalNeeded > 1 ? 's' : ''} need rebalancing — earn keeper tips!
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { l: 'Active Vaults', v: vaults.length, c: '#5B7FFF' },
            { l: 'Strategies', v: strategies.length, c: '#00E5A0' },
            { l: 'Need Rebalance', v: rebalNeeded, c: rebalNeeded > 0 ? '#FF4060' : '#4A5270' },
            { l: 'Your Positions', v: userPositions.length, c: '#A855F7' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{l.toUpperCase()}</div>
              <div style={{ color: c, fontSize: 24, fontWeight: 900, fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0A0C16', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid #1C2138' }}>
          {[['vaults','📊 Vaults'],['strategies','🧠 Strategies'],['register','+ Register Strategy']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: tab === id ? '#5B7FFF' : 'transparent', color: tab === id ? '#fff' : '#4A5270', transition: 'all .12s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Vaults tab */}
        {tab === 'vaults' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
            {vaults.map(v => (
              <VaultCard key={v.id} vault={v} strategy={stratMap[v.strategyId]} userValue={userPosMap[v.id]?.valueUSDC} />
            ))}
          </div>
        )}

        {/* Strategies tab */}
        {tab === 'strategies' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
            {strategies.map(s => (
              <StrategyCard key={s.id} strat={s} onDeposit={strat => setModal({ strat })} />
            ))}
          </div>
        )}

        {/* Register Strategy tab */}
        {tab === 'register' && (
          <div style={{ maxWidth: 580 }}>
            <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 16, padding: 28 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#EDF0FA', marginBottom: 6 }}>Register a Strategy</div>
              <div style={{ color: '#4A5270', fontSize: 13, marginBottom: 24 }}>Pay $200 USDC listing fee. Your strategy becomes available for any vault to use. Earn keeper tips when your strategy vaults are rebalanced.</div>
              {[
                { label: 'Strategy Name', placeholder: 'DeFi Blue Chips' },
                { label: 'Description', placeholder: 'Brief description of the strategy' },
                { label: 'Drift Threshold (%)', placeholder: '3.0' },
                { label: 'Keeper Tip (% of rebalance)', placeholder: '0.10' },
              ].map(({ label, placeholder }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{label.toUpperCase()}</div>
                  <input placeholder={placeholder}
                    style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 9, color: '#EDF0FA', fontSize: 14, padding: '11px 14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>TOKEN ALLOCATIONS (MUST SUM TO 100%)</div>
                {['Token 1: USDC 40%', 'Token 2: WETH 40%', 'Token 3: ARB 20%'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder={t.split(':')[0]} style={{ flex: 2, background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8, color: '#EDF0FA', fontSize: 13, padding: '9px 12px', outline: 'none' }} />
                    <input placeholder={t.split(' ')[2]} style={{ flex: 1, background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8, color: '#EDF0FA', fontSize: 13, padding: '9px 12px', outline: 'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFB80015', border: '1px solid #FFB80040', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <div style={{ color: '#FFB800', fontSize: 12, fontWeight: 700 }}>💰 Registration fee: $200 USDC (one-time)</div>
              </div>
              <button style={{ width: '100%', padding: 15, borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: 'pointer', border: 'none',
                background: 'linear-gradient(135deg, #5B7FFF, #A855F7)', color: '#fff' }}>
                Register Strategy ($200 USDC)
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && <DepositModal strategy={modal.strat} onClose={() => setModal(null)} />}
    </AppLayout>
  );
}
