import { useState, useEffect, useRef } from "react";

// ─── Shared Design Tokens ──────────────────────────────────────────────────
const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829", bg4:"#181E32",
  border:"#1C2138", border2:"#242A42",
  t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#1C2138;border-radius:2px}
  input,textarea{color-scheme:dark}
  input::placeholder,textarea::placeholder{color:#2A3050}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px #5B7FFF33}50%{box-shadow:0 0 40px #5B7FFF66}}
  @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
  @keyframes countUp{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt$ = (n, dec=2) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${Number(n).toFixed(dec)}`;
const fmtN = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n);
const ago  = (ms) => { const s=(Date.now()-ms)/1000; if(s<60)return `${~~s}s`; if(s<3600)return `${~~(s/60)}m`; if(s<86400)return `${~~(s/3600)}h`; return `${~~(s/86400)}d`; };
const addr = (a) => `${a.slice(0,6)}…${a.slice(-4)}`;

function Avatar({ seed, size=36, ring=null }) {
  const colors = ["#5B7FFF","#00E5A0","#FF4060","#FFB800","#A855F7","#00D4FF"];
  const c = colors[seed % colors.length];
  const initials = ["CW","DX","TR","AM","KL","PF","ZR","BM"][seed % 8];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${c}22`,
      border:`2px solid ${ring||c}44`, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.3, fontWeight:700, color:c,
      fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function Badge({ children, color=T.accent, small=false }) {
  return (
    <span style={{ padding: small?"1px 6px":"3px 10px", borderRadius:20,
      background:`${color}18`, border:`1px solid ${color}33`,
      color, fontSize: small?9:10, fontWeight:700, fontFamily:"'Syne',sans-serif",
      letterSpacing:"0.05em", whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, color=T.accent, delay=0 }) {
  return (
    <div style={{ background:T.bg2, borderRadius:12, padding:"14px 16px",
      border:`1px solid ${T.border}`, animation:`fadeUp 0.4s ease ${delay}ms both` }}>
      <div style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
        letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace",
        lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.t3, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", color=T.accent, small=false, full=false, disabled=false }) {
  const bg = variant==="primary" ? `linear-gradient(135deg,${color},${color}cc)`
    : variant==="ghost" ? "transparent" : T.bg3;
  const border = variant==="primary" ? "none" : `1px solid ${color}44`;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full?"100%":"auto",
      padding: small?"6px 14px":"10px 20px",
      borderRadius:8, border, background: disabled?T.bg3:bg,
      color: variant==="primary"&&!disabled ? "#000" : color,
      fontSize: small?11:13, fontWeight:700, cursor: disabled?"not-allowed":"pointer",
      fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em",
      boxShadow: variant==="primary"&&!disabled ? `0 4px 20px ${color}44` : "none",
      opacity: disabled?0.4:1, transition:"all 0.2s", whiteSpace:"nowrap",
    }}
    onMouseEnter={e=>{ if(!disabled&&variant!=="primary") e.currentTarget.style.background=`${color}18` }}
    onMouseLeave={e=>{ if(!disabled&&variant!=="primary") e.currentTarget.style.background=variant==="outline"?T.bg3:"transparent" }}>
      {children}
    </button>
  );
}

function MiniChart({ values, color, height=40 }) {
  const W=120, H=height, pad=4;
  const min=Math.min(...values), max=Math.max(...values), range=max-min||1;
  const pts = values.map((v,i)=>`${pad+(i/(values.length-1))*(W-pad*2)},${H-pad-(v-min)/range*(H-pad*2)}`).join(" ");
  return (
    <svg width={W} height={H} style={{display:"block"}}>
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pad},${H-pad} ${pts} ${W-pad},${H-pad}`}
        fill={`url(#g${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL FEED
// ═══════════════════════════════════════════════════════════════════════════

const DEMO_POSTS = [
  { id:1, author:"CryptoWolf", seed:0, addr:"0x4f3a...8b2c", ts:Date.now()-180000, verified:true,
    text:"Just closed a 47% gain on BTC/USD after holding through the dip. The liquidation cascade was the entry signal I was waiting for. Patience > prediction. 🐺",
    trade:{ sym:"BTC/USD", side:"long", entry:64200, exit:94372, size:50000, pnl:15086, pnlPct:47.2, lev:10 },
    likes:284, comments:42, reposts:31, views:4820, tags:["BTC","Futures","TA"] },
  { id:2, author:"DexTrader", seed:1, addr:"0x9c2f...3d1e", ts:Date.now()-900000, verified:false,
    text:"EUR/USD forming a beautiful ascending triangle on the 4H. Targeting 1.0950 with SL at 1.0820. Forex on-chain is actually amazing — 50x lev with Chainlink price feeds, can't be manipulated.",
    trade:{ sym:"EUR/USD", side:"long", entry:1.08420, exit:null, size:25000, pnl:null, pnlPct:null, lev:50 },
    likes:97, comments:18, reposts:12, views:1340, tags:["Forex","EUR","Technical"] },
  { id:3, author:"TRex", seed:2, addr:"0x7b1a...9f4c", ts:Date.now()-3600000, verified:true,
    text:"Gold (XAU/USD) just broke 2400. This was the exact setup I posted 3 days ago. Inflation hedge thesis playing out perfectly. Now running at 100x with tight stops at 2375.",
    trade:{ sym:"XAU/USD", side:"long", entry:2298, exit:null, size:100000, pnl:null, pnlPct:null, lev:100 },
    likes:512, comments:88, reposts:64, views:9210, tags:["Gold","Macro","Inflation"] },
  { id:4, author:"ArbiMax", seed:3, addr:"0x2d8e...7a3b", ts:Date.now()-7200000, verified:false,
    text:"Stop hunting is real on retail platforms. On-chain perps can't do that — the price is the Chainlink feed, period. Finally trading with a clean conscience.",
    trade:null,
    likes:156, comments:33, reposts:22, views:2680, tags:["DeFi","Transparency"] },
  { id:5, author:"KryptoLisa", seed:4, addr:"0x5e9d...2c7f", ts:Date.now()-14400000, verified:true,
    text:"Passed my Wikicious 2-phase prop eval in 18 days. Now managing a $50K funded account. The evaluation is pure simulation — no real money at risk until you prove yourself. Incredibly fair system.",
    trade:{ sym:"SOL/USD", side:"long", entry:168, exit:198, size:50000, pnl:8928, pnlPct:17.8, lev:20 },
    likes:891, comments:124, reposts:98, views:18400, tags:["PropTrading","Funded","SOL"] },
];

function TradeCard({ trade, sym }) {
  if (!trade) return null;
  const isOpen = trade.exit === null;
  const isUp = isOpen ? true : trade.pnl >= 0;
  const color = isUp ? T.green : T.red;
  const fmt = (p) => p > 100 ? p.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2}) : p > 1 ? p.toFixed(4) : p.toFixed(6);
  return (
    <div style={{ background:T.bg3, borderRadius:10, padding:"12px 14px", marginTop:10,
      border:`1px solid ${color}22`, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontWeight:800, fontSize:14, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{trade.sym}</span>
            <Badge color={trade.side==="long"?T.green:T.red}>{trade.side==="long"?"▲ LONG":"▼ SHORT"}</Badge>
            <Badge color={T.accent} small>{trade.lev}×</Badge>
            {isOpen && <Badge color={T.gold} small>LIVE</Badge>}
          </div>
          <div style={{ display:"flex", gap:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
            <div><span style={{color:T.t3}}>Entry </span><span style={{color:T.t2}}>{fmt(trade.entry)}</span></div>
            {!isOpen && <div><span style={{color:T.t3}}>Exit </span><span style={{color:T.t2}}>{fmt(trade.exit)}</span></div>}
            <div><span style={{color:T.t3}}>Size </span><span style={{color:T.t2}}>{fmt$(trade.size,0)}</span></div>
          </div>
        </div>
        {!isOpen && trade.pnl !== null && (
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>
              {isUp?"+":""}{fmt$(trade.pnl)}
            </div>
            <div style={{ fontSize:12, color:`${color}99` }}>{isUp?"+":""}{trade.pnlPct.toFixed(2)}%</div>
          </div>
        )}
        {isOpen && (
          <div style={{ padding:"6px 12px", borderRadius:6, background:`${T.gold}11`,
            border:`1px solid ${T.gold}33`, fontSize:11, color:T.gold, fontWeight:700 }}>
            ● OPEN
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, onLike, onComment, onCopy }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const handleLike = () => {
    setLiked(v=>!v);
    setLikes(v => liked ? v-1 : v+1);
  };

  return (
    <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
      overflow:"hidden", animation:"fadeUp 0.4s ease both", marginBottom:10 }}>
      {/* Header */}
      <div style={{ padding:"14px 16px 0", display:"flex", alignItems:"flex-start", gap:12 }}>
        <Avatar seed={post.seed} size={40} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif", fontSize:14 }}>
              {post.author}
            </span>
            {post.verified && <span style={{ color:T.accent, fontSize:12 }}>✓</span>}
            <span style={{ color:T.t3, fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
              {addr(post.addr)}
            </span>
            <span style={{ color:T.t3, fontSize:11, marginLeft:"auto" }}>{ago(post.ts)}</span>
          </div>
          <div style={{ display:"flex", gap:4, marginTop:4, flexWrap:"wrap" }}>
            {post.tags.map(t => <Badge key={t} small color={T.t3}>#{t}</Badge>)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:"10px 16px", fontSize:14, color:T.t2, lineHeight:1.6,
        fontFamily:"'Outfit',sans-serif" }}>
        {post.text}
      </div>

      {/* Trade card */}
      {post.trade && (
        <div style={{ padding:"0 16px" }}>
          <TradeCard trade={post.trade} />
        </div>
      )}

      {/* Actions */}
      <div style={{ padding:"10px 16px 12px", display:"flex", alignItems:"center", gap:4, borderTop:`1px solid ${T.border}`, marginTop:12 }}>
        {[
          { icon: liked?"♥":"♡", label: fmtN(likes), color: liked?T.red:T.t3, action: handleLike },
          { icon:"💬", label: fmtN(post.comments), color:T.t3, action:()=>setShowComments(v=>!v) },
          { icon:"↗", label: fmtN(post.reposts), color:T.t3, action:()=>{} },
          { icon:"👁", label: fmtN(post.views), color:T.t3, action:()=>{} },
        ].map(({icon,label,color,action}) => (
          <button key={icon} onClick={action} style={{ display:"flex", alignItems:"center", gap:5,
            padding:"5px 10px", borderRadius:6, border:"none", background:"transparent",
            color, fontSize:12, cursor:"pointer", transition:"all 0.15s", fontFamily:"'Outfit',sans-serif" }}
            onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {post.trade && (
            <Btn small variant="outline" color={T.accent} onClick={()=>{}}>Copy Trade</Btn>
          )}
          <Btn small variant="ghost" color={T.t3} onClick={()=>{}}>Share</Btn>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"12px 16px",
          background:T.bg2 }}>
          <div style={{ display:"flex", gap:10 }}>
            <Avatar seed={7} size={28} />
            <div style={{ flex:1, display:"flex", gap:8 }}>
              <input value={comment} onChange={e=>setComment(e.target.value)}
                placeholder="Add a comment…"
                style={{ flex:1, background:T.bg3, border:`1px solid ${T.border2}`,
                  borderRadius:8, padding:"7px 12px", color:T.t1, fontSize:12,
                  outline:"none", fontFamily:"'Outfit',sans-serif" }} />
              <Btn small color={T.accent} onClick={()=>setComment("")}>Post</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Compose({ onPost }) {
  const [text, setText] = useState("");
  return (
    <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
      padding:"14px 16px", marginBottom:12 }}>
      <div style={{ display:"flex", gap:12 }}>
        <Avatar seed={7} size={38} />
        <div style={{ flex:1 }}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Share a trade insight, analysis, or call…"
            rows={3}
            style={{ width:"100%", background:T.bg3, border:`1px solid ${T.border2}`,
              borderRadius:10, padding:"10px 12px", color:T.t1, fontSize:13, resize:"none",
              outline:"none", fontFamily:"'Outfit',sans-serif", lineHeight:1.5 }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
            <div style={{ display:"flex", gap:8 }}>
              {["📊 Trade","📷 Chart","🔗 Link"].map(l=>(
                <button key={l} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.t3, fontSize:11, cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif" }}>{l}</button>
              ))}
            </div>
            <Btn color={T.accent} small onClick={()=>{onPost(text);setText("")}} disabled={!text.trim()}>
              Post
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialFeed() {
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [filter, setFilter] = useState("all");
  const FILTERS = ["all","trades","analysis","calls","following"];

  const handlePost = (text) => {
    if (!text.trim()) return;
    setPosts(p => [{
      id: Date.now(), author:"You", seed:7, addr:"0x4f3a...8b2c",
      ts:Date.now(), verified:false, text, trade:null,
      likes:0, comments:0, reposts:0, views:0, tags:[]
    }, ...p]);
  };

  return (
    <div style={{ display:"flex", gap:16, height:"100%", fontFamily:"'Outfit',sans-serif" }}>
      {/* Main feed */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Filter tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:12, background:T.bg1,
          borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
          {FILTERS.map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{
              flex:1, padding:"7px 0", borderRadius:7, border:"none", cursor:"pointer",
              background: filter===f ? T.accent : "transparent",
              color: filter===f ? "#000" : T.t3,
              fontSize:11, fontWeight:700, textTransform:"capitalize",
              fontFamily:"'Syne',sans-serif", transition:"all 0.2s",
            }}>{f}</button>
          ))}
        </div>

        {/* Compose */}
        <Compose onPost={handlePost} />

        {/* Posts */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {posts.map((p,i) => (
            <div key={p.id} style={{ animationDelay:`${i*60}ms` }}>
              <PostCard post={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        {/* Trending traders */}
        <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
            marginBottom:12, letterSpacing:"0.05em" }}>🔥 TOP TRADERS</div>
          {[
            {seed:0,name:"CryptoWolf",pnl:"+$48.2K",pct:"+284%",followers:"12.4K"},
            {seed:2,name:"TRex",pnl:"+$31.5K",pct:"+187%",followers:"8.9K"},
            {seed:4,name:"KryptoLisa",pnl:"+$22.1K",pct:"+142%",followers:"6.2K"},
          ].map((t,i) => (
            <div key={t.seed} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"8px 0", borderBottom: i<2?`1px solid ${T.border}`:"none" }}>
              <span style={{ fontSize:11, color:T.t3, width:14, fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</span>
              <Avatar seed={t.seed} size={30} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{t.name}</div>
                <div style={{ fontSize:10, color:T.t3 }}>{t.followers} followers</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:T.green, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{t.pnl}</div>
                <div style={{ fontSize:10, color:`${T.green}88` }}>{t.pct}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trending tags */}
        <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
            marginBottom:10, letterSpacing:"0.05em" }}>📈 TRENDING</div>
          {["#BTC","#Gold","#Forex","#PropTrading","#ETH","#Macro"].map((tag,i) => (
            <div key={tag} style={{ display:"flex", justifyContent:"space-between",
              padding:"6px 0", borderBottom:i<5?`1px solid ${T.border}`:"none" }}>
              <span style={{ fontSize:12, color:T.accent, fontWeight:600 }}>{tag}</span>
              <span style={{ fontSize:10, color:T.t3 }}>{[4820,3210,2940,2180,1890,1340][i]} posts</span>
            </div>
          ))}
        </div>

        {/* Your stats */}
        <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
            marginBottom:10, letterSpacing:"0.05em" }}>YOUR REACH</div>
          {[["Posts","12"],["Followers","248"],["Following","91"],["Likes received","1,840"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
              <span style={{ fontSize:11, color:T.t3 }}>{k}</span>
              <span style={{ fontSize:12, color:T.t1, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROP TRADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════

const TIERS = [
  { id:"one", name:"1-Phase", icon:"🥇", color:T.gold, fee:0.5, target:8, dailyDD:4, totalDD:8, days:30,
    split:70, sizes:[10000,25000,50000,100000,200000], desc:"Fast track. One phase, 30 days, 8% target." },
  { id:"two", name:"2-Phase", icon:"🏆", color:T.accent, fee:0.4, target1:8, target2:5,
    dailyDD:5, totalDD:10, days1:30, days2:60, split:80, sizes:[10000,25000,50000,100000,200000],
    desc:"Best value. Lower fee, higher drawdown limits, 80% split." },
  { id:"instant", name:"Instant", icon:"⚡", color:T.purple, fee:3.0, target:null,
    dailyDD:3, totalDD:6, days:0, split:60, sizes:[5000,10000,25000],
    desc:"No evaluation. Jump straight to funded. Higher fee, lower split." },
];

const DEMO_EVAL = {
  tier:"two", accountSize:25000, phase:1, startDay:8, totalDays:30,
  balance:26840, target:27000, peak:26840,
  dailyDD:5, maxDailyDD:1250, todayDD:320,
  totalDD:10, maxTotalDD:2500, currentDD:0,
  trades:[
    { sym:"BTC/USD", side:"long",  pnl:+840, size:5000,  date:"Mar 8", status:"closed" },
    { sym:"ETH/USD", side:"short", pnl:+320, size:3000,  date:"Mar 7", status:"closed" },
    { sym:"EUR/USD", side:"long",  pnl:-180, size:10000, date:"Mar 6", status:"closed" },
    { sym:"XAU/USD", side:"long",  pnl:+640, size:8000,  date:"Mar 5", status:"closed" },
    { sym:"SOL/USD", side:"short", pnl:+220, size:4000,  date:"Mar 4", status:"closed" },
  ],
};

function GaugeBar({ label, current, max, color, pct=false }) {
  const ratio = Math.min(current/max, 1);
  const danger = ratio > 0.75;
  const c = danger ? T.red : color;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
        <span style={{ color:T.t3, fontFamily:"'Syne',sans-serif" }}>{label}</span>
        <span style={{ color:c, fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>
          {pct ? `${(ratio*100).toFixed(1)}%` : `$${current.toLocaleString()}`} / {pct ? `${max}%` : `$${max.toLocaleString()}`}
        </span>
      </div>
      <div style={{ height:6, borderRadius:3, background:T.bg3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${ratio*100}%`, borderRadius:3,
          background: danger ? `linear-gradient(90deg,${T.red},#FF6080)` : `linear-gradient(90deg,${c},${c}cc)`,
          boxShadow: `0 0 8px ${c}66`, transition:"width 0.8s ease" }} />
      </div>
    </div>
  );
}

function TierCard({ tier, selected, onSelect }) {
  return (
    <div onClick={()=>onSelect(tier.id)} style={{
      borderRadius:14, border:`2px solid ${selected ? tier.color : T.border}`,
      padding:"18px 20px", cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden",
      background: selected ? `${tier.color}0A` : T.bg2,
      boxShadow: selected ? `0 0 30px ${tier.color}22` : "none",
      animation:"fadeUp 0.4s ease both",
    }}
    onMouseEnter={e=>{ if(!selected) e.currentTarget.style.borderColor=`${tier.color}66` }}
    onMouseLeave={e=>{ if(!selected) e.currentTarget.style.borderColor=T.border }}>
      {selected && <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,${tier.color},${tier.color}00)` }} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:20 }}>{tier.icon}</div>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif",
            marginTop:4 }}>{tier.name}</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:2, fontFamily:"'Outfit',sans-serif" }}>{tier.desc}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:800, color:tier.color,
            fontFamily:"'JetBrains Mono',monospace" }}>{tier.split}%</div>
          <div style={{ fontSize:10, color:T.t3 }}>profit split</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11 }}>
        {[
          ["Fee", `${tier.fee}%`],
          ["Daily DD", `${tier.dailyDD}%`],
          ["Target", tier.target ? `${tier.target}%` : "None"],
          ["Duration", tier.days ? `${tier.days}d` : "Instant"],
        ].map(([k,v]) => (
          <div key={k} style={{ background:T.bg3, borderRadius:6, padding:"6px 8px" }}>
            <div style={{ color:T.t3, fontSize:9, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.1em", textTransform:"uppercase" }}>{k}</div>
            <div style={{ color:tier.color, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
              fontSize:13, marginTop:2 }}>{v}</div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop:12, padding:"8px 0 0", borderTop:`1px solid ${tier.color}22` }}>
          <div style={{ fontSize:10, color:T.t3, marginBottom:6, fontFamily:"'Syne',sans-serif" }}>SELECT SIZE</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {tier.sizes.map(s => (
              <Badge key={s} color={tier.color}>{fmt$(s,0)}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PropScreen() {
  const [view, setView] = useState("dashboard"); // dashboard | new | funded
  const [selTier, setSelTier] = useState("two");
  const [selSize, setSelSize] = useState(25000);
  const eval_ = DEMO_EVAL;

  const progress = ((eval_.balance - eval_.accountSize) / (eval_.target - eval_.accountSize)) * 100;
  const daysPct = (eval_.startDay / eval_.totalDays) * 100;

  const FUNDED_STATS = [
    { label:"Account Size",    value:"$25,000",   color:T.accent },
    { label:"Net Profit",      value:"+$4,280",   color:T.green },
    { label:"Total Withdrawn", value:"$2,140",    color:T.gold },
    { label:"Profit Split",    value:"80%",       color:T.purple },
    { label:"Win Rate",        value:"68%",       color:T.cyan },
    { label:"Max Drawdown",    value:"4.2%",      color:T.t2 },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", fontFamily:"'Outfit',sans-serif" }}>
      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:T.bg1,
        borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
        {[["dashboard","📊 My Eval"],["funded","💎 Funded"],["new","🚀 New Challenge"]].map(([id,label]) => (
          <button key={id} onClick={()=>setView(id)} style={{
            flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
            background: view===id ? T.accent : "transparent",
            color: view===id ? "#000" : T.t3,
            fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", transition:"all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>

      {/* ── EVAL DASHBOARD ── */}
      {view === "dashboard" && (
        <div style={{ display:"flex", gap:16 }}>
          {/* Left — progress */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Phase header */}
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
              padding:"18px 20px", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif" }}>
                      Phase 1 Evaluation
                    </span>
                    <Badge color={T.gold}>SIM</Badge>
                    <Badge color={T.green} small>ON TRACK</Badge>
                  </div>
                  <div style={{ color:T.t3, fontSize:12, marginTop:4 }}>
                    2-Phase · $25,000 account · Day {eval_.startDay} of {eval_.totalDays}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:28, fontWeight:800, color:T.green,
                    fontFamily:"'JetBrains Mono',monospace" }}>
                    ${eval_.balance.toLocaleString()}
                  </div>
                  <div style={{ fontSize:11, color:T.t3 }}>Current Balance</div>
                </div>
              </div>

              {/* Progress to target */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
                  <span style={{ color:T.t3 }}>Progress to 8% target</span>
                  <span style={{ color:T.green, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>
                    {progress.toFixed(1)}% complete
                  </span>
                </div>
                <div style={{ height:10, borderRadius:5, background:T.bg3, overflow:"hidden", position:"relative" }}>
                  <div style={{ height:"100%", width:`${progress}%`, borderRadius:5,
                    background:`linear-gradient(90deg,${T.accent},${T.green})`,
                    boxShadow:`0 0 12px ${T.green}66`, transition:"width 1s ease",
                    position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,#ffffff22,transparent)",
                      animation:"shimmer 2s infinite" }} />
                  </div>
                  <div style={{ position:"absolute", right:0, top:-1, bottom:-1, width:2,
                    background:T.t3, opacity:0.4 }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10 }}>
                  <span style={{ color:T.t3 }}>${eval_.accountSize.toLocaleString()} start</span>
                  <span style={{ color:T.gold }}>🎯 ${eval_.target.toLocaleString()} target</span>
                </div>
              </div>

              {/* Drawdown gauges */}
              <GaugeBar label="Daily Drawdown" current={eval_.todayDD} max={eval_.maxDailyDD} color={T.accent} />
              <GaugeBar label="Total Drawdown" current={Math.max(0,eval_.peak-eval_.balance)} max={eval_.maxTotalDD} color={T.purple} />

              {/* Days remaining */}
              <div style={{ marginTop:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
                  <span style={{ color:T.t3 }}>Time used</span>
                  <span style={{ color:T.t2, fontFamily:"'JetBrains Mono',monospace" }}>
                    {eval_.startDay}d / {eval_.totalDays}d
                  </span>
                </div>
                <div style={{ height:6, borderRadius:3, background:T.bg3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${daysPct}%`, borderRadius:3,
                    background:`linear-gradient(90deg,${T.t3},${T.t2})`, transition:"width 0.8s ease" }} />
                </div>
              </div>
            </div>

            {/* Trade history */}
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
              padding:"16px 20px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
                marginBottom:12 }}>SIMULATION TRADES <Badge small color={T.gold}>SIM ONLY</Badge></div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {["Market","Side","Size","P&L","Date"].map(h=>(
                    <th key={h} style={{ padding:"6px 8px", textAlign:"left",
                      fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                      letterSpacing:"0.1em", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {eval_.trades.map((t,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}11` }}>
                      <td style={{ padding:"9px 8px", fontWeight:700, color:T.t1, fontSize:12, fontFamily:"'Syne',sans-serif" }}>{t.sym}</td>
                      <td style={{ padding:"9px 8px" }}>
                        <span style={{ fontSize:10, fontWeight:700,
                          color:t.side==="long"?T.green:T.red }}>{t.side==="long"?"▲":"▼"} {t.side.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:"9px 8px", fontSize:11, color:T.t2,
                        fontFamily:"'JetBrains Mono',monospace" }}>{fmt$(t.size,0)}</td>
                      <td style={{ padding:"9px 8px", fontFamily:"'JetBrains Mono',monospace",
                        fontWeight:700, fontSize:12,
                        color:t.pnl>=0?T.green:T.red }}>{t.pnl>=0?"+":""}{fmt$(t.pnl)}</td>
                      <td style={{ padding:"9px 8px", fontSize:11, color:T.t3 }}>{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop:12, padding:"10px 0 0", borderTop:`1px solid ${T.border}`,
                display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ color:T.t3 }}>Total P&L</span>
                <span style={{ color:T.green, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                  fontSize:14 }}>+${eval_.trades.reduce((a,b)=>a+b.pnl,0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width:240, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", marginBottom:12 }}>REQUIREMENTS</div>
              {[
                ["Target profit", "8%", progress>=100, T.green],
                ["Daily DD limit", "5%", true, T.green],
                ["Max drawdown", "10%", true, T.green],
                ["Min trading days", "5", true, T.green],
                ["Complete by", "Mar 22", false, T.gold],
              ].map(([k,v,met,c])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.border}11` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.t2 }}>
                    <span style={{ color:met?T.green:T.t3, fontSize:12 }}>{met?"✓":"○"}</span>
                    {k}
                  </div>
                  <span style={{ fontSize:11, color:c, fontFamily:"'JetBrains Mono',monospace",
                    fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", marginBottom:10 }}>PHASE 2 PREVIEW</div>
              <div style={{ fontSize:11, color:T.t3, lineHeight:1.6, fontFamily:"'Outfit',sans-serif" }}>
                After passing Phase 1, you'll enter a 60-day Phase 2 with a 5% target. Pass both to unlock your funded account.
              </div>
              <div style={{ marginTop:12, padding:"10px", background:T.bg3, borderRadius:8,
                border:`1px solid ${T.accent}22`, textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:800, color:T.accent,
                  fontFamily:"'Syne',sans-serif" }}>$25,000</div>
                <div style={{ fontSize:10, color:T.t3 }}>Funded account waiting</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FUNDED ACCOUNT ── */}
      {view === "funded" && (
        <div>
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.gold}44`,
            padding:"20px", marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
              background:`linear-gradient(90deg,${T.gold},${T.green},${T.accent})` }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:13, color:T.gold, fontWeight:700,
                  fontFamily:"'Syne',sans-serif", marginBottom:4 }}>💎 FUNDED ACCOUNT</div>
                <div style={{ fontSize:28, fontWeight:800, color:T.t1,
                  fontFamily:"'Syne',sans-serif" }}>$25,000</div>
                <div style={{ color:T.t3, fontSize:12, marginTop:4 }}>2-Phase · 80% profit split · Scale-up eligible</div>
              </div>
              <Btn color={T.green} onClick={()=>{}}>Withdraw Profits</Btn>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {FUNDED_STATS.map((s,i) => <StatCard key={s.label} {...s} delay={i*60} />)}
          </div>
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif" }}>SCALE-UP PROGRESS</span>
              <Badge color={T.accent}>2× eligible at $8,560 profit</Badge>
            </div>
            <div style={{ height:8, borderRadius:4, background:T.bg3, overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", width:"50%", borderRadius:4,
                background:`linear-gradient(90deg,${T.accent},${T.purple})`,
                boxShadow:`0 0 12px ${T.accent}66` }} />
            </div>
            <div style={{ fontSize:11, color:T.t3 }}>$4,280 / $8,560 — 50% to next scale-up (+$12,500 account size)</div>
          </div>
        </div>
      )}

      {/* ── NEW CHALLENGE ── */}
      {view === "new" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
            {TIERS.map(t => <TierCard key={t.id} tier={t} selected={selTier===t.id} onSelect={setSelTier} />)}
          </div>
          {selTier && (() => {
            const tier = TIERS.find(t=>t.id===selTier);
            const fee = selSize * tier.fee / 100;
            return (
              <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${tier.color}44`,
                padding:"20px", display:"flex", gap:20, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.t1,
                    fontFamily:"'Syne',sans-serif", marginBottom:8 }}>ORDER SUMMARY</div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    {[["Tier",tier.name],["Account Size",fmt$(selSize,0)],
                      ["Eval Fee",fmt$(fee)],["Profit Split",`${tier.split}%`]].map(([k,v])=>(
                      <div key={k}>
                        <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                          letterSpacing:"0.1em", textTransform:"uppercase" }}>{k}</div>
                        <div style={{ fontSize:16, fontWeight:700, color:tier.color,
                          fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <Btn color={tier.color} onClick={()=>setView("dashboard")}>
                  Start Challenge — {fmt$(fee)}
                </Btn>
              </div>
            );
          })()}
        </div>
      )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLET SCREEN
// ═══════════════════════════════════════════════════════════════════════════

const WALLET_TOKENS = [
  { sym:"USDC", name:"USD Coin",   balance:10284.50, usd:10284.50, change:0,      icon:"💵", color:"#2775CA" },
  { sym:"ETH",  name:"Ethereum",   balance:2.841,    usd:10003.18, change:2.34,   icon:"Ξ",  color:"#627EEA" },
  { sym:"ARB",  name:"Arbitrum",   balance:840.2,    usd:944.38,   change:-1.22,  icon:"A",  color:"#12AAFF" },
  { sym:"WIK",  name:"Wikicious",  balance:12500,    usd:1250.00,  change:8.44,   icon:"W",  color:"#5B7FFF" },
];

const HISTORY = [
  { type:"deposit",   sym:"USDC", amount:5000,   usd:5000,   ts:Date.now()-3600000,  hash:"0x4f3a...8b2c", status:"confirmed" },
  { type:"trade_pnl", sym:"USDC", amount:840.50, usd:840.50, ts:Date.now()-86400000, hash:"0x9c2f...3d1e", status:"confirmed" },
  { type:"withdraw",  sym:"USDC", amount:2000,   usd:2000,   ts:Date.now()-172800000,hash:"0x7b1a...9f4c", status:"confirmed" },
  { type:"trade_pnl", sym:"USDC", amount:-320,   usd:-320,   ts:Date.now()-259200000,hash:"0x2d8e...7a3b", status:"confirmed" },
  { type:"deposit",   sym:"ETH",  amount:1.5,    usd:5280,   ts:Date.now()-345600000,hash:"0x5e9d...2c7f", status:"confirmed" },
];

export function WalletScreen() {
  const [tab, setTab] = useState("overview");
  const [depAmount, setDepAmount] = useState("");
  const [witAmount, setWitAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [depDone, setDepDone] = useState(false);
  const [witDone, setWitDone] = useState(false);
  const totalUSD = WALLET_TOKENS.reduce((a,b)=>a+b.usd, 0);
  const chartVals = [18200,19400,17800,20100,21500,19800,22543];

  const handleDeposit = () => {
    if(!depAmount) return;
    setDepDone(true);
    setTimeout(()=>{setDepDone(false);setDepAmount("")},2500);
  };
  const handleWithdraw = () => {
    if(!witAmount) return;
    setWitDone(true);
    setTimeout(()=>{setWitDone(false);setWitAmount("")},2500);
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", fontFamily:"'Outfit',sans-serif" }}>
      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:T.bg1,
        borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
        {[["overview","💼 Overview"],["deposit","📥 Deposit"],["withdraw","📤 Withdraw"],["history","📋 History"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
            background: tab===id ? T.accent : "transparent",
            color: tab===id ? "#000" : T.t3,
            fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", transition:"all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>

      {/* ── OVERVIEW ── */}
      {tab==="overview" && (
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {/* Total balance hero */}
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
              padding:"24px 24px 20px", marginBottom:14, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200,
                borderRadius:"50%", background:`${T.accent}08`, border:`1px solid ${T.accent}11` }} />
              <div style={{ fontSize:11, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>TOTAL BALANCE</div>
              <div style={{ fontSize:42, fontWeight:800, color:T.t1, fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"-0.03em", lineHeight:1 }}>
                ${totalUSD.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                <span style={{ color:T.green, fontSize:13, fontWeight:700 }}>+$1,840.50</span>
                <span style={{ color:`${T.green}88`, fontSize:12 }}>+9.03% this week</span>
              </div>
              <div style={{ marginTop:16 }}>
                <MiniChart values={chartVals} color={T.green} height={50} />
              </div>
            </div>

            {/* Token balances */}
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`,
                fontSize:12, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", textTransform:"uppercase" }}>ASSETS</div>
              {WALLET_TOKENS.map((tk,i) => (
                <div key={tk.sym} style={{ display:"flex", alignItems:"center", gap:14,
                  padding:"14px 20px", borderBottom:i<WALLET_TOKENS.length-1?`1px solid ${T.border}11`:"none",
                  cursor:"pointer", transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${tk.color}18`,
                    border:`1px solid ${tk.color}33`, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:16, color:tk.color, fontWeight:800 }}>
                    {tk.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:T.t1, fontSize:13, fontFamily:"'Syne',sans-serif" }}>{tk.sym}</div>
                    <div style={{ fontSize:11, color:T.t3 }}>{tk.name}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13,
                      fontWeight:700, color:T.t1 }}>{tk.balance.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:T.t3 }}>${tk.usd.toLocaleString("en",{minimumFractionDigits:2})}</div>
                  </div>
                  <div style={{ textAlign:"right", width:56 }}>
                    <div style={{ fontSize:11, fontWeight:700,
                      color: tk.change>=0 ? T.green : T.red,
                      fontFamily:"'JetBrains Mono',monospace" }}>
                      {tk.change===0?"—":`${tk.change>=0?"+":""}${tk.change.toFixed(2)}%`}
                    </div>
                    <MiniChart values={[1,1.2,0.9,1.4,1.1,1.3,1+tk.change/100].map(v=>v*tk.usd/1.3)}
                      color={tk.change>=0?T.green:T.red} height={24} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: quick actions */}
          <div style={{ width:240, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", marginBottom:12 }}>QUICK ACTIONS</div>
              {[["📥 Deposit","deposit",T.green],["📤 Withdraw","withdraw",T.accent],
                ["↔ Swap","overview",T.gold],["📊 Trade","overview",T.purple]].map(([label,id,color])=>(
                <button key={label} onClick={()=>setTab(id)} style={{
                  width:"100%", padding:"10px 14px", borderRadius:8,
                  border:`1px solid ${color}33`, background:`${color}0A`,
                  color, fontSize:12, fontWeight:700, cursor:"pointer", marginBottom:8,
                  textAlign:"left", fontFamily:"'Syne',sans-serif", transition:"all 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${color}18`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${color}0A`}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", marginBottom:12 }}>TRADING SUMMARY</div>
              {[["Open Positions","4",T.accent],["Unrealised PnL","+$761",T.green],
                ["Margin Used","$7,750",T.gold],["Available","$2,534",T.t1]].map(([k,v,c])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  padding:"6px 0", borderBottom:`1px solid ${T.border}11` }}>
                  <span style={{ fontSize:11, color:T.t3 }}>{k}</span>
                  <span style={{ fontSize:12, color:c, fontWeight:700,
                    fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DEPOSIT ── */}
      {tab==="deposit" && (
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"24px" }}>
            <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif",
              marginBottom:4 }}>Deposit Funds</div>
            <div style={{ fontSize:12, color:T.t3, marginBottom:20 }}>
              Deposit USDC to start trading. Funds arrive on Arbitrum instantly.
            </div>

            {/* Token select */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", display:"block", marginBottom:8 }}>SELECT TOKEN</label>
              <div style={{ display:"flex", gap:8 }}>
                {["USDC","ETH","ARB"].map(t => (
                  <button key={t} onClick={()=>setSelectedToken(t)} style={{
                    flex:1, padding:"10px 0", borderRadius:8,
                    border:`2px solid ${selectedToken===t?T.green:T.border}`,
                    background: selectedToken===t ? `${T.green}11` : T.bg3,
                    color: selectedToken===t ? T.green : T.t3,
                    fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", display:"block", marginBottom:8 }}>AMOUNT</label>
              <div style={{ position:"relative" }}>
                <input value={depAmount} onChange={e=>setDepAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width:"100%", background:T.bg3, border:`1px solid ${T.border2}`,
                    borderRadius:10, padding:"14px 80px 14px 16px", color:T.t1, fontSize:18,
                    fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }} />
                <span style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)",
                  color:T.t3, fontSize:13, fontWeight:700 }}>{selectedToken}</span>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                {[100,500,1000,5000].map(v=>(
                  <button key={v} onClick={()=>setDepAmount(String(v))} style={{
                    flex:1, padding:"6px 0", borderRadius:6, border:`1px solid ${T.border2}`,
                    background:T.bg3, color:T.t3, fontSize:11, cursor:"pointer",
                    fontFamily:"'JetBrains Mono',monospace" }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div style={{ background:T.bg3, borderRadius:8, padding:"12px 14px",
              border:`1px solid ${T.green}22`, marginBottom:20 }}>
              {[["Network","Arbitrum One"],["Contract","WikiVault.sol"],["Min deposit","$10"],
                ["Arrival","~5 seconds"],["Fee","Gas only (~$0.01)"]].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  padding:"3px 0", fontSize:11 }}>
                  <span style={{ color:T.t3 }}>{k}</span>
                  <span style={{ color:T.t2, fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
                </div>
              ))}
            </div>

            <Btn full color={T.green} onClick={handleDeposit} disabled={!depAmount}>
              {depDone ? "✓ Transaction Sent!" : `Deposit ${depAmount||"0"} ${selectedToken}`}
            </Btn>
          </div>
        </div>
      )}

      {/* ── WITHDRAW ── */}
      {tab==="withdraw" && (
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, padding:"24px" }}>
            <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif",
              marginBottom:4 }}>Withdraw Funds</div>
            <div style={{ fontSize:12, color:T.t3, marginBottom:20 }}>
              Withdraw to any Arbitrum wallet. Max $100K/day for security.
            </div>

            <div style={{ background:`${T.gold}11`, borderRadius:8, padding:"10px 14px",
              border:`1px solid ${T.gold}33`, marginBottom:20, fontSize:11, color:T.gold }}>
              ⚠ Available: <strong>$2,534.50 USDC</strong> · Daily limit remaining: $100,000
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", display:"block", marginBottom:8 }}>AMOUNT (USDC)</label>
              <div style={{ position:"relative" }}>
                <input value={witAmount} onChange={e=>setWitAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width:"100%", background:T.bg3, border:`1px solid ${T.border2}`,
                    borderRadius:10, padding:"14px 80px 14px 16px", color:T.t1, fontSize:18,
                    fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }} />
                <button onClick={()=>setWitAmount("2534.50")} style={{ position:"absolute", right:12,
                  top:"50%", transform:"translateY(-50%)", padding:"3px 8px", borderRadius:4,
                  border:`1px solid ${T.accent}44`, background:`${T.accent}11`,
                  color:T.accent, fontSize:10, cursor:"pointer", fontWeight:700 }}>MAX</button>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                {[25,50,75,100].map(p=>(
                  <button key={p} onClick={()=>setWitAmount((2534.50*p/100).toFixed(2))} style={{
                    flex:1, padding:"6px 0", borderRadius:6, border:`1px solid ${T.border2}`,
                    background:T.bg3, color:T.t3, fontSize:11, cursor:"pointer" }}>{p}%</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:10, color:T.t3, fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.1em", display:"block", marginBottom:8 }}>DESTINATION</label>
              <input placeholder="Your Arbitrum wallet (0x...)" style={{ width:"100%",
                background:T.bg3, border:`1px solid ${T.border2}`, borderRadius:10,
                padding:"12px 16px", color:T.t1, fontSize:13, outline:"none",
                fontFamily:"'JetBrains Mono',monospace", boxSizing:"border-box" }} />
            </div>

            <Btn full color={T.accent} onClick={handleWithdraw} disabled={!witAmount}>
              {witDone ? "✓ Withdrawal Initiated!" : `Withdraw ${witAmount||"0"} USDC`}
            </Btn>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab==="history" && (
        <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.1em" }}>TRANSACTION HISTORY</span>
            <Badge color={T.t3} small>{HISTORY.length} transactions</Badge>
          </div>
          {HISTORY.map((h,i) => {
            const isIn = h.type==="deposit" || (h.type==="trade_pnl"&&h.amount>0);
            const color = isIn ? T.green : T.red;
            const icons = {deposit:"📥",withdraw:"📤",trade_pnl:"📊"};
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14,
                padding:"14px 20px", borderBottom:i<HISTORY.length-1?`1px solid ${T.border}11`:"none",
                transition:"background 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`,
                  border:`1px solid ${color}33`, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:16 }}>{icons[h.type]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
                    textTransform:"capitalize" }}>
                    {h.type.replace("_"," ")} {h.sym}
                  </div>
                  <div style={{ fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                    marginTop:2 }}>{h.hash} · {ago(h.ts)} ago</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:700, color,
                    fontFamily:"'JetBrains Mono',monospace" }}>
                    {isIn?"+":""}{fmt$(Math.abs(h.amount))}
                  </div>
                  <div style={{ fontSize:10, marginTop:2 }}>
                    <span style={{ color:T.green, fontSize:9 }}>● confirmed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState("social");
  const NAV = [
    {id:"social", icon:"💬", label:"Social"},
    {id:"prop",   icon:"🏆", label:"Prop"},
    {id:"wallet", icon:"💼", label:"Wallet"},
  ];
  const screens = { social:<SocialFeed/>, prop:<PropScreen/>, wallet:<WalletScreen/> };

  return (
    <div style={{ height:"100vh", background:T.bg0, color:T.t1, display:"flex",
      flexDirection:"column", overflow:"hidden" }}>
      <style>{css}</style>

      {/* Top bar */}
      <div style={{ height:52, background:T.bg1, borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", padding:"0 20px", gap:4, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:24 }}>
          <div style={{ width:28, height:28, borderRadius:8,
            background:"linear-gradient(135deg,#5B7FFF,#00E5A0)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:900, fontSize:14, color:"#000" }}>W</div>
          <span style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Wikicious</span>
        </div>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setScreen(n.id)} style={{
            padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
            background: screen===n.id ? `${T.accent}18` : "transparent",
            color: screen===n.id ? T.accent : T.t3,
            fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif",
            borderBottom: screen===n.id ? `2px solid ${T.accent}` : "2px solid transparent",
            transition:"all 0.15s" }}>
            {n.icon} {n.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:T.green,
            boxShadow:`0 0 6px ${T.green}` }} />
          <span style={{ fontSize:10, color:T.green, fontWeight:700,
            fontFamily:"'Syne',sans-serif" }}>ARBITRUM</span>
          <div style={{ padding:"6px 14px", borderRadius:8, background:T.bg3,
            border:`1px solid ${T.border2}`, fontSize:12, color:T.t2,
            fontFamily:"'JetBrains Mono',monospace" }}>0x4f3a…8b2c</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:"hidden", padding:16, display:"flex", flexDirection:"column" }}>
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {screens[screen]}
        </div>
      </div>
    </div>
  );
}
