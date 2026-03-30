import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery }   from '@tanstack/react-query';
import axios          from 'axios';
import { API_URL }    from '../config';
import AppLayout      from '../components/layout/AppLayout';

const api = (p) => axios.get(`${API_URL}${p}`).then(r => r.data);

// ─────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────
const fmt2   = (v) => parseFloat(v || 0).toFixed(2);
const fmt4   = (v) => parseFloat(v || 0).toFixed(4);
const fmtPct = (v) => `${parseFloat(v || 0).toFixed(2)}%`;
const fmtM   = (v) => {
  const n = parseFloat(v || 0);
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

// ─────────────────────────────────────────────────────────────────────
//  Mock data (shown until contract is deployed)
// ─────────────────────────────────────────────────────────────────────
const MOCK_SLICES = [
  { id:0, symbol:'USDC-30d',  maturityDate:'2025-04-14', daysToMaturity:30,  expired:false, tvl:'2400000',  impliedRatePct:'8.21', ptPrice:'0.9932', ptDiscount:'0.68', ammPT:'980000',  ammUnderlying:'1020000', ammTotalLP:'1000000', yieldFeeBps:'500', ammFeeBps:'20', active:true },
  { id:1, symbol:'USDC-90d',  maturityDate:'2025-06-13', daysToMaturity:90,  expired:false, tvl:'5800000',  impliedRatePct:'7.63', ptPrice:'0.9809', ptDiscount:'1.91', ammPT:'2200000', ammUnderlying:'2800000', ammTotalLP:'2500000', yieldFeeBps:'500', ammFeeBps:'20', active:true },
  { id:2, symbol:'USDC-180d', maturityDate:'2025-09-11', daysToMaturity:180, expired:false, tvl:'12000000', impliedRatePct:'7.12', ptPrice:'0.9640', ptDiscount:'3.60', ammPT:'4800000', ammUnderlying:'5200000', ammTotalLP:'5000000', yieldFeeBps:'500', ammFeeBps:'20', active:true },
  { id:3, symbol:'USDC-365d', maturityDate:'2026-03-14', daysToMaturity:365, expired:false, tvl:'8200000',  impliedRatePct:'6.88', ptPrice:'0.9312', ptDiscount:'6.88', ammPT:'3500000', ammUnderlying:'4500000', ammTotalLP:'4000000', yieldFeeBps:'500', ammFeeBps:'20', active:true },
];
const MOCK_STATS = { totalSlices:4, activeSlices:4, totalTVL:'28400000', totalFees:'14200' };

// ─────────────────────────────────────────────────────────────────────
//  Design tokens
// ─────────────────────────────────────────────────────────────────────
const T = {
  bg0:'#06080F', bg1:'#0A0C16', bg2:'#0E1120', bg3:'#131829',
  border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270',
  green:'#00E5A0', red:'#FF4060', accent:'#5B7FFF', gold:'#FFB800', purple:'#A855F7',
};

// ─────────────────────────────────────────────────────────────────────
//  Tiny shared components
// ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: T.bg2,
      border: `1px solid ${glow ? `${glow}50` : T.border}`,
      borderRadius: 14,
      padding: 20,
      boxShadow: glow ? `0 0 24px ${glow}10` : 'none',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Pill({ children, color = T.accent }) {
  return (
    <span style={{
      background: `${color}18`, color,
      border: `1px solid ${color}35`,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
    }}>
      {children}
    </span>
  );
}

function Label({ children }) {
  return (
    <div style={{ color: T.t3, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, color = T.t1 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}40` }}>
      <span style={{ color: T.t3, fontSize: 12 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = '0.00', right }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}</Label>}
      <div style={{ position: 'relative' }}>
        <input
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.t1, fontSize: 18, fontWeight: 700,
            fontFamily: 'monospace', padding: right ? '12px 80px 12px 14px' : '12px 14px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {right && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.t2, fontSize: 13, fontWeight: 700 }}>
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, color = T.accent, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
        background: disabled ? '#1C2138' : `linear-gradient(135deg, ${color}, ${color}bb)`,
        color: disabled ? T.t3 : '#fff', fontSize: 13, fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.05em',
        marginTop: 16, transition: 'all 0.15s',
      }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  AMM depth visualizer
// ─────────────────────────────────────────────────────────────────────
function AMMDepth({ s }) {
  const pt  = parseFloat(s.ammPT || 0);
  const und = parseFloat(s.ammUnderlying || 0);
  const tot = pt + und;
  const pPt = tot > 0 ? (pt / tot * 100) : 50;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.t3, marginBottom: 4 }}>
        <span>PT {pPt.toFixed(1)}%</span>
        <span>Underlying {(100 - pPt).toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: pPt, background: T.accent, transition: 'flex 0.5s' }} />
        <div style={{ flex: 100 - pPt, background: T.green, transition: 'flex 0.5s' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Slice card (left panel list)
// ─────────────────────────────────────────────────────────────────────
function SliceCard({ s, selected, onSelect }) {
  const urgency = s.daysToMaturity < 14 ? T.red : s.daysToMaturity < 60 ? T.gold : T.green;
  return (
    <div onClick={() => onSelect(s)}
      style={{
        background: selected ? `${T.accent}12` : T.bg2,
        border: `1px solid ${selected ? T.accent : T.border}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s',
        marginBottom: 10,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = `${T.accent}50`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = T.border; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: T.t1, fontWeight: 900, fontSize: 14 }}>{s.symbol}</div>
          <div style={{ color: T.t3, fontSize: 11, marginTop: 2 }}>{s.maturityDate}</div>
        </div>
        <Pill color={urgency}>{s.daysToMaturity}d</Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          ['Fixed APY', <span style={{ color: T.green, fontWeight: 900 }}>{fmtPct(s.impliedRatePct)}</span>],
          ['PT Price',  <span style={{ color: T.accent, fontWeight: 900 }}>{fmt4(s.ptPrice)}</span>],
          ['TVL',       <span style={{ color: T.t1 }}>{fmtM(s.tvl)}</span>],
          ['Discount',  <span style={{ color: T.gold }}>{fmtPct(s.ptDiscount)}</span>],
        ].map(([k, v]) => (
          <div key={k} style={{ background: T.bg1, borderRadius: 7, padding: '7px 9px' }}>
            <div style={{ color: T.t3, fontSize: 9, fontWeight: 700, marginBottom: 3 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize: 13 }}>{v}</div>
          </div>
        ))}
      </div>

      <AMMDepth s={s} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Action panel (right panel)
