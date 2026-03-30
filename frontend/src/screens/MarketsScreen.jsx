import { useState, useEffect, useRef } from "react";

const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829",
  border:"#1C2138", border2:"#242A42",
  t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const fmt$ = (n,d=2)=>n>=1e9?`$${(n/1e9).toFixed(2)}B`:n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${Number(n).toFixed(d)}`;
const fmtP = (p,sym="")=>{
  if(!p) return "—";
  if(sym.includes("JPY")||sym.includes("KRW")||p>1000) return p.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2});
  if(p>1) return p.toFixed(4);
  return p.toFixed(6);
};

const MARKETS = [
  // Crypto
  { id:1,  sym:"BTC/USD",  name:"Bitcoin",       cat:"crypto",  price:67432.10, ch24:2.34,  vol24:2840000000, oi:4820000000, lev:125, feed:"Chainlink+Pyth", icon:"₿",  color:"#F7931A", desc:"The original cryptocurrency" },
  { id:2,  sym:"ETH/USD",  name:"Ethereum",       cat:"crypto",  price:3521.44,  ch24:-0.87, vol24:1820000000, oi:2840000000, lev:125, feed:"Chainlink+Pyth", icon:"Ξ",  color:"#627EEA", desc:"Smart contract platform" },
  { id:3,  sym:"SOL/USD",  name:"Solana",         cat:"crypto",  price:182.33,   ch24:5.12,  vol24:840000000,  oi:1240000000, lev:125, feed:"Chainlink+Pyth", icon:"◎",  color:"#9945FF", desc:"High-speed L1 blockchain" },
  { id:4,  sym:"ARB/USD",  name:"Arbitrum",       cat:"crypto",  price:1.124,    ch24:3.44,  vol24:380000000,  oi:520000000,  lev:100, feed:"Chainlink+Pyth", icon:"A",  color:"#12AAFF", desc:"Ethereum L2 scaling solution" },
  { id:5,  sym:"BNB/USD",  name:"BNB",            cat:"crypto",  price:412.88,   ch24:-1.22, vol24:620000000,  oi:780000000,  lev:75,  feed:"Chainlink+Pyth", icon:"B",  color:"#F3BA2F", desc:"Binance native token" },
  { id:6,  sym:"AVAX/USD", name:"Avalanche",      cat:"crypto",  price:38.44,    ch24:4.18,  vol24:280000000,  oi:420000000,  lev:75,  feed:"Chainlink+Pyth", icon:"A",  color:"#E84142", desc:"Fast finality L1" },
  { id:7,  sym:"LINK/USD", name:"Chainlink",      cat:"crypto",  price:14.88,    ch24:1.84,  vol24:180000000,  oi:240000000,  lev:50,  feed:"Chainlink+Pyth", icon:"⬡",  color:"#375BD2", desc:"Decentralised oracle network" },
  { id:8,  sym:"DOGE/USD", name:"Dogecoin",       cat:"crypto",  price:0.1832,   ch24:8.44,  vol24:420000000,  oi:680000000,  lev:75,  feed:"Chainlink+Pyth", icon:"Ð",  color:"#C3A634", desc:"The original memecoin" },
  { id:9,  sym:"WIF/USD",  name:"dogwifhat",      cat:"crypto",  price:2.841,    ch24:12.44, vol24:240000000,  oi:180000000,  lev:50,  feed:"Pyth",           icon:"🐶", color:"#9945FF", desc:"Solana memecoin" },
  // Forex major
  { id:10, sym:"EUR/USD",  name:"Euro / Dollar",  cat:"forex",   price:1.08542,  ch24:0.12,  vol24:6400000000, oi:8200000000, lev:50,  feed:"Chainlink",      icon:"€",  color:"#0052B4", desc:"World's most traded pair" },
  { id:11, sym:"GBP/USD",  name:"Pound / Dollar", cat:"forex",   price:1.27134,  ch24:-0.08, vol24:3200000000, oi:4100000000, lev:50,  feed:"Chainlink",      icon:"£",  color:"#CF142B", desc:"Cable — Sterling vs Dollar" },
  { id:12, sym:"USD/JPY",  name:"Dollar / Yen",   cat:"forex",   price:151.234,  ch24:0.34,  vol24:4800000000, oi:6200000000, lev:50,  feed:"Chainlink",      icon:"¥",  color:"#BC002D", desc:"Dollar vs Japanese Yen" },
  { id:13, sym:"USD/CHF",  name:"Dollar / Franc", cat:"forex",   price:0.89812,  ch24:-0.14, vol24:1800000000, oi:2400000000, lev:50,  feed:"Chainlink",      icon:"Fr", color:"#FF0000", desc:"Dollar vs Swiss Franc" },
  { id:14, sym:"USD/CAD",  name:"Dollar / CAD",   cat:"forex",   price:1.35288,  ch24:0.08,  vol24:1400000000, oi:1800000000, lev:50,  feed:"Chainlink",      icon:"$",  color:"#FF0000", desc:"Dollar vs Canadian Dollar" },
  { id:15, sym:"AUD/USD",  name:"Aussie / Dollar", cat:"forex",  price:0.65412,  ch24:-0.22, vol24:1200000000, oi:1600000000, lev:50,  feed:"Chainlink",      icon:"A$", color:"#00843D", desc:"Australian Dollar vs USD" },
  { id:16, sym:"NZD/USD",  name:"Kiwi / Dollar",  cat:"forex",   price:0.60124,  ch24:0.18,  vol24:600000000,  oi:800000000,  lev:50,  feed:"Chainlink",      icon:"NZ", color:"#00247D", desc:"New Zealand Dollar vs USD" },
  // Forex minor/cross
  { id:17, sym:"EUR/GBP",  name:"Euro / Pound",   cat:"minor",   price:0.85432,  ch24:0.05,  vol24:800000000,  oi:1200000000, lev:30,  feed:"Derived",        icon:"€£", color:"#6B7AFF", desc:"Euro vs Sterling cross" },
  { id:18, sym:"EUR/JPY",  name:"Euro / Yen",     cat:"minor",   price:163.841,  ch24:0.42,  vol24:600000000,  oi:900000000,  lev:30,  feed:"Derived",        icon:"€¥", color:"#6B7AFF", desc:"Euro vs Japanese Yen" },
  { id:19, sym:"GBP/JPY",  name:"Pound / Yen",    cat:"minor",   price:192.244,  ch24:0.28,  vol24:480000000,  oi:720000000,  lev:30,  feed:"Derived",        icon:"£¥", color:"#6B7AFF", desc:"Sterling vs Yen — the Dragon" },
  { id:20, sym:"EUR/CHF",  name:"Euro / Franc",   cat:"minor",   price:0.97412,  ch24:-0.08, vol24:360000000,  oi:540000000,  lev:30,  feed:"Derived",        icon:"€Fr",color:"#6B7AFF", desc:"Euro vs Swiss Franc" },
  // Exotics
  { id:21, sym:"USD/TRY",  name:"Dollar / Lira",  cat:"exotic",  price:32.144,   ch24:0.22,  vol24:840000000,  oi:1200000000, lev:20,  feed:"Pyth+Guardian",  icon:"₺",  color:"#E30A17", desc:"Dollar vs Turkish Lira" },
  { id:22, sym:"USD/ZAR",  name:"Dollar / Rand",  cat:"exotic",  price:18.924,   ch24:-0.14, vol24:320000000,  oi:480000000,  lev:20,  feed:"Pyth+Guardian",  icon:"R",  color:"#007A4D", desc:"Dollar vs South African Rand" },
  { id:23, sym:"USD/MXN",  name:"Dollar / Peso",  cat:"exotic",  price:17.284,   ch24:0.08,  vol24:480000000,  oi:720000000,  lev:20,  feed:"Pyth+Guardian",  icon:"$M", color:"#006847", desc:"Dollar vs Mexican Peso" },
  { id:24, sym:"USD/INR",  name:"Dollar / Rupee", cat:"exotic",  price:83.422,   ch24:0.04,  vol24:640000000,  oi:960000000,  lev:20,  feed:"Pyth+Guardian",  icon:"₹",  color:"#FF9933", desc:"Dollar vs Indian Rupee" },
  // Metals
  { id:25, sym:"XAU/USD",  name:"Gold",           cat:"metals",  price:2341.50,  ch24:0.88,  vol24:1840000000, oi:2800000000, lev:100, feed:"Chainlink+Pyth", icon:"Au", color:"#FFD700", desc:"Gold — the ultimate safe haven" },
  { id:26, sym:"XAG/USD",  name:"Silver",         cat:"metals",  price:27.432,   ch24:1.22,  vol24:420000000,  oi:680000000,  lev:50,  feed:"Chainlink+Pyth", icon:"Ag", color:"#C0C0C0", desc:"Silver — industrial & monetary metal" },
  { id:27, sym:"XPT/USD",  name:"Platinum",       cat:"metals",  price:984.20,   ch24:-0.44, vol24:180000000,  oi:280000000,  lev:25,  feed:"Pyth",           icon:"Pt", color:"#E5E4E2", desc:"Platinum — rarer than gold" },
  { id:28, sym:"XPD/USD",  name:"Palladium",      cat:"metals",  price:1024.80,  ch24:2.14,  vol24:120000000,  oi:180000000,  lev:25,  feed:"Pyth",           icon:"Pd", color:"#CED0DD", desc:"Palladium — automotive catalysts" },
  // Commodities
  { id:29, sym:"WTI/USD",  name:"Crude Oil WTI",  cat:"commod",  price:78.432,   ch24:-1.44, vol24:2400000000, oi:3600000000, lev:20,  feed:"Pyth",           icon:"⛽", color:"#FF6B35", desc:"West Texas Intermediate crude" },
  { id:30, sym:"BRENT/USD",name:"Brent Crude",    cat:"commod",  price:82.140,   ch24:-1.28, vol24:1800000000, oi:2800000000, lev:20,  feed:"Pyth",           icon:"🛢", color:"#FF6B35", desc:"North Sea Brent crude" },
  { id:31, sym:"NATGAS",   name:"Natural Gas",    cat:"commod",  price:1.844,    ch24:3.44,  vol24:480000000,  oi:720000000,  lev:20,  feed:"Pyth",           icon:"🔥", color:"#4FC3F7", desc:"Natural gas futures" },
];

const CATS = [
  { id:"all",    label:"All Markets", count:MARKETS.length },
  { id:"crypto", label:"Crypto",      count:MARKETS.filter(m=>m.cat==="crypto").length },
  { id:"forex",  label:"Forex Major", count:MARKETS.filter(m=>m.cat==="forex").length },
  { id:"minor",  label:"Crosses",     count:MARKETS.filter(m=>m.cat==="minor").length },
  { id:"exotic", label:"Exotic FX",   count:MARKETS.filter(m=>m.cat==="exotic").length },
  { id:"metals", label:"Metals",      count:MARKETS.filter(m=>m.cat==="metals").length },
  { id:"commod", label:"Commodities", count:MARKETS.filter(m=>m.cat==="commod").length },
];

function useTickPrice(base) {
  const [price, setPrice] = useState(base);
  const [dir, setDir]     = useState(null);
  const ref = useRef(base);
  useEffect(() => {
    const id = setInterval(() => {
      const delta = (0-0.499)*ref.current*0.0004;
      const next  = Math.max(ref.current+delta, 0.0001);
      setDir(next>ref.current?"up":"down");
      ref.current = next; setPrice(next);
      setTimeout(()=>setDir(null), 350);
    }, 900+0*400);
    return ()=>clearInterval(id);
  }, [base]);
  return [price, dir];
}

function Sparkline({ seed, color, height=36, width=80 }) {
  const data = Array.from({length:20},(_,i)=>{
    let v=100; for(let j=0;j<i;j++) v+=(Math.sin(seed+j*0.7)+0-0.5)*3;
    return v;
  });
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const W=width,H=height,pad=2;
  const pts=data.map((v,i)=>`${pad+i/(data.length-1)*(W-pad*2)},${H-pad-(v-min)/range*(H-pad*2)}`).join(" ");
  return (
    <svg width={W} height={H} style={{display:"block"}}>
      <defs>
        <linearGradient id={`sp${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pad},${H-pad} ${pts} ${W-pad},${H-pad}`} fill={`url(#sp${seed})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MarketCard({ market }) {
  const [price, dir] = useTickPrice(market.price);
  const isUp = market.ch24 >= 0;
  const color = isUp ? T.green : T.red;
  return (
    <div style={{ background:T.bg2, borderRadius:12, border:`1px solid ${T.border}`,
      padding:"14px 16px", cursor:"pointer", transition:"all 0.2s",
      animation:"fadeUp 0.3s ease both" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=market.color+"66"; e.currentTarget.style.transform="translateY(-2px)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform="none"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${market.color}18`,
            border:`1px solid ${market.color}33`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:13, color:market.color, fontWeight:800 }}>
            {market.icon}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:13, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{market.sym}</div>
            <div style={{ fontSize:10, color:T.t3 }}>{market.name}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:14, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
            color: dir==="up"?T.green:dir==="down"?T.red:T.t1, transition:"color 0.3s" }}>
            {fmtP(price, market.sym)}
          </div>
          <div style={{ fontSize:11, color, fontWeight:700 }}>{isUp?"+":""}{market.ch24.toFixed(2)}%</div>
        </div>
      </div>
      <Sparkline seed={market.id} color={color} />
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:8,
        fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>
        <span>Vol {fmt$(market.vol24)}</span>
        <span style={{ color:T.accent }}>Up to {market.lev}×</span>
      </div>
    </div>
  );
}

