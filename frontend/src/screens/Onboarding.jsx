import { useState, useEffect } from "react";

const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829",
  border:"#1C2138", border2:"#242A42",
  t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const WALLETS = [
  { id:"metamask",  name:"MetaMask",       icon:"🦊", popular:true  },
  { id:"rainbow",   name:"Rainbow",         icon:"🌈", popular:true  },
  { id:"coinbase",  name:"Coinbase Wallet", icon:"🔵", popular:false },
  { id:"walletconnect",name:"WalletConnect",icon:"🔗", popular:false },
  { id:"safe",      name:"Safe (Multisig)", icon:"🔐", popular:false },
];

const FEATURES = [
  { icon:"⚡", title:"125× Leverage",     sub:"Crypto perps with deep liquidity",    color:T.gold   },
  { icon:"💱", title:"63+ Markets",        sub:"Forex, metals, crypto, commodities",  color:T.accent },
  { icon:"🔒", title:"Non-custodial",      sub:"Your keys, your funds, always",       color:T.green  },
  { icon:"🏆", title:"Prop Trading",       sub:"Get funded up to $200,000",           color:T.purple },
  { icon:"💬", title:"On-chain Social",    sub:"Share trades, follow top traders",    color:T.cyan   },
  { icon:"🎁", title:"$350 Bonus",         sub:"Get trading credits on signup",       color:T.red    },
];

const STATS = [
  { label:"Total Volume",   value:"$2.8B",   color:T.green  },
  { label:"Active Traders", value:"48,400",  color:T.accent },
  { label:"Markets",        value:"63+",     color:T.gold   },
  { label:"Max Leverage",   value:"125×",    color:T.purple },
];

function StarField() {
  const stars = Array.from({length:60},(_,i)=>({
    x: 0*100, y: 0*100,
    size: 0*2+0.5, delay: 0*3,
  }));
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
      {stars.map((s,i)=>(
        <div key={i} style={{ position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:"50%", background:"#fff",
          opacity:0.15, animation:`twinkle ${2+s.delay}s ease-in-out infinite`,
          animationDelay:`${s.delay}s` }}/>
      ))}
    </div>
  );
}

function Step({ n, total, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
      {Array.from({length:total},(_,i)=>(
        <div key={i} style={{ height:3, flex:1, borderRadius:2,
          background:i<n?T.accent:`${T.accent}22`,
          boxShadow:i<n?`0 0 8px ${T.accent}66`:"none",
          transition:"all 0.4s" }}/>
      ))}
    </div>
  );
}

