/**
 * OnboardingPage.jsx — Mobile-first 3-step onboarding
 * Goal: user goes from zero → first action in under 2 minutes
 * Steps: Connect Wallet → Deposit USDC → Pick Strategy
 */

import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:    '#03080F',
  card:  '#07111C',
  b:     '#0F2035',
  b2:    '#152840',
  G:     '#00F5A8',
  B:     '#0085FF',
  V:     '#7B5CF0',
  A:     '#FFB020',
  R:     '#FF3355',
  t1:    '#EEF5FF',
  t2:    '#5C7EA0',
  t3:    '#243448',
};

const strategies = [
  {
    id:       'prop',
    icon:     '🏆',
    title:    'Prop Challenge',
    tagline:  'Prove your edge. Trade our capital.',
    desc:     'Pass a 2-phase evaluation and trade up to $200K of funded capital. Keep 80-90% of all profits.',
    stats:    [['Entry fee', '$50–$500'], ['Funded', 'Up to $200K'], ['Your split', '80-90%']],
    accent:   P.A,
    minUSDC:  50,
    cta:      'Start Challenge',
    popular:  true,
  },
  {
    id:       'grid',
    icon:     '🤖',
    title:    'Grid Bot',
    tagline:  'Set it, forget it, earn 24/7.',
    desc:     'Automated grid trading. Places buy/sell orders in a price range and profits from every oscillation.',
    stats:    [['Win rate', '60-70%'], ['Max DD', '15%'], ['Perf fee', '20% profits']],
    accent:   P.G,
    minUSDC:  10,
    cta:      'Start Grid Bot',
    popular:  false,
  },
  {
    id:       'funding',
    icon:     '⚡',
    title:    'Funding Arb',
    tagline:  'Earn while the market sleeps.',
    desc:     'Delta-neutral strategy. Earns funding rate payments. 80-90% of periods positive. Near-zero price risk.',
    stats:    [['Capture rate', '80-90%'], ['Directional risk', 'Near zero'], ['Entry', 'When rate > 15%']],
    accent:   P.B,
    minUSDC:  10,
    cta:      'Start Funding Arb',
    popular:  false,
  },
  {
    id:       'perp',
    icon:     '📈',
    title:    'Trade Manually',
    tagline:  'Up to 1000× leverage. Your rules.',
    desc:     'Full access to perpetuals, spot, forex, metals and more. Advanced order types, portfolio margin.',
    stats:    [['Max leverage', '1000×'], ['Markets', '295+'], ['Min deposit', '$10']],
    accent:   P.V,
    minUSDC:  10,
    cta:      'Start Trading',
    popular:  false,
  },
];