function MarketRow({ market, idx }) {
  const [price, dir] = useTickPrice(market.price);
  const isUp = market.ch24 >= 0;
  const color = isUp ? T.green : T.red;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"32px 200px 140px 90px 120px 120px 90px 80px",
      gap:0, padding:"11px 16px", borderBottom:`1px solid ${T.border}11`,
      cursor:"pointer", transition:"background 0.15s", alignItems:"center",
      animation:`fadeUp 0.3s ease ${idx*30}ms both` }}
      onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{idx+1}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:`${market.color}18`,
          border:`1px solid ${market.color}33`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:12, color:market.color, fontWeight:800 }}>{market.icon}</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{market.sym}</div>
          <div style={{ fontSize:10, color:T.t3 }}>{market.name}</div>
        </div>
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600,
        color: dir==="up"?T.green:dir==="down"?T.red:T.t1, transition:"color 0.3s" }}>
        {fmtP(price, market.sym)}
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color }}>
        {isUp?"+":""}{market.ch24.toFixed(2)}%
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.t2 }}>
        {fmt$(market.vol24)}
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.t2 }}>
        {fmt$(market.oi)}
      </div>
      <div>
        <span style={{ padding:"2px 8px", borderRadius:4, background:`${T.accent}18`,
          color:T.accent, fontSize:10, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>
          {market.lev}×
        </span>
      </div>
      <div style={{ width:80 }}>
        <Sparkline seed={market.id} color={color} height={32} width={80}/>
      </div>
    </div>
  );
}