// ── STEP 1: LANDING ────────────────────────────────────────────────────────
function LandingStep({ onNext, refCode }) {
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),2000); return()=>clearInterval(id); },[]);

  const TICKERS = [
    ["BTC/USD","67,432.10","+2.34%",true],
    ["ETH/USD","3,521.44","-0.87%",false],
    ["XAU/USD","2,341.50","+0.88%",true],
    ["EUR/USD","1.0854","+0.12%",true],
    ["SOL/USD","182.33","+5.12%",true],
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      textAlign:"center", maxWidth:580, margin:"0 auto", padding:"0 16px" }}>
      <StarField/>

      {/* Referred badge */}
      {refCode && (
        <div style={{ marginBottom:16, padding:"8px 18px", borderRadius:20,
          background:`${T.gold}18`, border:`1px solid ${T.gold}44`,
          fontSize:12, color:T.gold, fontWeight:700, fontFamily:"'Syne',sans-serif",
          animation:"fadeUp 0.4s ease" }}>
          🎁 You were referred by a friend — claim your $150 bonus!
        </div>
      )}

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
        <div style={{ width:48, height:48, borderRadius:14,
          background:"linear-gradient(135deg,#5B7FFF,#00E5A0)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:900, fontSize:24, color:"#000",
          boxShadow:"0 8px 32px #5B7FFF44" }}>W</div>
        <span style={{ fontWeight:900, fontSize:28, fontFamily:"'Syne',sans-serif",
          background:"linear-gradient(90deg,#EDF0FA,#8892B0)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Wikicious</span>
      </div>

      {/* Hero */}
      <h1 style={{ fontSize:"clamp(28px,5vw,48px)", fontWeight:900, lineHeight:1.1,
        fontFamily:"'Syne',sans-serif", marginBottom:16,
        background:`linear-gradient(135deg,${T.t1},${T.t2})`,
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
        Trade Everything.<br/>
        <span style={{ background:`linear-gradient(90deg,${T.accent},${T.green})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          On-Chain. Forever.
        </span>
      </h1>

      <p style={{ fontSize:15, color:T.t2, lineHeight:1.7, marginBottom:28, maxWidth:440,
        fontFamily:"'Outfit',sans-serif" }}>
        Perpetuals on Arbitrum. 63 markets — crypto, forex, gold, oil. Non-custodial, Chainlink-powered, manipulation-proof.
      </p>

      {/* Live ticker */}
      <div style={{ display:"flex", gap:8, marginBottom:28, overflowX:"auto",
        width:"100%", justifyContent:"center", flexWrap:"wrap" }}>
        {TICKERS.map(([sym,price,ch,up])=>(
          <div key={sym} style={{ background:T.bg2, borderRadius:8, padding:"6px 12px",
            border:`1px solid ${T.border}`, display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.t2,
              fontFamily:"'Syne',sans-serif" }}>{sym}</span>
            <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace",
              color:T.t1 }}>{price}</span>
            <span style={{ fontSize:10, fontWeight:700,
              color:up?T.green:T.red }}>{ch}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:6, marginBottom:28, width:"100%",
        justifyContent:"center", flexWrap:"wrap" }}>
        {STATS.map(s=>(
          <div key={s.label} style={{ background:T.bg2, borderRadius:10, padding:"10px 14px",
            border:`1px solid ${T.border}`, flex:1, minWidth:100, textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, color:s.color,
              fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.08em", marginTop:3 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={onNext} style={{ padding:"16px 40px", borderRadius:12, border:"none",
        background:`linear-gradient(135deg,${T.accent},${T.purple})`,
        color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer",
        fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em", width:"100%", maxWidth:360,
        boxShadow:`0 8px 32px ${T.accent}55`, transition:"all 0.2s",
        marginBottom:14, position:"relative", overflow:"hidden" }}
        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
        onMouseLeave={e=>e.currentTarget.style.transform="none"}>
        Connect Wallet &amp; Claim $50 Bonus →
      </button>

      <p style={{ fontSize:11, color:T.t3, fontFamily:"'Outfit',sans-serif" }}>
        Non-custodial · No KYC · Open to all · Arbitrum One
      </p>

      {/* Features grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8,
        marginTop:24, width:"100%", textAlign:"left" }}>
        {FEATURES.map(f=>(
          <div key={f.title} style={{ background:T.bg2, borderRadius:10, padding:"12px",
            border:`1px solid ${f.color}22` }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{f.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:T.t1,
              fontFamily:"'Syne',sans-serif", marginBottom:2 }}>{f.title}</div>
            <div style={{ fontSize:10, color:T.t3, lineHeight:1.4 }}>{f.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STEP 2: CONNECT WALLET ─────────────────────────────────────────────────
function ConnectStep({ onNext }) {
  const [connecting, setConnecting] = useState(null);
  const [connected,  setConnected]  = useState(false);

  const handleConnect = (wallet) => {
    setConnecting(wallet.id);
    setTimeout(()=>{
      setConnecting(null);
      setConnected(wallet.id);
      setTimeout(onNext, 1200);
    }, 1800);
  };

  return (
    <div style={{ maxWidth:420, margin:"0 auto", width:"100%" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🔗</div>
        <h2 style={{ fontSize:24, fontWeight:800, color:T.t1,
          fontFamily:"'Syne',sans-serif", marginBottom:8 }}>Connect Your Wallet</h2>
        <p style={{ fontSize:13, color:T.t3, fontFamily:"'Outfit',sans-serif" }}>
          Connect to Arbitrum One. Your keys stay with you — always.
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {WALLETS.map(w=>{
          const isConnecting = connecting===w.id;
          const isConnected  = connected===w.id;
          return (
            <button key={w.id} onClick={()=>handleConnect(w)}
              disabled={!!connecting || !!connected}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                borderRadius:12, border:`2px solid ${isConnected?T.green:isConnecting?T.accent:T.border}`,
                background:isConnected?`${T.green}11`:isConnecting?`${T.accent}11`:T.bg2,
                cursor:connecting?"not-allowed":"pointer", transition:"all 0.2s",
                boxShadow:isConnected?`0 0 20px ${T.green}44`:isConnecting?`0 0 20px ${T.accent}44`:"none" }}
              onMouseEnter={e=>{ if(!connecting&&!connected) { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.background=`${T.accent}08`; }}}
              onMouseLeave={e=>{ if(!connecting&&!connected) { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.bg2; }}}>
              <span style={{ fontSize:24 }}>{w.icon}</span>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.t1,
                  fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", gap:8 }}>
                  {w.name}
                  {w.popular && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:8,
                    background:`${T.accent}22`, color:T.accent, border:`1px solid ${T.accent}33`,
                    fontFamily:"'Syne',sans-serif" }}>POPULAR</span>}
                </div>
                {isConnecting && <div style={{ fontSize:11, color:T.accent, marginTop:2 }}>Connecting…</div>}
                {isConnected  && <div style={{ fontSize:11, color:T.green,  marginTop:2 }}>✓ Connected!</div>}
              </div>
              <span style={{ fontSize:16, color:isConnected?T.green:T.t3 }}>
                {isConnected?"✓":isConnecting?"⟳":"›"}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop:16, padding:"12px 14px", background:`${T.gold}0A`,
        borderRadius:10, border:`1px solid ${T.gold}22`, fontSize:11, color:T.gold,
        lineHeight:1.6, fontFamily:"'Outfit',sans-serif", textAlign:"center" }}>
        🎁 <strong>$50 signup bonus</strong> automatically activated on connect
      </div>
    </div>
  );
}

// ── STEP 3: SWITCH NETWORK ─────────────────────────────────────────────────
function NetworkStep({ onNext }) {
  const [switching, setSwitching] = useState(false);
  const [done, setDone] = useState(false);

  const handleSwitch = () => {
    setSwitching(true);
    setTimeout(()=>{ setSwitching(false); setDone(true); setTimeout(onNext, 1000); }, 1500);
  };

  return (
    <div style={{ maxWidth:420, margin:"0 auto", textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔀</div>
      <h2 style={{ fontSize:24, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif",
        marginBottom:8 }}>Switch to Arbitrum</h2>
      <p style={{ fontSize:13, color:T.t3, fontFamily:"'Outfit',sans-serif", marginBottom:24 }}>
        Wikicious runs on Arbitrum One — Ethereum's fastest L2 with ~$0.01 gas fees.
      </p>

      <div style={{ background:T.bg2, borderRadius:14, border:`1px solid ${T.border}`,
        padding:"20px", marginBottom:20, textAlign:"left" }}>
        {[
          ["Network","Arbitrum One"],
          ["Chain ID","42161"],
          ["RPC","https://arb1.arbitrum.io/rpc"],
          ["Explorer","arbiscan.io"],
          ["Gas","~$0.01 per tx"],
        ].map(([k,v])=>(
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
            padding:"7px 0", borderBottom:`1px solid ${T.border}11`, fontSize:12 }}>
            <span style={{ color:T.t3 }}>{k}</span>
            <span style={{ color:T.t1, fontFamily:"'JetBrains Mono',monospace",
              fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>

      <button onClick={handleSwitch} disabled={done}
        style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none",
          background:done?`${T.green}22`:switching?T.bg3:`linear-gradient(135deg,#12AAFF,${T.accent})`,
          color:done?T.green:switching?T.t3:"#fff",
          fontSize:14, fontWeight:800, cursor:done?"default":"pointer",
          fontFamily:"'Syne',sans-serif", transition:"all 0.3s",
          boxShadow:done?"none":`0 8px 24px ${T.accent}44` }}>
        {done?"✓ On Arbitrum!":switching?"Switching…":"Switch to Arbitrum One"}
      </button>
    </div>
  );
}

// ── STEP 4: CLAIM BONUS ────────────────────────────────────────────────────
function BonusStep({ onNext }) {
  const [claimed, setClaimed] = useState([]);
  const [allClaimed, setAllClaimed] = useState(false);

  const BONUSES = [
    { id:"signup",  icon:"🎁", title:"Sign-up Bonus",   amount:50,  color:T.accent, desc:"Just for creating your account",   auto:true  },
    { id:"deposit", icon:"💰", title:"First Deposit",   amount:100, color:T.green,  desc:"Deposit $100+ to activate",         auto:false },
    { id:"referral",icon:"👥", title:"Referral Bonus",  amount:50,  color:T.purple, desc:"Referred by a friend",              auto:true  },
  ];

  const handleClaim = (id) => {
    if(claimed.includes(id)) return;
    const next = [...claimed, id];
    setClaimed(next);
    if(next.length >= BONUSES.filter(b=>b.auto).length) {
      setTimeout(()=>setAllClaimed(true), 600);
    }
  };

  useEffect(()=>{
    BONUSES.filter(b=>b.auto).forEach((b,i)=>{
      setTimeout(()=>handleClaim(b.id), 400+i*500);
    });
  },[]);

  const total = BONUSES.filter(b=>claimed.includes(b.id)).reduce((a,b)=>a+b.amount,0);

  return (
    <div style={{ maxWidth:440, margin:"0 auto", textAlign:"center" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
      <h2 style={{ fontSize:24, fontWeight:800, color:T.t1,
        fontFamily:"'Syne',sans-serif", marginBottom:6 }}>Welcome to Wikicious!</h2>
      <p style={{ fontSize:13, color:T.t3, fontFamily:"'Outfit',sans-serif", marginBottom:24 }}>
        Your bonuses are being activated automatically.
      </p>

      {/* Bonus cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {BONUSES.map(b=>{
          const isActive = claimed.includes(b.id);
          return (
            <div key={b.id} style={{ display:"flex", alignItems:"center", gap:14,
              padding:"14px 18px", borderRadius:12,
              border:`2px solid ${isActive?b.color:T.border}`,
              background:isActive?`${b.color}0A`:T.bg2,
              transition:"all 0.4s",
              boxShadow:isActive?`0 0 20px ${b.color}22`:"none",
              transform:isActive?"none":"scale(0.98)" }}>
              <span style={{ fontSize:22 }}>{b.icon}</span>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1,
                  fontFamily:"'Syne',sans-serif" }}>{b.title}</div>
                <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{b.desc}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:20, fontWeight:800, color:isActive?b.color:T.t3,
                  fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>
                  {isActive?`+$${b.amount}`:`$${b.amount}`}
                </div>
                <div style={{ fontSize:11, color:isActive?`${b.color}88`:T.t3,
                  marginTop:2, transition:"color 0.3s" }}>
                  {b.auto?(isActive?"✓ Activated":"Activating…"):(isActive?"✓ Active":"Deposit to unlock")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ background:T.bg2, borderRadius:12, padding:"16px",
        border:`1px solid ${T.green}33`, marginBottom:20 }}>
        <div style={{ fontSize:11, color:T.t3, fontFamily:"'Syne',sans-serif",
          letterSpacing:"0.1em", marginBottom:6 }}>TOTAL TRADE CREDIT ACTIVATED</div>
        <div style={{ fontSize:40, fontWeight:900, color:T.green,
          fontFamily:"'JetBrains Mono',monospace" }}>+${total}</div>
        <div style={{ fontSize:11, color:`${T.green}88`, marginTop:4 }}>
          Trade credit · Profits are real USDC and withdrawable
        </div>
      </div>

      <button onClick={onNext}
        style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none",
          background:`linear-gradient(135deg,${T.green},#00B880)`,
          color:"#000", fontSize:14, fontWeight:800, cursor:"pointer",
          fontFamily:"'Syne',sans-serif", boxShadow:`0 8px 24px ${T.green}44`,
          opacity:total>0?1:0.4, transition:"all 0.3s" }}
        disabled={total===0}>
        Start Trading →
      </button>
    </div>
  );
}

// ── STEP 5: DONE ───────────────────────────────────────────────────────────
function DoneStep({ onFinish }) {
  const QUICK_LINKS = [
    { icon:"📊", label:"Open Trade",      color:T.accent },
    { icon:"💰", label:"Deposit Funds",   color:T.green  },
    { icon:"🏆", label:"Try Prop Eval",   color:T.gold   },
    { icon:"💬", label:"Explore Social",  color:T.purple },
  ];

  return (
    <div style={{ maxWidth:460, margin:"0 auto", textAlign:"center" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🚀</div>
      <h2 style={{ fontSize:28, fontWeight:900, color:T.t1,
        fontFamily:"'Syne',sans-serif", marginBottom:8 }}>
        You're all set!
      </h2>
      <p style={{ fontSize:14, color:T.t2, lineHeight:1.7, marginBottom:28,
        fontFamily:"'Outfit',sans-serif" }}>
        Your account is ready. $150 in trade credits activated. Trade crypto, forex, gold and more — all on-chain, all non-custodial.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
        {QUICK_LINKS.map(l=>(
          <button key={l.label} onClick={onFinish} style={{
            padding:"18px 12px", borderRadius:12,
            border:`1px solid ${l.color}33`,
            background:`${l.color}0A`, cursor:"pointer", transition:"all 0.2s",
            display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}
            onMouseEnter={e=>{ e.currentTarget.style.background=`${l.color}18`; e.currentTarget.style.borderColor=`${l.color}66`; e.currentTarget.style.transform="translateY(-3px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=`${l.color}0A`; e.currentTarget.style.borderColor=`${l.color}33`; e.currentTarget.style.transform="none"; }}>
            <span style={{ fontSize:28 }}>{l.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:l.color,
              fontFamily:"'Syne',sans-serif" }}>{l.label}</span>
          </button>
        ))}
      </div>

      <button onClick={onFinish} style={{ width:"100%", padding:"14px 0", borderRadius:12,
        border:"none", background:`linear-gradient(135deg,${T.accent},${T.purple})`,
        color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
        fontFamily:"'Syne',sans-serif", boxShadow:`0 8px 24px ${T.accent}44` }}>
        Enter Wikicious
      </button>

      <div style={{ marginTop:14, display:"flex", justifyContent:"center", gap:20,
        fontSize:11, color:T.t3 }}>
        <span>Refer friends → earn 10% rev share</span>
        <span>·</span>
        <span>Deposit $100 → unlock $100 bonus</span>
      </div>
    </div>
  );
}

// ── MAIN ONBOARDING ────────────────────────────────────────────────────────
export default function Onboarding({ onComplete, refCode=null }) {
  const [step, setStep] = useState(0);

  const STEPS = [
    { component:<LandingStep  onNext={()=>setStep(1)} refCode={refCode}/> },
    { component:<ConnectStep  onNext={()=>setStep(2)}/> },
    { component:<NetworkStep  onNext={()=>setStep(3)}/> },
    { component:<BonusStep    onNext={()=>setStep(4)}/> },
    { component:<DoneStep     onFinish={onComplete||(() => setStep(0))}/> },
  ];

  const STEP_LABELS = ["Welcome","Connect","Network","Bonuses","Done"];

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, color:T.t1,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 16px", position:"relative",
      fontFamily:"'Outfit',sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes twinkle{0%,100%{opacity:0.1}50%{opacity:0.4}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      `}</style>

      {/* Background glow */}
      <div style={{ position:"fixed", top:"20%", left:"10%", width:600, height:600,
        borderRadius:"50%", background:`${T.accent}06`, filter:"blur(80px)",
        pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", bottom:"10%", right:"5%", width:400, height:400,
        borderRadius:"50%", background:`${T.purple}06`, filter:"blur(60px)",
        pointerEvents:"none", zIndex:0 }}/>

      {/* Content */}
      <div style={{ width:"100%", maxWidth:620, position:"relative", zIndex:1 }}>
        {/* Step indicator (skip on landing) */}
        {step > 0 && step < 4 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:8 }}>
              {STEP_LABELS.slice(1,-1).map((l,i)=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%",
                    background:i+1<step?T.accent:i+1===step?T.accent:"transparent",
                    border:`2px solid ${i+1<=step?T.accent:T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:800, color:i+1<=step?"#000":T.t3,
                    transition:"all 0.3s" }}>{i+1}</div>
                  <span style={{ fontSize:10, color:i+1===step?T.accent:T.t3,
                    fontFamily:"'Syne',sans-serif" }}>{l}</span>
                  {i < STEP_LABELS.length-3 && <span style={{ color:T.border, fontSize:12 }}>›</span>}
                </div>
              ))}
            </div>
            <div style={{ height:2, borderRadius:1, background:T.border }}>
              <div style={{ height:"100%", borderRadius:1,
                background:`linear-gradient(90deg,${T.accent},${T.purple})`,
                width:`${((step-1)/(STEPS.length-2))*100}%`,
                transition:"width 0.4s ease",
                boxShadow:`0 0 8px ${T.accent}66` }}/>
            </div>
          </div>
        )}

        {/* Step content */}
        <div key={step} style={{ animation:"fadeUp 0.4s ease" }}>
          {STEPS[step].component}
        </div>
      </div>
    </div>
  );
}