// ── Micro components ──────────────────────────────────────────────────────────
function Step({ n, label, active, done }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, opacity: active||done ? 1 : 0.35 }}>
      <div style={{
        width:28, height:28, borderRadius:8,
        background: done ? P.G : active ? `${P.G}20` : P.b2,
        border: `1.5px solid ${done ? P.G : active ? P.G : P.b2}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:800, color: done ? '#000' : active ? P.G : P.t2,
        fontFamily:'monospace', transition:'all .3s', flexShrink:0,
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize:12, fontWeight:600, color: active ? P.t1 : P.t2, transition:'color .3s' }}>
        {label}
      </span>
    </div>
  );
}

function Pill({ children, accent = P.G }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 10px',
      background:`${accent}18`, border:`1px solid ${accent}30`,
      borderRadius:100, fontSize:9, fontWeight:700,
      color:accent, fontFamily:'monospace', letterSpacing:.5,
    }}>
      {children}
    </span>
  );
}

function StatBadge({ label, value, accent }) {
  return (
    <div style={{
      flex:1, background:P.b, borderRadius:10, padding:'8px 10px',
      border:`1px solid ${P.b2}`,
    }}>
      <div style={{ fontSize:8, color:P.t2, fontWeight:700, marginBottom:3, letterSpacing:.5 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:accent }}>
        {value}
      </div>
    </div>
  );
}

// ── STEP 1: Connect Wallet ────────────────────────────────────────────────────
function StepConnect({ onNext }) {
  const { address, isConnected } = useAccount();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isConnected) { setPulse(true); setTimeout(onNext, 900); }
  }, [isConnected]);

  const wallets = [
    { id:'metamask',  name:'MetaMask',       icon:'🦊', popular:true  },
    { id:'walletconnect', name:'WalletConnect', icon:'🔗', popular:true  },
    { id:'coinbase',  name:'Coinbase Wallet', icon:'🔵', popular:false },
    { id:'rainbow',   name:'Rainbow',        icon:'🌈', popular:false },
    { id:'ledger',    name:'Ledger',         icon:'🔐', popular:false },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'0 4px' }}>
      {/* Hero */}
      <div style={{ textAlign:'center', padding:'24px 0 8px' }}>
        <div style={{
          width:72, height:72, borderRadius:20, margin:'0 auto 16px',
          background:`linear-gradient(135deg,${P.G}20,${P.B}20)`,
          border:`1.5px solid ${P.G}30`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:32,
          boxShadow:`0 0 40px ${P.G}15`,
        }}>
          🔗
        </div>
        <h2 style={{ fontFamily:'"Syne",sans-serif', fontSize:22, fontWeight:800, color:P.t1, margin:'0 0 8px', letterSpacing:-1 }}>
          Connect your wallet
        </h2>
        <p style={{ fontSize:12, color:P.t2, lineHeight:1.6, maxWidth:260, margin:'0 auto' }}>
          Non-custodial. Your keys, your funds. Wikicious never touches your private key.
        </p>
      </div>

      {/* Wallet list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {wallets.map(w => (
          <button key={w.id}
            onClick={() => {/* wagmi connect */}}
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'13px 16px', borderRadius:14,
              background: P.card, border:`1.5px solid ${P.b2}`,
              color:P.t1, cursor:'pointer',
              transition:'all .15s',
              fontFamily:'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.G; e.currentTarget.style.background = `${P.G}08`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.b2; e.currentTarget.style.background = P.card; }}
          >
            <span style={{ fontSize:22 }}>{w.icon}</span>
            <span style={{ flex:1, fontWeight:600, fontSize:14, textAlign:'left' }}>{w.name}</span>
            {w.popular && <Pill accent={P.G}>POPULAR</Pill>}
            <span style={{ color:P.t3, fontSize:14 }}>›</span>
          </button>
        ))}
      </div>

      {/* Trust badges */}
      <div style={{
        display:'flex', justifyContent:'center', gap:20, padding:'8px 0',
        borderTop:`1px solid ${P.b}`,
      }}>
        {['Non-custodial', 'Audited', 'Open source'].map(t => (
          <div key={t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:P.t2 }}>
            <span style={{ color:P.G }}>✓</span> {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STEP 2: Deposit USDC ──────────────────────────────────────────────────────
function StepDeposit({ onNext, onBack, selectedStrategy }) {
  const presets = [10, 50, 100, 500, 1000];
  const [amount, setAmount] = useState('');
  const [active, setActive] = useState(null);
  const strat = strategies.find(s => s.id === selectedStrategy) || strategies[0];
  const minDeposit = strat.minDeposit;
  const num = parseFloat(amount) || 0;
  const valid = num >= minDeposit;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'0 4px' }}>
      {/* Header */}
      <div style={{ textAlign:'center', padding:'20px 0 4px' }}>
        <div style={{
          width:60, height:60, borderRadius:16, margin:'0 auto 12px',
          background:`${P.G}15`, border:`1.5px solid ${P.G}30`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
        }}>
          💵
        </div>
        <h2 style={{ fontFamily:'"Syne",sans-serif', fontSize:21, fontWeight:800, color:P.t1, margin:'0 0 6px', letterSpacing:-1 }}>
          Deposit USDC
        </h2>
        <p style={{ fontSize:12, color:P.t2, lineHeight:1.6 }}>
          Minimum ${minDeposit} for <span style={{ color:strat.accent, fontWeight:700 }}>{strat.title}</span>
        </p>
      </div>

      {/* Amount input */}
      <div style={{
        background:P.b, borderRadius:14, padding:'16px',
        border:`1.5px solid ${valid && num > 0 ? P.G : P.b2}`,
        transition:'border-color .2s',
      }}>
        <div style={{ fontSize:9, color:P.t2, fontWeight:700, marginBottom:8, letterSpacing:.8 }}>
          AMOUNT (USDC)
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28, color:P.t2, fontWeight:300 }}>$</span>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setActive(null); }}
            placeholder="0"
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              fontSize:36, fontWeight:700, color:P.t1, fontFamily:'"JetBrains Mono",monospace',
            }}
          />
          <span style={{ fontSize:12, color:P.t2, fontFamily:'monospace' }}>USDC</span>
        </div>
        {num > 0 && num < minDeposit && (
          <div style={{ fontSize:10, color:P.R, marginTop:6 }}>
            Minimum deposit is ${minDeposit} for {strat.title}
          </div>
        )}
      </div>

      {/* Quick amounts */}
      <div style={{ display:'flex', gap:7 }}>
        {presets.filter(p => p >= minDeposit).map(p => (
          <button key={p}
            onClick={() => { setAmount(String(p)); setActive(p); }}
            style={{
              flex:1, padding:'9px 4px', borderRadius:10,
              border:`1.5px solid ${active === p ? P.G : P.b2}`,
              background: active === p ? `${P.G}15` : P.card,
              color: active === p ? P.G : P.t2,
              fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'monospace',
              transition:'all .15s',
            }}
          >
            ${p}
          </button>
        ))}
      </div>

      {/* Where it goes */}
      <div style={{
        background:P.card, borderRadius:12, padding:'12px 14px',
        border:`1px solid ${P.b2}`,
      }}>
        <div style={{ fontSize:9, color:P.t2, fontWeight:700, marginBottom:10, letterSpacing:.8 }}>
          WHERE YOUR FUNDS GO
        </div>
        {strat.id === 'prop' ? (
          <div style={{ fontSize:11, color:P.t2, lineHeight:1.8 }}>
            Your ${num || minDeposit} pays the <span style={{ color:P.A }}>challenge fee</span>.<br/>
            You trade our pool capital — up to <span style={{ color:P.G }}>$200,000</span> funded.
          </div>
        ) : (
          <div style={{ fontSize:11, color:P.t2, lineHeight:1.8 }}>
            Deposited to <span style={{ color:strat.accent }}>WikiBotVault</span>.<br/>
            Bot trades on your behalf 24/7. Withdraw anytime.
          </div>
        )}
      </div>

      {/* Fiat option */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
        background:P.b, borderRadius:12, border:`1px solid ${P.b2}`,
      }}>
        <span style={{ fontSize:18 }}>💳</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:600, color:P.t1 }}>Don't have USDC?</div>
          <div style={{ fontSize:10, color:P.t2 }}>Buy with card via MoonPay or Transak</div>
        </div>
        <button style={{
          padding:'6px 12px', borderRadius:8,
          background:`${P.B}20`, border:`1px solid ${P.B}40`,
          color:P.B, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
        }}>
          Buy USDC
        </button>
      </div>

      {/* CTA */}
      <button
        onClick={() => valid && onNext()}
        disabled={!valid}
        style={{
          padding:'15px', borderRadius:14, border:'none',
          background: valid
            ? `linear-gradient(135deg,${strat.accent},${strat.accent}CC)`
            : P.b2,
          color: valid ? (strat.id === 'prop' ? '#000' : '#000') : P.t3,
          fontWeight:800, fontSize:15, cursor: valid ? 'pointer' : 'not-allowed',
          fontFamily:'"Syne",sans-serif', letterSpacing:.3, transition:'all .2s',
          boxShadow: valid ? `0 8px 24px ${strat.accent}30` : 'none',
        }}
      >
        {valid ? `Deposit $${num} USDC →` : `Minimum $${minDeposit}`}
      </button>
    </div>
  );
}

// ── STEP 3: Pick Strategy ─────────────────────────────────────────────────────
function StepStrategy({ onSelect, selected }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 4px' }}>
      <div style={{ textAlign:'center', padding:'20px 0 8px' }}>
        <h2 style={{ fontFamily:'"Syne",sans-serif', fontSize:21, fontWeight:800, color:P.t1, margin:'0 0 6px', letterSpacing:-1 }}>
          Pick your first strategy
        </h2>
        <p style={{ fontSize:12, color:P.t2 }}>You can change this anytime. Start with what interests you most.</p>
      </div>

      {strategies.map(s => (
        <button key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            display:'block', textAlign:'left', padding:'14px 16px', borderRadius:16,
            background: selected === s.id ? `${s.accent}0F` : P.card,
            border:`1.5px solid ${selected === s.id ? s.accent : P.b2}`,
            cursor:'pointer', transition:'all .2s', fontFamily:'inherit', width:'100%',
            boxShadow: selected === s.id ? `0 4px 24px ${s.accent}20` : 'none',
          }}
        >
          {/* Top row */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{
              width:40, height:40, borderRadius:11, fontSize:18,
              background:`${s.accent}18`, border:`1px solid ${s.accent}30`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              {s.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:14, fontWeight:800, color:P.t1 }}>{s.title}</span>
                {s.popular && <Pill accent={P.A}>MOST POPULAR</Pill>}
              </div>
              <div style={{ fontSize:11, color:s.accent, fontWeight:600, marginTop:2 }}>{s.tagline}</div>
            </div>
            <div style={{
              width:22, height:22, borderRadius:50,
              background: selected === s.id ? s.accent : P.b2,
              border:`2px solid ${selected === s.id ? s.accent : P.b}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, color: selected === s.id ? '#000' : P.t3,
              flexShrink:0, transition:'all .2s',
            }}>
              {selected === s.id ? '✓' : ''}
            </div>
          </div>

          {/* Desc */}
          <p style={{ fontSize:11, color:P.t2, lineHeight:1.6, margin:'0 0 10px' }}>
            {s.desc}
          </p>

          {/* Stats */}
          <div style={{ display:'flex', gap:7 }}>
            {s.stats.map(([l, v]) => <StatBadge key={l} label={l} value={v} accent={s.accent} />)}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── STEP 4: All done ──────────────────────────────────────────────────────────