function MarketDetail({ market, onClose }) {
  const [price, dir] = useTickPrice(market.price);
  const isUp = market.ch24 >= 0;
  const color = isUp ? T.green : T.red;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex",
      alignItems:"center", justifyContent:"center",
      background:"rgba(6,8,15,0.85)", backdropFilter:"blur(8px)" }}
      onClick={onClose}>
      <div style={{ background:T.bg1, borderRadius:20, border:`1px solid ${market.color}44`,
        padding:"28px", width:"min(520px,90vw)", boxShadow:`0 40px 80px ${market.color}22`,
        animation:"fadeUp 0.3s ease" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:`${market.color}18`,
              border:`2px solid ${market.color}44`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:20, color:market.color, fontWeight:800 }}>{market.icon}</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{market.sym}</div>
              <div style={{ fontSize:12, color:T.t3 }}>{market.name} · {market.cat.toUpperCase()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            color:T.t3, fontSize:20, cursor:"pointer", padding:"4px 8px" }}>×</button>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
          <div style={{ fontSize:36, fontWeight:800, color:dir==="up"?T.green:dir==="down"?T.red:T.t1,
            fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>
            {fmtP(price, market.sym)}
          </div>
          <div style={{ fontSize:16, fontWeight:700, color }}>
            {isUp?"+":""}{market.ch24.toFixed(2)}% (24h)
          </div>
        </div>

        <Sparkline seed={market.id*3} color={color} height={80} width={460}/>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
          {[
            ["24h Volume",  fmt$(market.vol24)],
            ["Open Interest", fmt$(market.oi)],
            ["Max Leverage", `${market.lev}×`],
            ["Oracle", market.feed],
            ["Maker Fee", "0.02%"],
            ["Taker Fee", "0.05%"],
            ["Market Hours", market.cat==="crypto"?"24/7":"Mon–Fri"],
            ["Settlement", "USDC"],
          ].map(([k,v])=>(
            <div key={k} style={{ background:T.bg3, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1,
                fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:16, padding:"12px 14px", background:T.bg3, borderRadius:10,
          border:`1px solid ${T.border}`, fontSize:12, color:T.t3, lineHeight:1.6,
          fontFamily:"'Outfit',sans-serif" }}>
          {market.desc}. Settled in USDC on Arbitrum. Price feed via {market.feed}.
        </div>

        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button style={{ flex:1, padding:"12px 0", borderRadius:10, border:"none",
            background:`linear-gradient(135deg,${T.green},#00B880)`,
            color:"#000", fontSize:14, fontWeight:800, cursor:"pointer",
            fontFamily:"'Syne',sans-serif", boxShadow:`0 4px 20px ${T.green}44` }}>
            ▲ Long
          </button>
          <button style={{ flex:1, padding:"12px 0", borderRadius:10, border:"none",
            background:`linear-gradient(135deg,${T.red},#CC2040)`,
            color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
            fontFamily:"'Syne',sans-serif", boxShadow:`0 4px 20px ${T.red}44` }}>
            ▼ Short
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketsScreen() {
  const [cat,    setCat]    = useState("all");
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState("vol24");
  const [sortDir,setSortDir]= useState("desc");
  const [view,   setView]   = useState("list");
  const [detail, setDetail] = useState(null);

  const filtered = MARKETS
    .filter(m => (cat==="all"||m.cat===cat) && m.sym.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const mul = sortDir==="desc"?-1:1;
      return (a[sort]-b[sort])*mul;
    });

  const handleSort = (key) => {
    if(sort===key) setSortDir(d=>d==="desc"?"asc":"desc");
    else { setSort(key); setSortDir("desc"); }
  };

  const topMovers = [...MARKETS].sort((a,b)=>Math.abs(b.ch24)-Math.abs(a.ch24)).slice(0,5);
  const totalVol  = MARKETS.reduce((a,b)=>a+b.vol24, 0);
  const totalOI   = MARKETS.reduce((a,b)=>a+b.oi, 0);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      background:T.bg0, color:T.t1, padding:16, fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1C2138;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {detail && <MarketDetail market={detail} onClose={()=>setDetail(null)}/>}

      {/* Stats bar */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          ["Total Markets", String(MARKETS.length), T.accent],
          ["24h Volume",    fmt$(totalVol),          T.green],
          ["Open Interest", fmt$(totalOI),           T.gold],
          ["Max Leverage",  "125×",                  T.purple],
        ].map(([k,v,c])=>(
          <div key={k} style={{ background:T.bg1, borderRadius:10, padding:"10px 14px",
            border:`1px solid ${T.border}`, flex:1, minWidth:120 }}>
            <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{k}</div>
            <div style={{ fontSize:16, fontWeight:800, color:c,
              fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Top movers */}
      <div style={{ marginBottom:16, overflowX:"auto" }}>
        <div style={{ display:"flex", gap:8, minWidth:"max-content" }}>
          <div style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.1em", paddingRight:8, paddingTop:6, whiteSpace:"nowrap",
            borderRight:`1px solid ${T.border}`, marginRight:4 }}>🔥 TOP MOVERS</div>
          {topMovers.map(m=>{
            const isUp=m.ch24>=0; const color=isUp?T.green:T.red;
            return (
              <div key={m.id} onClick={()=>setDetail(m)} style={{ background:T.bg2, borderRadius:8,
                padding:"6px 12px", border:`1px solid ${color}22`, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=`${color}66`}
                onMouseLeave={e=>e.currentTarget.style.borderColor=`${color}22`}>
                <span style={{ color:m.color, fontWeight:800, fontSize:12 }}>{m.icon}</span>
                <span style={{ fontWeight:700, fontSize:12, color:T.t1,
                  fontFamily:"'Syne',sans-serif" }}>{m.sym}</span>
                <span style={{ fontWeight:700, fontSize:11, color,
                  fontFamily:"'JetBrains Mono',monospace" }}>{isUp?"+":""}{m.ch24.toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {/* Search */}
        <div style={{ position:"relative", flex:1, minWidth:160 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search markets…"
            style={{ width:"100%", background:T.bg1, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"8px 12px 8px 32px", color:T.t1, fontSize:12,
              outline:"none", boxSizing:"border-box" }}/>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:T.t3, fontSize:14 }}>🔍</span>
        </div>

        {/* Category pills */}
        <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
          {CATS.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)} style={{
              padding:"6px 12px", borderRadius:7, border:`1px solid ${cat===c.id?T.accent:T.border}`,
              background:cat===c.id?`${T.accent}18`:T.bg1,
              color:cat===c.id?T.accent:T.t3, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"'Syne',sans-serif", whiteSpace:"nowrap" }}>
              {c.label} <span style={{ opacity:0.5 }}>{c.count}</span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display:"flex", gap:2, background:T.bg1, borderRadius:7,
          padding:3, border:`1px solid ${T.border}` }}>
          {[["list","☰"],["grid","⊞"]].map(([id,icon])=>(
            <button key={id} onClick={()=>setView(id)} style={{
              padding:"5px 10px", borderRadius:5, border:"none", cursor:"pointer",
              background:view===id?T.accent:"transparent",
              color:view===id?"#000":T.t3, fontSize:14 }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* List header (list view) */}
      {view==="list" && (
        <div style={{ display:"grid",
          gridTemplateColumns:"32px 200px 140px 90px 120px 120px 90px 80px",
          gap:0, padding:"6px 16px", marginBottom:4,
          fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif", letterSpacing:"0.1em" }}>
          <span>#</span>
          <span>MARKET</span>
          {[["price","PRICE"],["ch24","24H %"],["vol24","VOLUME"],["oi","OPEN INT"],["lev","LEVERAGE"]].map(([k,label])=>(
            <button key={k} onClick={()=>handleSort(k)} style={{
              background:"none", border:"none", color:sort===k?T.accent:T.t3,
              fontSize:9, fontWeight:700, cursor:"pointer", textAlign:"left",
              fontFamily:"'Syne',sans-serif", letterSpacing:"0.1em",
              display:"flex", alignItems:"center", gap:3, padding:0 }}>
              {label} {sort===k ? (sortDir==="desc"?"↓":"↑") : ""}
            </button>
          ))}
          <span>7D CHART</span>
        </div>
      )}

      {/* Markets */}
      <div style={{ flex:1, overflowY:"auto", background:T.bg1, borderRadius:14,
        border:`1px solid ${T.border}`, overflow:"hidden" }}>
        {view==="list" ? (
          filtered.map((m,i)=>(
            <div key={m.id} onClick={()=>setDetail(m)}>
              <MarketRow market={m} idx={i}/>
            </div>
          ))
        ) : (
          <div style={{ padding:16, display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
            {filtered.map(m=>(
              <div key={m.id} onClick={()=>setDetail(m)}>
                <MarketCard market={m}/>
              </div>
            ))}
          </div>
        )}
        {filtered.length===0 && (
          <div style={{ padding:48, textAlign:"center", color:T.t3, fontSize:13 }}>
            No markets match "{search}"
          </div>
        )}
      </div>

      <div style={{ marginTop:8, fontSize:10, color:T.t3, textAlign:"right",
        fontFamily:"'JetBrains Mono',monospace" }}>
        {filtered.length} markets · Prices update every ~1s · Oracle: Chainlink + Pyth + Guardian
      </div>
    </div>
  );
}
