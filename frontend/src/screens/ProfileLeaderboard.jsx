import { useState } from "react";

const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829", bg4:"#181E32",
  border:"#1C2138", border2:"#242A42",
  t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const fmt$ = (n) => n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${Number(n).toFixed(2)}`;
const fmtN = (n) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);
const addr = (a) => `${a.slice(0,6)}…${a.slice(-4)}`;

function Badge({ children, color=T.accent, small=false }) {
  return (
    <span style={{ padding:small?"1px 6px":"3px 10px", borderRadius:20,
      background:`${color}18`, border:`1px solid ${color}33`,
      color, fontSize:small?9:10, fontWeight:700, letterSpacing:"0.05em",
      fontFamily:"'Syne',sans-serif", whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function Avatar({ seed, size=40, ring=null, level=null }) {
  const colors = [T.accent,T.green,T.red,T.gold,T.purple,T.cyan,"#FF6B35","#00B4D8"];
  const names  = ["CW","DX","TR","AM","KL","PF","ZR","BM"];
  const c = colors[seed%colors.length];
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%",
        background:`linear-gradient(135deg,${c}33,${c}11)`,
        border:`2px solid ${ring||c}55`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:size*0.32, fontWeight:800, color:c, fontFamily:"'Syne',sans-serif" }}>
        {names[seed%names.length]}
      </div>
      {level && (
        <div style={{ position:"absolute", bottom:-2, right:-2, width:16, height:16,
          borderRadius:"50%", background:T.gold, border:`2px solid ${T.bg1}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:8, fontWeight:800, color:"#000" }}>{level}</div>
      )}
    </div>
  );
}