function StepDone({ strategy, amount }) {
  const strat = strategies.find(s => s.id === strategy) || strategies[0];
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCount(c => c < 100 ? c + 4 : 100), 20);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, padding:'32px 4px', textAlign:'center' }}>
      {/* Success ring */}
      <div style={{ position:'relative', width:100, height:100 }}>
        <svg width="100" height="100" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke={P.b} strokeWidth="5"/>
          <circle cx="50" cy="50" r="44" fill="none" stroke={strat.accent} strokeWidth="5"
            strokeDasharray={`${2*Math.PI*44}`}
            strokeDashoffset={`${2*Math.PI*44*(1-count/100)}`}
            style={{ transition:'stroke-dashoffset .05s' }}
            strokeLinecap="round"/>
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:34,
        }}>
          {count === 100 ? '🎉' : strat.icon}
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily:'"Syne",sans-serif', fontSize:24, fontWeight:900, color:P.t1, margin:'0 0 8px', letterSpacing:-1 }}>
          You're all set!
        </h2>
        <p style={{ fontSize:13, color:P.t2, lineHeight:1.7, maxWidth:280 }}>
          <span style={{ color:strat.accent, fontWeight:700 }}>{strat.title}</span> is live.<br/>
          ${amount} deposited. {strat.id === 'prop' ? 'Challenge started.' : 'Bot running 24/7.'}
        </p>
      </div>

      {/* What happens next */}
      <div style={{
        width:'100%', background:P.card, borderRadius:14, padding:'16px',
        border:`1px solid ${P.b2}`, textAlign:'left',
      }}>
        <div style={{ fontSize:9, color:P.t2, fontWeight:700, marginBottom:12, letterSpacing:.8 }}>
          WHAT HAPPENS NEXT
        </div>
        {strat.id === 'prop' ? [
          ['📋','Phase 1 starts now','Hit 8% profit target in 30 days'],
          ['📐','Rules enforced on-chain','Drawdown limit, consistency rule, min trading days'],
          ['🏆','Pass both phases','Get funded account up to $200K'],
          ['💵','Withdraw profits','Keep 80-90% of everything you earn'],
        ] : strat.id === 'grid' ? [
          ['🤖','Bot places orders','Grid of buy/sell in your price range'],
          ['🔄','Earns on every cycle','Each oscillation = profit'],
          ['📊','Monitor anytime','Track cycles, P&L, win rate live'],
          ['💵','Withdraw anytime','No lockup, no waiting'],
        ] : strat.id === 'funding' ? [
          ['⚡','Bot monitors funding','Enters when rate > 15% APY'],
          ['🛡','Delta-neutral hedge','Long spot + short perp = zero price risk'],
          ['💰','Funding collected','Every 8-hour period generates income'],
          ['🚪','Auto-exits','If funding turns negative, position closes'],
        ] : [
          ['📈','Markets are live','295+ trading pairs available now'],
          ['🎯','Start with small size','Use max 5-10× leverage until comfortable'],
          ['🛡','Set stop-losses','Always define your exit before entering'],
          ['📊','Track your P&L','Leaderboard and trade history update live'],
        ]}.map(([icon, title, desc]) => (
          <div key={title} style={{ display:'flex', gap:10, marginBottom:12 }}>
            <span style={{ fontSize:16, marginTop:1 }}>{icon}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:P.t1 }}>{title}</div>
              <div style={{ fontSize:10, color:P.t2, marginTop:1 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <a href="/app" style={{
        display:'block', width:'100%', padding:'15px', borderRadius:14,
        background:`linear-gradient(135deg,${strat.accent},${strat.accent}BB)`,
        color:'#000', fontWeight:900, fontSize:15, textDecoration:'none',
        fontFamily:'"Syne",sans-serif', letterSpacing:.3, textAlign:'center',
        boxShadow:`0 8px 24px ${strat.accent}30`,
      }}>
        Open {strat.title} →
      </a>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { isConnected } = useAccount();
  const [step, setStep]         = useState(1);  // 1=connect 2=strategy 3=deposit 4=done
  const [strategy, setStrategy] = useState('prop');
  const [amount, setAmount]     = useState('50');
  const scrollRef = useRef(null);

  // If already connected, skip step 1
  useEffect(() => { if (isConnected && step === 1) setStep(2); }, [isConnected]);

  // Scroll to top on step change
  useEffect(() => { scrollRef.current?.scrollTo({ top:0, behavior:'smooth' }); }, [step]);

  const stepLabels = ['Connect', 'Strategy', 'Deposit', 'Start'];
  const pct = ((step - 1) / 3) * 100;

  return (
    <div style={{
      minHeight:'100vh', background:P.bg,
      fontFamily:'"DM Sans",sans-serif', color:P.t1,
      display:'flex', flexDirection:'column', alignItems:'center',
    }}>
      {/* Mobile shell */}
      <div style={{
        width:'100%', maxWidth:440, minHeight:'100vh',
        display:'flex', flexDirection:'column', position:'relative',
      }}>
        {/* Top bar */}
        <div style={{
          padding:'16px 20px 0', position:'sticky', top:0, zIndex:10,
          background:P.bg,
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:30, height:30, borderRadius:8,
                background:`linear-gradient(135deg,${P.G},${P.B})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:900, color:'#000',
              }}>W</div>
              <span style={{ fontFamily:'"Syne",sans-serif', fontSize:16, fontWeight:800, letterSpacing:-.5 }}>
                Wikicious
              </span>
            </div>
            {step < 4 && (
              <span style={{ fontSize:10, color:P.t2, fontFamily:'monospace' }}>
                Step {step} of 3
              </span>
            )}
          </div>

          {/* Progress bar */}
          {step < 4 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ height:3, background:P.b, borderRadius:2, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:2,
                  width:`${pct}%`,
                  background:`linear-gradient(90deg,${P.G},${P.B})`,
                  transition:'width .4s cubic-bezier(.4,0,.2,1)',
                }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                {stepLabels.slice(0,3).map((l,i) => (
                  <Step key={l} n={i+1} label={l} active={step===i+1} done={step>i+1} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div ref={scrollRef} style={{ flex:1, padding:'0 20px 32px', overflowY:'auto' }}>
          {step === 1 && <StepConnect onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepStrategy
              selected={strategy}
              onSelect={(id) => { setStrategy(id); setStep(3); }}
            />
          )}
          {step === 3 && (
            <StepDeposit
              selectedStrategy={strategy}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              onAmountChange={setAmount}
            />
          )}
          {step === 4 && <StepDone strategy={strategy} amount={amount} />}
        </div>

        {/* Bottom back button */}
        {step > 1 && step < 4 && (
          <div style={{ padding:'0 20px 20px', background:P.bg }}>
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                width:'100%', padding:'12px', borderRadius:12,
                background:'none', border:`1px solid ${P.b2}`,
                color:P.t2, fontSize:13, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit',
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
