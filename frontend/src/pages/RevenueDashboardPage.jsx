import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

const fmt$ = (v, dec = 2) => {
  const n = Number(v || 0) / 1e6;
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(2)}K`;
  return `$${n.toFixed(dec)}`;
};
const fmtNum = (v) => Number(v || 0).toLocaleString();
const fmtPct = (v) => `${(Number(v || 0)/1e16).toFixed(2)}%`;
const ago = (ts) => {
  const s = Math.floor(Date.now()/1000 - Number(ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
};

// ── Sparkline mini-chart ─────────────────────────────────────────────────
function Sparkline({ data = [], color = '#5B7FFF', height = 32 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={data.length > 1 ? w : 0} cy={h - ((data[data.length - 1] - min) / range) * h}
        r={2.5} fill={color} />
    </svg>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = '#5B7FFF', sparkData }) {
  return (
    <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: '18px 20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
        <div style={{ color: accent, fontSize: 22, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ color: '#4A5270', fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </div>
      {sparkData && <Sparkline data={sparkData} color={accent} />}
    </div>
  );
}

// ── MEV opportunity row ───────────────────────────────────────────────────
function MEVRow({ opp }) {
  const dislocPct = (Number(opp.priceAtTrigger || 0) && Number(opp.ammPrice || 0))
    ? Math.abs((Number(opp.priceAtTrigger) - Number(opp.ammPrice)) / Number(opp.priceAtTrigger) * 100).toFixed(3)
    : '—';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 80px 80px',
      padding: '11px 20px', borderBottom: '1px solid #1C213860', fontSize: 12, alignItems: 'center', fontFamily: 'monospace' }}>
      <span style={{ color: '#4A5270' }}>#{opp.id}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#5B7FFF20',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#5B7FFF', fontWeight: 800 }}>
          {opp.marketId?.slice(2, 6) || 'MKT'}
        </div>
        <span style={{ color: '#8892B0', fontSize: 10 }}>{opp.triggerTrader?.slice(0,6)}...{opp.triggerTrader?.slice(-4)}</span>
      </div>
      <span style={{ color: '#FFB800' }}>{dislocPct}%</span>
      <span style={{ color: '#EDF0FA' }}>{fmt$(opp.triggerSize)}</span>
      <span style={{ color: opp.fulfilled ? '#00E5A0' : '#4A5270' }}>
        {opp.fulfilled ? fmt$(opp.profitCaptured) : '—'}
      </span>
      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textAlign: 'center',
        background: opp.fulfilled ? '#00E5A020' : '#FFB80020',
        color: opp.fulfilled ? '#00E5A0' : '#FFB800' }}>
        {opp.fulfilled ? '✓ Captured' : '⏳ Open'}
      </span>
    </div>
  );
}

// ── Fee source bar ────────────────────────────────────────────────────────
function FeeSourceBar({ name, amount, total, color }) {
  const pct = total > 0 ? (Number(amount) / Number(total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#8892B0', fontSize: 12 }}>{name}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{fmt$(amount)}</span>
          <span style={{ color: '#4A5270', fontSize: 10 }}>{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ height: 4, background: '#1C2138', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ── Yield strategy card ───────────────────────────────────────────────────
function StrategyCard({ strat }) {
  const typeConfig = {
    Idle:        { icon: '💤', color: '#4A5270', desc: 'USDC idle in contract' },
    AaveSupply:  { icon: '🏦', color: '#B6509E', desc: 'Earning Aave supply yield' },
    UniswapV3LP: { icon: '🦄', color: '#FF007A', desc: 'Earning Uni V3 swap fees' },
    WikiLending: { icon: '📊', color: '#5B7FFF', desc: 'Earning WikiLending APY' },
  };
  const cfg = typeConfig[strat.type] || typeConfig.Idle;
  return (
    <div style={{ background: '#0E1120', border: `1px solid ${cfg.color}40`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cfg.icon}</div>
        <div>
          <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 13 }}>{strat.type}</div>
          <div style={{ color: '#4A5270', fontSize: 11 }}>{cfg.desc}</div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
          background: strat.active ? '#00E5A020' : '#FF406020',
          color: strat.active ? '#00E5A0' : '#FF4060' }}>
          {strat.active ? 'Active' : 'Inactive'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          ['Allocated', fmt$(strat.allocatedUsdc)],
          ['Shares',    Number(strat.shares).toLocaleString()],
        ].map(([k, v]) => (
          <div key={k} style={{ background: '#0A0C16', borderRadius: 7, padding: '8px 10px' }}>
            <div style={{ color: '#4A5270', fontSize: 10, marginBottom: 3 }}>{k}</div>
            <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function RevenueDashboardPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('overview');

  const { data: revSummary } = useQuery({ queryKey: ['rev-summary'], queryFn: () => api('/api/revenue-engine/summary'), refetchInterval: 15000 });
  const { data: mevStats   } = useQuery({ queryKey: ['mev-stats'],   queryFn: () => api('/api/mev/stats'),             refetchInterval: 15000 });
  const { data: feeStats   } = useQuery({ queryKey: ['fee-stats'],   queryFn: () => api('/api/fees/stats'),            refetchInterval: 15000 });
  const { data: ccStats    } = useQuery({ queryKey: ['cc-stats'],    queryFn: () => api('/api/crosschain/stats'),      refetchInterval: 15000 });
  const { data: mevOpps    } = useQuery({ queryKey: ['mev-opps'],    queryFn: () => api('/api/mev/opportunities?limit=20'), refetchInterval: 10000 });
  const { data: strategies ] = useQuery({ queryKey: ['fee-strats'],  queryFn: () => api('/api/fees/strategies') });
  const { data: userTier   } = useQuery({ queryKey: ['fee-tier', address], queryFn: () => api(`/api/fees/user/${address}`), enabled: !!address });

  const totalRevenue = revSummary?.total || '0';
  const bySource = feeStats?.bySource || {};

  const SOURCE_COLORS = {
    Perp: '#5B7FFF', Spot: '#00E5A0', OrderBook: '#FFB800', Bridge: '#12AAFF',
    Lending: '#A855F7', MEV: '#FF4060', Launchpad: '#F7931A', Misc: '#4A5270',
  };
  const totalBySource = Object.values(bySource).reduce((a, b) => Number(a) + Number(b), 0);

  return (
    <AppLayout active="revenue">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #00E5A020, #5B7FFF20)',
            border: '1px solid #5B7FFF40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📈</div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Revenue Dashboard</h1>
            <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>MEV internalization, fee distribution, yield farming & cross-chain analytics</p>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Protocol Revenue" value={fmt$(totalRevenue)} sub="All sources combined" accent="#00E5A0"
            sparkData={[12,18,15,22,19,28,24,32,27,35]} />
          <StatCard label="MEV Captured" value={fmt$(mevStats?.captured)} sub={`${mevStats?.opportunities || 0} opportunities`} accent="#FF4060"
            sparkData={[2,5,3,8,6,12,9,15,11,18]} />
          <StatCard label="Cross-Chain Revenue" value={fmt$(ccStats?.revenue)} sub={`${ccStats?.intents || 0} intents`} accent="#12AAFF"
            sparkData={[1,3,2,4,3,6,5,8,6,10]} />
          <StatCard label="Fees Distributed" value={fmt$(feeStats?.distributed)} sub="To veWIK stakers" accent="#A855F7"
            sparkData={[8,14,11,18,16,22,20,26,23,30]} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0A0C16', padding: 4, borderRadius: 10,
          border: '1px solid #1C2138', width: 'fit-content' }}>
          {[['overview','📊 Overview'],['mev','⚡ MEV Backrun'],['fees','💰 Fee Sources'],['yield','🌾 Yield Farm'],['my','👤 My Stats']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '8px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: tab === id ? '#5B7FFF' : 'transparent', color: tab === id ? '#fff' : '#4A5270', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Revenue by source */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>Revenue by Source</div>
              {Object.entries(bySource).map(([name, amount]) => (
                <FeeSourceBar key={name} name={name} amount={amount} total={totalBySource} color={SOURCE_COLORS[name] || '#5B7FFF'} />
              ))}
              {Object.keys(bySource).length === 0 && (
                // Placeholder data
                [['Perp Trading','45'],['Spot Routing','20'],['CrossChain','15'],['Lending','10'],['MEV','7'],['Launchpad','3']].map(([n, p]) => (
                  <FeeSourceBar key={n} name={n} amount={String(parseFloat(p) * 1000)} total={10000} color={SOURCE_COLORS[n] || '#5B7FFF'} />
                ))
              )}
            </div>

            {/* Pending allocations */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>Distribution Queue</div>
              {[
                { label: '⚡ veWIK Stakers (60%)', amount: fmt$(Number(feeStats?.balance||0) * 0.6), color: '#5B7FFF', desc: 'Distributed on next cycle' },
                { label: '🛡️ Insurance Fund (10%)', amount: fmt$(feeStats?.pending?.insurance), color: '#00E5A0', desc: 'Pending transfer to vault' },
                { label: '🔥 WIK Buyback (20%)', amount: fmt$(feeStats?.pending?.buyback), color: '#FF4060', desc: 'Pending buyback & burn' },
                { label: '💼 Dev Treasury (10%)', amount: fmt$(feeStats?.pending?.treasury), color: '#FFB800', desc: 'Pending transfer to multisig' },
              ].map(({ label, amount, color, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: '1px solid #1C213840' }}>
                  <div>
                    <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{label}</div>
                    <div style={{ color: '#4A5270', fontSize: 11, marginTop: 2 }}>{desc}</div>
                  </div>
                  <div style={{ color, fontWeight: 900, fontSize: 16, fontFamily: 'monospace' }}>{amount}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEV tab */}
        {tab === 'mev' && (
          <div>
            {/* MEV stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { l: 'Total Captured',  v: fmt$(mevStats?.captured),     c: '#FF4060' },
                { l: '→ Stakers',       v: fmt$(mevStats?.toStakers),    c: '#5B7FFF' },
                { l: '→ Insurance',     v: fmt$(mevStats?.toInsurance),  c: '#00E5A0' },
                { l: '→ Triggers',      v: fmt$(mevStats?.toTriggers),   c: '#FFB800' },
                { l: '→ Keepers',       v: fmt$(mevStats?.toKeepers),    c: '#A855F7' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: '#0E1120', border: `1px solid ${c}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{l}</div>
                  <div style={{ color: c, fontWeight: 900, fontSize: 18, fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 14 }}>
                ⚡ How MEV Internalization Works
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { n: '1', t: 'Large Trade', d: 'User places a $50K+ trade on WikiPerp, creating a price dislocation vs reference markets.', c: '#FFB800' },
                  { n: '2', t: 'Hook Fires', d: 'WikiMEVHook detects the arb opportunity and emits BackrunOpportunityCreated event.', c: '#5B7FFF' },
                  { n: '3', t: 'Keeper Backruns', d: 'Authorised keeper executes the arbitrage trade within 2 blocks, capturing the spread.', c: '#A855F7' },
                  { n: '4', t: 'Revenue Split', d: '60% to stakers, 20% insurance, 10% to trade trigger, 10% to keeper. No external bots profit.', c: '#00E5A0' },
                ].map(({ n, t, d, c }) => (
                  <div key={n} style={{ background: '#0A0C16', borderRadius: 10, padding: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c}20`, border: `1px solid ${c}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, fontWeight: 900, fontSize: 14, marginBottom: 8 }}>{n}</div>
                    <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>{t}</div>
                    <div style={{ color: '#4A5270', fontSize: 11, lineHeight: 1.5 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities table */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1C2138', fontSize: 13, fontWeight: 800, color: '#EDF0FA' }}>
                Recent MEV Opportunities
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 80px 80px',
                padding: '8px 20px', background: '#0A0C16', color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                {['ID','MARKET / TRIGGER','DISLOC','SIZE','PROFIT','STATUS'].map(h => <span key={h}>{h}</span>)}
              </div>
              {(mevOpps || []).length === 0
                ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4A5270' }}>
                    No MEV opportunities recorded yet. Large trades ({'>'}$50K) will appear here.
                  </div>
                )
                : (mevOpps || []).map(o => <MEVRow key={o.id} opp={o} />)
              }
            </div>
          </div>
        )}

        {/* Fees tab */}
        {tab === 'fees' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Affine fee model explanation */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 16 }}>Affine Fee Model</div>
              <div style={{ background: '#0A0C16', borderRadius: 8, padding: 14, fontFamily: 'monospace',
                fontSize: 12, color: '#8892B0', marginBottom: 16, lineHeight: 1.8 }}>
                <span style={{ color: '#EDF0FA' }}>totalFee</span> =<br/>
                {'  '}<span style={{ color: '#5B7FFF' }}>BASE_FEE</span> +<br/>
                {'  '}<span style={{ color: '#00E5A0' }}>notional</span> × <span style={{ color: '#FFB800' }}>bpsFee</span>(<span style={{ color: '#A855F7' }}>tier</span>)
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#4A5270', fontSize: 11, marginBottom: 10, fontWeight: 700 }}>TIER DISCOUNTS (veWIK OR 30D VOLUME)</div>
                {[
                  ['Base',    '0',    '0 veWIK', '100%', '#8892B0'],
                  ['Bronze',  '10%',  '1K veWIK or $100K vol', '90%', '#CD7F32'],
                  ['Silver',  '20%',  '5K veWIK or $500K vol', '80%', '#C0C0C0'],
                  ['Gold',    '35%',  '20K veWIK or $2M vol',  '65%', '#FFD700'],
                  ['Diamond', '50%',  '100K veWIK or $10M vol','50%', '#00D4FF'],
                ].map(([tier, disc, req, mult, color]) => (
                  <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px',
                    background: '#0A0C16', borderRadius: 8, border: `1px solid ${color}20` }}>
                    <span style={{ color, fontWeight: 800, fontSize: 12, minWidth: 56 }}>{tier}</span>
                    <span style={{ color: '#4A5270', fontSize: 11, flex: 1 }}>{req}</span>
                    <span style={{ color: disc === '0' ? '#4A5270' : '#00E5A0', fontWeight: 700, fontSize: 12 }}>
                      {disc === '0' ? 'No discount' : `-${disc}`}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                The affine model combines a fixed component (bridge cost) with a volume-proportional variable component.
                Higher tier = lower variable rate. The fixed base ensures protocol covers infrastructure costs even on small trades.
              </p>
            </div>

            {/* Fee allocations */}
            <div>
              <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 16 }}>Fee Allocation</div>
                {[
                  { name: 'veWIK Stakers',   pct: 60, color: '#5B7FFF', icon: '⚡' },
                  { name: 'Insurance Fund',  pct: 10, color: '#00E5A0', icon: '🛡️' },
                  { name: 'WIK Buyback',     pct: 20, color: '#FF4060', icon: '🔥' },
                  { name: 'Dev Treasury',    pct: 10, color: '#FFB800', icon: '💼' },
                ].map(({ name, pct, color, icon }) => (
                  <div key={name} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#8892B0', fontSize: 12 }}>{icon} {name}</span>
                      <span style={{ color, fontWeight: 800, fontSize: 12 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#0A0C16', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 16 }}>Fee Stats</div>
                {[
                  ['Total Accumulated', fmt$(feeStats?.total)],
                  ['Total Distributed', fmt$(feeStats?.distributed)],
                  ['Current Balance',   fmt$(feeStats?.balance)],
                  ['Pending Buyback',   fmt$(feeStats?.pending?.buyback)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: '#4A5270', fontSize: 13 }}>{k}</span>
                    <span style={{ color: '#EDF0FA', fontWeight: 700, fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Yield farming tab */}
        {tab === 'yield' && (
          <div>
            <div style={{ background: '#0E1120', border: '1px solid #5B7FFF30', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 8 }}>
                🌾 Yield-on-Yield Engine
              </div>
              <p style={{ color: '#4A5270', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Collected protocol fees don't sit idle — 80% is reinvested into yield strategies (Aave, Uniswap V3 LP, WikiLending).
                This compounds revenue and distributes the additional yield to veWIK stakers on top of the base fee share.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {(strategies || []).map((s, i) => <StrategyCard key={i} strat={s} />)}
              {(!strategies || strategies.length === 0) && (
                [
                  { type: 'Idle', allocatedUsdc: '50000000000', shares: '50000000000', active: true },
                  { type: 'AaveSupply', allocatedUsdc: '100000000000', shares: '98000000000', active: true },
                  { type: 'UniswapV3LP', allocatedUsdc: '75000000000', shares: '74000000000', active: false },
                ].map((s, i) => <StrategyCard key={i} strat={s} />)
              )}
            </div>
          </div>
        )}

        {/* My stats tab */}
        {tab === 'my' && (
          <div style={{ maxWidth: 600 }}>
            {!address ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👛</div>
                <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Connect Wallet</div>
                <div style={{ color: '#4A5270', fontSize: 14 }}>Connect to see your fee tier, discounts and trading stats</div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>Your Fee Tier</div>
                  {userTier && (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>
                          {['🏷️','🥉','🥈','🥇','💎'][userTier.tier]}
                        </div>
                        <div style={{ color: ['#8892B0','#CD7F32','#C0C0C0','#FFD700','#00D4FF'][userTier.tier],
                          fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
                          {['Base','Bronze','Silver','Gold','Diamond'][userTier.tier]} Tier
                        </div>
                        <div style={{ color: '#00E5A0', fontWeight: 700, fontSize: 14 }}>
                          {[0,10,20,35,50][userTier.tier]}% fee discount
                        </div>
                      </div>
                      {[
                        ['veWIK Balance',      `${(Number(userTier.veWIK)/1e18).toFixed(2)} veWIK`],
                        ['30D Trading Volume', fmt$(userTier.vol30d)],
                        ['veWIK Tier',         ['Base','Bronze','Silver','Gold','Diamond'][userTier.veTier]],
                        ['Volume Tier',        ['Base','Bronze','Silver','Gold','Diamond'][userTier.volTier]],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #1C2138' }}>
                          <span style={{ color: '#4A5270', fontSize: 13 }}>{k}</span>
                          <span style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 16 }}>Upgrade Your Tier</div>
                  {userTier && userTier.tier < 4 && (
                    <div style={{ padding: 16, background: '#5B7FFF08', borderRadius: 10, border: '1px solid #5B7FFF20' }}>
                      <div style={{ color: '#5B7FFF', fontWeight: 700, marginBottom: 8 }}>
                        Next tier: {['Bronze','Silver','Gold','Diamond'][userTier.tier]}
                      </div>
                      <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                        Lock {['1,000','5,000','20,000','100,000'][userTier.tier]} veWIK or reach{' '}
                        {['$100K','$500K','$2M','$10M'][userTier.tier]} 30d trading volume to unlock{' '}
                        {[10,20,35,50][userTier.tier]}% fee discount on all trades.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <a href="/staking" style={{ padding: '10px 14px', borderRadius: 8, background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                          color: '#5B7FFF', fontWeight: 700, fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>
                          ⚡ Lock WIK
                        </a>
                        <a href="/trade/BTCUSDT" style={{ padding: '10px 14px', borderRadius: 8, background: '#00E5A010', border: '1px solid #00E5A040',
                          color: '#00E5A0', fontWeight: 700, fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>
                          📊 Trade More
                        </a>
                      </div>
                    </div>
                  )}
                  {userTier?.tier === 4 && (
                    <div style={{ textAlign: 'center', color: '#00D4FF', padding: 20, fontWeight: 700 }}>
                      💎 You're at the maximum Diamond tier!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

}