function MiniChart({ values, color, height=36 }) {
  const W=80,H=height,pad=3;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const pts=values.map((v,i)=>`${pad+(i/(values.length-1))*(W-pad*2)},${H-pad-(v-min)/range*(H-pad*2)}`).join(" ");
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id={`mg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pad},${H-pad} ${pts} ${W-pad},${H-pad}`} fill={`url(#mg${color.slice(1)})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function StatBox({ label, value, color=T.t1, sub=null }) {
  return (
    <div style={{ background:T.bg2, borderRadius:10, padding:"12px 14px",
      border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
        letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:800, color, fontFamily:"'JetBrains Mono',monospace",
        lineHeight:1 }}>{value}</div>
      {sub&&<div style={{ fontSize:10, color:T.t3, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ── LEADERBOARD TRADERS DATA ───────────────────────────────────────────────
const TRADERS = [
  { rank:1,  seed:0, name:"CryptoWolf",  addr:"0x4f3a...8b2c", pnl:284200, pnlPct:284,  winRate:74, trades:312, followers:12400, vol:4820000, badge:"👑", verified:true,  streak:14 },
  { rank:2,  seed:2, name:"TRex",        addr:"0x7b1a...9f4c", pnl:187500, pnlPct:187,  winRate:71, trades:248, followers:8900,  vol:3210000, badge:"🥈", verified:true,  streak:9  },
  { rank:3,  seed:4, name:"KryptoLisa",  addr:"0x5e9d...2c7f", pnl:142100, pnlPct:142,  winRate:68, trades:198, followers:6200,  vol:2940000, badge:"🥉", verified:true,  streak:7  },
  { rank:4,  seed:1, name:"DexTrader",   addr:"0x9c2f...3d1e", pnl:98400,  pnlPct:98,   winRate:65, trades:421, followers:4100,  vol:1820000, badge:"",   verified:false, streak:4  },
  { rank:5,  seed:3, name:"ArbiMax",     addr:"0x2d8e...7a3b", pnl:76200,  pnlPct:76,   winRate:62, trades:187, followers:3800,  vol:1440000, badge:"",   verified:false, streak:6  },
  { rank:6,  seed:5, name:"PetraFX",     addr:"0x8c4d...1f2a", pnl:64800,  pnlPct:64,   winRate:69, trades:156, followers:2900,  vol:1210000, badge:"",   verified:true,  streak:3  },
  { rank:7,  seed:6, name:"ZeroRisk",    addr:"0x3e1f...5c8d", pnl:51200,  pnlPct:51,   winRate:58, trades:284, followers:2100,  vol:980000,  badge:"",   verified:false, streak:2  },
  { rank:8,  seed:7, name:"BitMaster",   addr:"0x6a2b...4e9c", pnl:44700,  pnlPct:44,   winRate:61, trades:132, followers:1800,  vol:840000,  badge:"",   verified:false, streak:5  },
  { rank:9,  seed:0, name:"AltSeason",   addr:"0x1b8e...7d3f", pnl:38100,  pnlPct:38,   winRate:56, trades:94,  followers:1400,  vol:720000,  badge:"",   verified:false, streak:1  },
  { rank:10, seed:2, name:"ForexQueen",  addr:"0x9d5c...2a1b", pnl:31400,  pnlPct:31,   winRate:63, trades:211, followers:1200,  vol:610000,  badge:"",   verified:true,  streak:8  },
];

const DEMO_POSTS = [
  { id:1, text:"Just hit $284K in profits this month. Gold long at 2280 was the play 🔥", likes:284, ts:Date.now()-3600000, trade:{sym:"XAU/USD",side:"long",pnl:48200,pnlPct:24.1} },
  { id:2, text:"BTC break of 67K confirmed. Still holding my 10x long. Targets at 72K, 76K, 84K.", likes:197, ts:Date.now()-86400000, trade:{sym:"BTC/USD",side:"long",pnl:31400,pnlPct:15.7} },
  { id:3, text:"Forex is criminally underrated on-chain. EUR/USD 50x leverage, Chainlink feed, no spread manipulation. This is the future.", likes:142, ts:Date.now()-172800000, trade:null },
];

const ago = (ms) => { const s=(Date.now()-ms)/1000; if(s<60)return `${~~s}s`; if(s<3600)return `${~~(s/60)}m`; if(s<86400)return `${~~(s/3600)}h`; return `${~~(s/86400)}d`; };

// ── PROFILE PAGE ───────────────────────────────────────────────────────────
function ProfilePage({ trader, onBack }) {
  const [tab, setTab] = useState("posts");
  const chartData = [12000,18000,15000,24000,21000,32000,28000,38000,42000,48000,44000,52000];
  const isOwn = trader.rank === 1;

  return (
    <div style={{ height:"100%", overflowY:"auto" }}>
      {/* Back */}
      {onBack && (
        <button onClick={onBack} style={{ padding:"6px 14px", borderRadius:7, border:`1px solid ${T.border}`,
          background:"transparent", color:T.t3, fontSize:12, cursor:"pointer", marginBottom:12,
          fontFamily:"'Syne',sans-serif" }}>← Back to Leaderboard</button>
      )}

      {/* Cover + avatar */}
      <div style={{ borderRadius:16, overflow:"hidden", marginBottom:16,
        border:`1px solid ${T.border}`, background:T.bg1 }}>
        {/* Cover gradient */}
        <div style={{ height:120, background:`linear-gradient(135deg,${T.bg3},${T.accent}22,${T.purple}11)`,
          position:"relative" }}>
          <div style={{ position:"absolute", bottom:-36, left:24 }}>
            <Avatar seed={trader.seed} size={72} level={trader.rank} ring={T.gold} />
          </div>
          {isOwn && (
            <button style={{ position:"absolute", top:12, right:12, padding:"6px 14px",
              borderRadius:7, border:`1px solid ${T.border2}`, background:`${T.bg2}CC`,
              color:T.t2, fontSize:11, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
              Edit Profile
            </button>
          )}
        </div>

        {/* Info bar */}
        <div style={{ padding:"44px 24px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:22, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif" }}>
                  {trader.name}
                </span>
                {trader.verified && <span style={{ color:T.accent }}>✓</span>}
                <Badge color={T.gold}>{trader.badge||`#${trader.rank}`}</Badge>
                {trader.streak > 5 && <Badge color={T.red} small>🔥 {trader.streak}d streak</Badge>}
              </div>
              <div style={{ color:T.t3, fontSize:12, marginTop:4,
                fontFamily:"'JetBrains Mono',monospace" }}>{trader.addr}</div>
              <div style={{ display:"flex", gap:16, marginTop:8, fontSize:12, color:T.t3 }}>
                <span><strong style={{color:T.t1}}>{fmtN(trader.followers)}</strong> followers</span>
                <span><strong style={{color:T.t1}}>248</strong> following</span>
                <span><strong style={{color:T.t1}}>{trader.trades}</strong> trades</span>
              </div>
            </div>
            {!isOwn && (
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ padding:"9px 20px", borderRadius:8, border:"none",
                  background:`linear-gradient(135deg,${T.accent},${T.purple})`,
                  color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif", boxShadow:`0 4px 16px ${T.accent}44` }}>
                  Follow
                </button>
                <button style={{ padding:"9px 20px", borderRadius:8, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.t2, fontSize:12, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif" }}>Copy Trades</button>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:1,
          borderTop:`1px solid ${T.border}` }}>
          {[
            ["Total P&L",   fmt$(trader.pnl),          T.green],
            ["Return",      `+${trader.pnlPct}%`,       T.green],
            ["Win Rate",    `${trader.winRate}%`,        T.accent],
            ["Volume",      fmt$(trader.vol),            T.t1],
            ["Rank",        `#${trader.rank}`,           T.gold],
          ].map(([k,v,c],i) => (
            <div key={k} style={{ padding:"14px 16px", textAlign:"center",
              borderRight:i<4?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:16, fontWeight:800, color:c,
                fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PnL Chart */}
      <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
        padding:"16px 20px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif" }}>
            CUMULATIVE P&L
          </span>
          <div style={{ display:"flex", gap:4 }}>
            {["1W","1M","3M","1Y"].map(t=>(
              <button key={t} style={{ padding:"3px 10px", borderRadius:5,
                border:"none", background:t==="3M"?`${T.accent}22`:"transparent",
                color:t==="3M"?T.accent:T.t3, fontSize:10, cursor:"pointer",
                fontFamily:"'Syne',sans-serif" }}>{t}</button>
            ))}
          </div>
        </div>
        {/* Simple SVG area chart */}
        <div style={{ width:"100%", height:120, position:"relative" }}>
          <svg width="100%" height="120" viewBox="0 0 600 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.green} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={T.green} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {(() => {
              const min=Math.min(...chartData), max=Math.max(...chartData), range=max-min;
              const pts=chartData.map((v,i)=>`${i/(chartData.length-1)*580+10},${110-(v-min)/range*90}`).join(" ");
              return <>
                <polygon points={`10,110 ${pts} ${580+(chartData.length-1)/(chartData.length-1)*0},110`}
                  fill="url(#pnlGrad)"/>
                <polyline points={pts} fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round"/>
                {chartData.map((v,i) => {
                  const x=i/(chartData.length-1)*580+10, y=110-(v-min)/range*90;
                  return <circle key={i} cx={x} cy={y} r="3" fill={T.green} opacity="0.6"/>;
                })}
              </>;
            })()}
          </svg>
          <div style={{ position:"absolute", top:4, left:8, fontSize:10, color:T.t3 }}>
            ${chartData[0].toLocaleString()}
          </div>
          <div style={{ position:"absolute", top:4, right:8, fontSize:12, color:T.green,
            fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>
            +{fmt$(chartData[chartData.length-1]-chartData[0])}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:12, background:T.bg1,
        borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
        {[["posts","Posts"],["trades","Trades"],["stats","Stats"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"7px 0", borderRadius:7, border:"none", cursor:"pointer",
            background: tab===id ? T.accent : "transparent",
            color: tab===id ? "#000" : T.t3,
            fontSize:11, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{label}</button>
        ))}
      </div>

      {/* Posts tab */}
      {tab==="posts" && DEMO_POSTS.map(p => (
        <div key={p.id} style={{ background:T.bg1, borderRadius:12, border:`1px solid ${T.border}`,
          padding:"14px 16px", marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Avatar seed={trader.seed} size={28}/>
              <span style={{ fontWeight:700, fontSize:12, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{trader.name}</span>
            </div>
            <span style={{ fontSize:10, color:T.t3 }}>{ago(p.ts)}</span>
          </div>
          <div style={{ fontSize:13, color:T.t2, lineHeight:1.6, fontFamily:"'Outfit',sans-serif",
            marginBottom: p.trade?10:0 }}>{p.text}</div>
          {p.trade && (
            <div style={{ background:T.bg3, borderRadius:8, padding:"10px 12px",
              border:`1px solid ${T.green}22` }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{p.trade.sym}</span>
                  <Badge color={p.trade.side==="long"?T.green:T.red} small>{p.trade.side.toUpperCase()}</Badge>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:T.green, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>+{fmt$(p.trade.pnl)}</div>
                  <div style={{ color:`${T.green}88`, fontSize:10 }}>+{p.trade.pnlPct}%</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:12, marginTop:10, fontSize:11, color:T.t3 }}>
            <span>♡ {p.likes}</span><span>💬 reply</span><span>↗ share</span>
          </div>
        </div>
      ))}

      {/* Trades tab */}
      {tab==="trades" && (
        <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Market","Side","Size","Entry","P&L","Date"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:9,
                  color:T.t3, fontFamily:"'Syne',sans-serif", letterSpacing:"0.1em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                {sym:"BTC/USD",side:"long", size:50000,entry:64200,pnl:31400,pct:15.7,date:"Mar 8"},
                {sym:"XAU/USD",side:"long", size:100000,entry:2298,pnl:48200,pct:24.1,date:"Mar 5"},
                {sym:"ETH/USD",side:"short",size:30000,entry:3820,pnl:-4200,pct:-2.1,date:"Mar 3"},
                {sym:"EUR/USD",side:"long", size:50000,entry:1.0821,pnl:2840,pct:1.4, date:"Mar 1"},
                {sym:"SOL/USD",side:"long", size:20000,entry:155,pnl:8400,pct:21.5,  date:"Feb 28"},
              ].map((t,i)=>(
                <tr key={i} style={{ borderBottom:`1px solid ${T.border}11` }}>
                  <td style={{ padding:"10px 14px", fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif", fontSize:12 }}>{t.sym}</td>
                  <td style={{ padding:"10px 14px" }}><Badge color={t.side==="long"?T.green:T.red} small>{t.side.toUpperCase()}</Badge></td>
                  <td style={{ padding:"10px 14px", color:T.t2, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{fmt$(t.size,0)}</td>
                  <td style={{ padding:"10px 14px", color:T.t2, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{t.entry > 100 ? t.entry.toLocaleString("en",{minimumFractionDigits:2}) : t.entry.toFixed(4)}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:12,
                      color:t.pnl>=0?T.green:T.red }}>{t.pnl>=0?"+":""}{fmt$(t.pnl)}</div>
                    <div style={{ fontSize:10, color:t.pnl>=0?`${T.green}88`:`${T.red}88` }}>{t.pnl>=0?"+":""}{t.pct}%</div>
                  </td>
                  <td style={{ padding:"10px 14px", color:T.t3, fontSize:11 }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats tab */}
      {tab==="stats" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[
            {label:"Win Rate",     value:`${trader.winRate}%`,     color:T.green},
            {label:"Total Trades", value:String(trader.trades),    color:T.accent},
            {label:"Best Trade",   value:"+$48,200",               color:T.green},
            {label:"Worst Trade",  value:"-$4,200",                color:T.red},
            {label:"Avg Win",      value:"+$8,420",                color:T.green},
            {label:"Avg Loss",     value:"-$2,140",                color:T.red},
            {label:"Profit Factor",value:"3.94",                   color:T.gold},
            {label:"Sharpe Ratio", value:"2.84",                   color:T.cyan},
            {label:"Max Drawdown", value:"8.4%",                   color:T.t2},
          ].map(s=><StatBox key={s.label} {...s}/>)}
        </div>
      )}
    </div>
  );
}

// ── LEADERBOARD ────────────────────────────────────────────────────────────
function LeaderboardList({ onSelect }) {
  const [period, setPeriod] = useState("monthly");
  const [cat, setCat]       = useState("pnl");
  const [hovered, setHovered] = useState(null);

  const RANK_COLORS = ["#FFB800","#C0C0C0","#CD7F32"];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      {/* Controls */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:2, background:T.bg1, borderRadius:8,
          padding:3, border:`1px solid ${T.border}` }}>
          {[["daily","24H"],["weekly","7D"],["monthly","30D"],["alltime","All"]].map(([id,label])=>(
            <button key={id} onClick={()=>setPeriod(id)} style={{
              padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer",
              background:period===id?T.accent:"transparent",
              color:period===id?"#000":T.t3,
              fontSize:11, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:2, background:T.bg1, borderRadius:8,
          padding:3, border:`1px solid ${T.border}` }}>
          {[["pnl","P&L"],["pct","Return %"],["vol","Volume"],["winrate","Win Rate"]].map(([id,label])=>(
            <button key={id} onClick={()=>setCat(id)} style={{
              padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer",
              background:cat===id?`${T.purple}22`:"transparent",
              color:cat===id?T.purple:T.t3,
              fontSize:11, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.1fr 1fr", gap:8, marginBottom:16, alignItems:"flex-end" }}>
        {[TRADERS[1], TRADERS[0], TRADERS[2]].map((t, posIdx) => {
          const ranks = [1,0,2];
          const actualRank = ranks[posIdx];
          const heights = [140, 160, 130];
          const rc = RANK_COLORS[actualRank];
          return (
            <div key={t.rank} onClick={()=>onSelect(t)}
              style={{ background:`linear-gradient(180deg,${rc}11,${T.bg2})`,
                borderRadius:14, border:`1px solid ${rc}33`, padding:"16px 12px",
                textAlign:"center", cursor:"pointer", height:heights[posIdx],
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"flex-end", transition:"transform 0.2s",
                transform:hovered===t.rank?"translateY(-4px)":"none" }}
              onMouseEnter={()=>setHovered(t.rank)}
              onMouseLeave={()=>setHovered(null)}>
              <div style={{ fontSize:actualRank===0?"22px":"16px", marginBottom:4 }}>{t.badge||`#${t.rank}`}</div>
              <Avatar seed={t.seed} size={actualRank===0?44:36} ring={rc}/>
              <div style={{ fontSize:12, fontWeight:800, color:T.t1, marginTop:8,
                fontFamily:"'Syne',sans-serif" }}>{t.name}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.green, marginTop:2,
                fontFamily:"'JetBrains Mono',monospace" }}>+{fmt$(t.pnl)}</div>
              <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>{fmtN(t.followers)} followers</div>
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <div style={{ flex:1, overflowY:"auto", background:T.bg1, borderRadius:14,
        border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:"40px 1fr 90px 90px 80px 80px 60px",
          gap:0, padding:"8px 16px", borderBottom:`1px solid ${T.border}`,
          fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
          letterSpacing:"0.1em", textTransform:"uppercase" }}>
          <span>#</span><span>TRADER</span><span>P&L</span>
          <span>RETURN</span><span>WIN%</span><span>VOLUME</span><span>TRADES</span>
        </div>
        {TRADERS.map((t,i)=>(
          <div key={t.rank} onClick={()=>onSelect(t)}
            style={{ display:"grid",
              gridTemplateColumns:"40px 1fr 90px 90px 80px 80px 60px",
              gap:0, padding:"12px 16px",
              borderBottom:i<TRADERS.length-1?`1px solid ${T.border}11`:"none",
              cursor:"pointer", transition:"background 0.15s",
              background:hovered===t.rank?T.bg2:"transparent",
              animation:`fadeUp 0.3s ease ${i*40}ms both` }}
            onMouseEnter={()=>setHovered(t.rank)}
            onMouseLeave={()=>setHovered(null)}>
            <div style={{ display:"flex", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:800,
                color: t.rank<=3 ? RANK_COLORS[t.rank-1] : T.t3,
                fontFamily:"'JetBrains Mono',monospace" }}>{t.rank}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              <Avatar seed={t.seed} size={32}/>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1,
                  fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                  {t.name}
                  {t.verified && <span style={{ color:T.accent, fontSize:10 }}>✓</span>}
                  {t.streak>=7 && <Badge small color={T.red}>🔥{t.streak}d</Badge>}
                </div>
                <div style={{ fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{t.addr}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:T.green,
                  fontFamily:"'JetBrains Mono',monospace" }}>+{fmt$(t.pnl)}</div>
                <MiniChart values={[1,1.3,1.1,1.5,1.4,1.7,1+t.pnlPct/200].map(v=>v*t.pnl/1.7)} color={T.green}/>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", fontSize:12, fontWeight:700,
              color:T.green, fontFamily:"'JetBrains Mono',monospace" }}>+{t.pnlPct}%</div>
            <div style={{ display:"flex", alignItems:"center", fontSize:12, color:T.accent,
              fontFamily:"'JetBrains Mono',monospace" }}>{t.winRate}%</div>
            <div style={{ display:"flex", alignItems:"center", fontSize:11, color:T.t2,
              fontFamily:"'JetBrains Mono',monospace" }}>{fmt$(t.vol)}</div>
            <div style={{ display:"flex", alignItems:"center", fontSize:11, color:T.t3,
              fontFamily:"'JetBrains Mono',monospace" }}>{t.trades}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────
export default function ProfileLeaderboard() {
  const [view, setView] = useState("leaderboard");
  const [selectedTrader, setSelectedTrader] = useState(null);

  const handleSelect = (trader) => {
    setSelectedTrader(trader);
    setView("profile");
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      fontFamily:"'Outfit',sans-serif",
      background:T.bg0, color:T.t1, padding:16 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1C2138;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:T.bg1,
        borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
        {[["leaderboard","🏆 Leaderboard"],["profile","👤 My Profile"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setView(id); if(id==="profile") setSelectedTrader(TRADERS[0]); }}
            style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
              background:view===id&&!(view==="profile"&&selectedTrader?.rank!==1)?T.accent:
                (id==="profile"&&view==="profile")?T.accent:"transparent",
              color:(view===id)?( view==="leaderboard"||selectedTrader?.rank===1?"#000":T.t3 ):T.t3,
              fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflow:"hidden" }}>
        {view==="leaderboard" && <LeaderboardList onSelect={handleSelect}/>}
        {view==="profile" && selectedTrader && (
          <ProfilePage trader={selectedTrader}
            onBack={selectedTrader.rank!==1?()=>{setView("leaderboard");setSelectedTrader(null)}:null}/>
        )}
      </div>
    </div>
  );
}