// ─────────────────────────────────────────────────────────────────────
const ACTION_TABS = [
  { id: 'slice',  label: '🔪 Slice',  desc: 'Split wTokens into PT + YT'             },
  { id: 'redeem', label: '💰 Redeem', desc: 'Burn PT at maturity → underlying'       },
  { id: 'yield',  label: '⚡ Yield',  desc: 'Claim accrued yield on YT balance'      },
  { id: 'swap',   label: '🔄 Swap',   desc: 'Trade PT ↔ Underlying in the AMM'      },
  { id: 'lp',     label: '💧 LP',     desc: 'Add/remove liquidity to PT AMM'         },
];

function ActionPanel({ slice }) {
  const { address } = useAccount();
  const [tab,   setTab]   = useState('slice');
  const [amt,   setAmt]   = useState('');
  const [lpAmt, setLpAmt] = useState('');
  const [ptIn,  setPtIn]  = useState(true);

  const connected = !!address;

  // Derived preview values
  const numAmt  = parseFloat(amt || 0);
  const ptOut   = numAmt.toFixed(4);
  const ytOut   = numAmt.toFixed(4);

  // Swap preview
  const swapPT  = parseFloat(slice.ammPT || 0);
  const swapUnd = parseFloat(slice.ammUnderlying || 0);
  const swapOut = ptIn
    ? swapUnd > 0 ? (swapUnd * numAmt / (swapPT + numAmt)).toFixed(4) : '0'
    : swapPT  > 0 ? (swapPT  * numAmt / (swapUnd + numAmt)).toFixed(4) : '0';
  const swapFee = (numAmt * parseFloat(slice.ammFeeBps || 20) / 10000).toFixed(6);
  const yieldFee = numAmt * parseFloat(slice.yieldFeeBps || 500) / 10000;
  const netYield = (numAmt - yieldFee).toFixed(4);

  return (
    <Card style={{ position: 'sticky', top: 68 }}>
      {/* Slice header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}20`, border: `1px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍰</div>
          <div>
            <div style={{ color: T.t1, fontWeight: 900, fontSize: 17 }}>{slice.symbol}</div>
            <div style={{ color: T.t3, fontSize: 11 }}>Maturity · {slice.maturityDate}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill color={T.green}>{fmtPct(slice.impliedRatePct)} Fixed</Pill>
          <Pill color={T.accent}>{slice.daysToMaturity}d remaining</Pill>
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 3, background: T.bg1, padding: 3, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 18 }}>
        {ACTION_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 7, fontWeight: 800, fontSize: 10.5,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
              background: tab === t.id ? T.accent : 'transparent',
              color: tab === t.id ? '#fff' : T.t3,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ color: T.t3, fontSize: 11, marginBottom: 14, fontStyle: 'italic' }}>
        {ACTION_TABS.find(t => t.id === tab)?.desc}
      </div>

      {/* ── SLICE tab ── */}
      {tab === 'slice' && (
        <>
          <Input label="wToken Amount (e.g. wUSDC)" value={amt} onChange={setAmt} right="wToken" />
          <Card style={{ padding: 14, background: T.bg1 }}>
            <div style={{ color: T.t2, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>YOU RECEIVE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: `${T.accent}12`, border: `1px solid ${T.accent}30`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ color: T.t3, fontSize: 9, fontWeight: 700 }}>PT TOKENS</div>
                <div style={{ color: T.accent, fontWeight: 900, fontSize: 18, fontFamily: 'monospace', marginTop: 4 }}>{ptOut}</div>
                <div style={{ color: T.t3, fontSize: 9, marginTop: 2 }}>Redeemable at maturity</div>
              </div>
              <div style={{ flex: 1, background: `${T.green}12`, border: `1px solid ${T.green}30`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ color: T.t3, fontSize: 9, fontWeight: 700 }}>YT TOKENS</div>
                <div style={{ color: T.green, fontWeight: 900, fontSize: 18, fontFamily: 'monospace', marginTop: 4 }}>{ytOut}</div>
                <div style={{ color: T.t3, fontSize: 9, marginTop: 2 }}>Earns all yield</div>
              </div>
            </div>
          </Card>
          <Card style={{ padding: 12, background: T.bg1, marginTop: 10 }}>
            <StatRow label="Protocol fee"  value={`${parseFloat(slice.yieldFeeBps || 500) / 100}% on yield`} />
            <StatRow label="Implied APY"   value={fmtPct(slice.impliedRatePct)} color={T.green} />
            <StatRow label="PT discount"   value={fmtPct(slice.ptDiscount)}     color={T.gold}  />
          </Card>
          <PrimaryBtn color={T.accent} disabled={!connected || numAmt <= 0}>
            {connected ? 'SLICE wTOKENS' : 'CONNECT WALLET'}
          </PrimaryBtn>
        </>
      )}

      {/* ── REDEEM tab ── */}
      {tab === 'redeem' && (
        <>
          <Input label="PT Amount to Redeem" value={amt} onChange={setAmt} right="PT" />
          <Card style={{ padding: 14, background: T.bg1 }}>
            <StatRow label="You receive"    value={`${fmt4(numAmt)} USDC`}  color={T.green} />
            <StatRow label="Exchange rate"  value="1 PT = 1 USDC at maturity" />
            <StatRow label="Maturity date"  value={slice.maturityDate} />
            <StatRow label="Status"         value={slice.expired ? '✅ Matured' : `⏳ ${slice.daysToMaturity}d remaining`} color={slice.expired ? T.green : T.gold} />
          </Card>
          {!slice.expired && (
            <div style={{ marginTop: 12, padding: 10, background: `${T.gold}12`, border: `1px solid ${T.gold}30`, borderRadius: 8 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700 }}>⚠️ Slice not yet matured</div>
              <div style={{ color: T.t3, fontSize: 11, marginTop: 4 }}>Use "Slice" tab to burn PT+YT together before maturity, or wait {slice.daysToMaturity} days.</div>
            </div>
          )}
          <PrimaryBtn color={T.green} disabled={!connected || !slice.expired || numAmt <= 0}>
            {connected ? (slice.expired ? 'REDEEM PT' : 'NOT YET MATURED') : 'CONNECT WALLET'}
          </PrimaryBtn>
        </>
      )}

      {/* ── YIELD tab ── */}
      {tab === 'yield' && (
        <>
          <Card style={{ padding: 16, background: T.bg1, marginBottom: 14 }}>
            <div style={{ color: T.t2, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>YOUR YT POSITION</div>
            <StatRow label="YT Balance"       value={connected ? '— (connect)' : '—'} />
            <StatRow label="Claimable Yield"  value={connected ? '— USDC'       : '—'} color={T.green} />
            <StatRow label="Protocol fee"     value={`${parseFloat(slice.yieldFeeBps || 500) / 100}% of yield`} />
            <StatRow label="Yield source"     value="WikiLending supply interest" />
          </Card>
          <div style={{ padding: 12, background: `${T.green}10`, border: `1px solid ${T.green}25`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ color: T.green, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>HOW IT WORKS</div>
            <div style={{ color: T.t3, fontSize: 11, lineHeight: 1.6 }}>
              Your YT tokens capture 100% of the interest generated on the underlying wToken position. As the wToken exchange rate increases, yield accumulates to your YT balance and can be claimed at any time.
            </div>
          </div>
          <PrimaryBtn color={T.green} disabled={!connected}>
            {connected ? 'CLAIM YIELD' : 'CONNECT WALLET'}
          </PrimaryBtn>
        </>
      )}

      {/* ── SWAP tab ── */}
      {tab === 'swap' && (
        <>
          {/* Direction toggle */}
          <div style={{ display: 'flex', gap: 4, background: T.bg1, padding: 3, borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 14 }}>
            <button onClick={() => setPtIn(true)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
                background: ptIn ? T.accent : 'transparent', color: ptIn ? '#fff' : T.t3 }}>
              Sell PT → USDC
            </button>
            <button onClick={() => setPtIn(false)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
                background: !ptIn ? T.green : 'transparent', color: !ptIn ? '#000' : T.t3 }}>
              Buy PT ← USDC
            </button>
          </div>

          <Input label={ptIn ? 'PT Amount to Sell' : 'USDC Amount to Spend'} value={amt} onChange={setAmt} right={ptIn ? 'PT' : 'USDC'} />

          <Card style={{ padding: 14, background: T.bg1 }}>
            <StatRow label="You receive"     value={`${swapOut} ${ptIn ? 'USDC' : 'PT'}`} color={T.green} />
            <StatRow label="AMM fee"         value={`${swapFee} USDC (${parseFloat(slice.ammFeeBps || 20) / 100}%)`} />
            <StatRow label="Implied rate"    value={fmtPct(slice.impliedRatePct)} color={T.accent} />
            <StatRow label="PT price"        value={fmt4(slice.ptPrice)} />
          </Card>
          <Card style={{ padding: 12, background: `${T.accent}08`, marginTop: 10, border: `1px solid ${T.accent}20` }}>
            <div style={{ color: T.accent, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>💡 STRATEGY TIP</div>
            <div style={{ color: T.t3, fontSize: 11, lineHeight: 1.6 }}>
              {ptIn
                ? `Selling PT locks in your ${fmtPct(slice.impliedRatePct)} fixed yield. PT appreciates to par (1.0) at maturity.`
                : `Buying PT at ${fmt4(slice.ptPrice)} gives you a guaranteed ${fmtPct(slice.ptDiscount)} return at maturity (${slice.daysToMaturity} days).`}
            </div>
          </Card>
          <PrimaryBtn color={ptIn ? T.accent : T.green} disabled={!connected || numAmt <= 0}>
            {connected ? (ptIn ? 'SELL PT' : 'BUY PT') : 'CONNECT WALLET'}
          </PrimaryBtn>
        </>
      )}

      {/* ── LP tab ── */}
      {tab === 'lp' && (
        <>
          <div style={{ display: 'flex', gap: 4, background: T.bg1, padding: 3, borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 14 }}>
            <button style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: T.accent, color: '#fff' }}>Add</button>
            <button style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: 'transparent', color: T.t3 }}>Remove</button>
          </div>

          <Input label="PT Amount" value={amt}   onChange={setAmt}   right="PT"   />
          <Input label="USDC Amount" value={lpAmt} onChange={setLpAmt} right="USDC" />

          <Card style={{ padding: 14, background: T.bg1 }}>
            <StatRow label="LP tokens minted" value={amt && lpAmt ? `${Math.sqrt(parseFloat(amt) * parseFloat(lpAmt)).toFixed(4)} LP` : '—'} color={T.accent} />
            <StatRow label="Pool share"        value={amt && lpAmt ? '~0.00%' : '—'} />
            <StatRow label="AMM fee earned"    value={`${parseFloat(slice.ammFeeBps || 20) / 100}% per swap`} color={T.green} />
            <StatRow label="Pool TVL"          value={fmtM((parseFloat(slice.ammPT || 0) + parseFloat(slice.ammUnderlying || 0)).toString())} />
          </Card>

          <AMMDepth s={slice} />

          <PrimaryBtn color={T.purple} disabled={!connected || !amt || !lpAmt}>
            {connected ? 'ADD LIQUIDITY' : 'CONNECT WALLET'}
          </PrimaryBtn>
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Education section
// ─────────────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon:'🔪', title:'1. Slice',      color:T.accent,  body:'Deposit yield-bearing wTokens from WikiLending. Receive equal amounts of PT (Principal Token) and YT (Yield Token).' },
    { icon:'💰', title:'2. PT = Fixed', color:T.green,   body:'PT is redeemable 1:1 for the underlying at maturity. It trades at a discount before maturity — buy PT to lock in a guaranteed fixed return.' },
    { icon:'⚡', title:'3. YT = Yield', color:T.gold,    body:'YT captures ALL yield generated on the underlying position. Sell YT immediately to receive an upfront fixed APY, or hold YT for leveraged yield exposure.' },
    { icon:'🔄', title:'4. Trade',      color:T.purple,  body:'The built-in AMM lets you trade PT ↔ Underlying at any time. The AMM price reveals the implied fixed rate the market is pricing.' },
  ];
  return (
    <Card style={{ marginTop: 24 }}>
      <div style={{ color: T.t1, fontWeight: 900, fontSize: 15, marginBottom: 18 }}>How Yield Slicing Works</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {steps.map(s => (
          <div key={s.title} style={{ background: T.bg1, borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ color: s.color, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{s.title}</div>
            <div style={{ color: T.t3, fontSize: 12, lineHeight: 1.6 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────────────────
export default function YieldSlicingPage() {
  const { address } = useAccount();
  const [selected, setSelected] = useState(null);

  const { data: slices = MOCK_SLICES } = useQuery({
    queryKey: ['yield-slices'],
    queryFn:  () => api('/api/yield-slice/slices'),
    refetchInterval: 30_000,
    placeholderData: MOCK_SLICES,
  });

  const { data: stats = MOCK_STATS } = useQuery({
    queryKey: ['yield-slice-stats'],
    queryFn:  () => api('/api/yield-slice/stats'),
    refetchInterval: 60_000,
    placeholderData: MOCK_STATS,
  });

  const { data: userPositions = [] } = useQuery({
    queryKey: ['yield-user', address],
    queryFn:  () => api(`/api/yield-slice/user/${address}`),
    enabled:  !!address,
    refetchInterval: 15_000,
  });

  const activeSlice = selected ?? slices[0];

  return (
    <AppLayout>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${T.accent}20`, border: `1px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍰</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: T.t1 }}>Yield Slicing</h1>
              <p style={{ margin: 0, color: T.t3, fontSize: 13 }}>Split yield-bearing positions into fixed (PT) and variable (YT) components</p>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total TVL',       value: fmtM(stats.totalTVL),       color: T.accent, sub: 'across all slices'    },
            { label: 'Active Slices',   value: stats.activeSlices,          color: T.green,  sub: 'live markets'         },
            { label: 'Protocol Fees',   value: fmtM(stats.totalFees),       color: T.gold,   sub: 'accumulated'          },
            { label: 'Your Positions',  value: userPositions.length || '—', color: T.purple, sub: address ? 'open' : 'connect wallet' },
          ].map(({ label, value, color, sub }) => (
            <Card key={label} glow={color}>
              <Label>{label}</Label>
              <div style={{ color, fontSize: 22, fontWeight: 900, fontFamily: 'monospace' }}>{value}</div>
              <div style={{ color: T.t3, fontSize: 11, marginTop: 3 }}>{sub}</div>
            </Card>
          ))}
        </div>

        {/* ── Main 2-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left: slice list */}
          <div>
            <div style={{ color: T.t2, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>
              ACTIVE SLICES — USDC
            </div>
            {slices.map(s => (
              <SliceCard key={s.id} s={s} selected={activeSlice?.id === s.id} onSelect={setSelected} />
            ))}

            {/* User positions */}
            {address && userPositions.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <div style={{ color: T.t2, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>YOUR POSITIONS</div>
                {userPositions.map(p => (
                  <div key={p.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}40` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: T.t1, fontWeight: 700, fontSize: 13 }}>{p.symbol}</span>
                      <Pill color={T.green}>{fmtM(p.userPosition?.claimableYield)} yield</Pill>
                    </div>
                    <div style={{ color: T.t3, fontSize: 11 }}>
                      PT: {fmt4(p.userPosition?.ptBalance)} · YT: {fmt4(p.userPosition?.ytBalance)} · LP: {fmt4(p.userPosition?.ammLPBalance)}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Right: action panel */}
          {activeSlice && <ActionPanel slice={activeSlice} />}
        </div>

        {/* ── Education ── */}
        <HowItWorks />

        {/* ── Revenue model info ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
          {[
            { icon:'💸', title:'Yield Fee Revenue',   color:T.green,  body:`${parseFloat(slices[0]?.yieldFeeBps || 500) / 100}% of all yield claimed is taken as a protocol fee. This compounds as TVL grows and more yield accrues.` },
            { icon:'🔄', title:'AMM Swap Revenue',    color:T.accent, body:`${parseFloat(slices[0]?.ammFeeBps || 20) / 100}% fee on every PT↔Underlying swap in the built-in AMM. Every rate-discovery trade earns revenue.` },
            { icon:'🏦', title:'TVL Network Effects',  color:T.purple, body:'Higher TVL → more swaps → more yield → more fees. Yield Slicing creates a compounding revenue flywheel for the protocol.' },
          ].map(({ icon, title, color, body }) => (
            <Card key={title} style={{ padding: 18 }} glow={color}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <div style={{ color, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{title}</div>
              <div style={{ color: T.t3, fontSize: 12, lineHeight: 1.6 }}>{body}</div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
