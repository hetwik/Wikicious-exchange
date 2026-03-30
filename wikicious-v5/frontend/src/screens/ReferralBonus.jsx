import { useState, useEffect, useRef } from "react";

const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829",
  border:"#1C2138", border2:"#242A42",
  t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const fmt$ = (n,d=2)=>n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${Number(n).toFixed(d)}`;
const fmtN = (n)=>n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);

function AnimatedCounter({ target, prefix="", suffix="", color=T.t1 }) {
  const [val, setVal] = useState(0);
  useEffect(()=>{
    let start=0, step=target/60;
    const id=setInterval(()=>{
      start = Math.min(start+step, target);
      setVal(start);
      if(start>=target) clearInterval(id);
    }, 16);
    return ()=>clearInterval(id);
  },[target]);
  return (
    <span style={{ color, fontFamily:"'JetBrains Mono',monospace", fontWeight:800 }}>
      {prefix}{typeof target==="number"&&target%1!==0?val.toFixed(2):Math.floor(val)}{suffix}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };
  return (
    <button onClick={handle} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.border2}`,
      background:copied?`${T.green}22`:T.bg3, color:copied?T.green:T.t2,
      fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif",
      transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}>
      {copied ? "✓ Copied!" : "📋 Copy Link"}
    </button>
  );
}

const REFERRALS = [
  { seed:0, name:"CryptoWolf",  addr:"0x4f3a…8b2c", joined:"Mar 1",  vol:48400,  status:"active",  earned:242.00, qualified:true  },
  { seed:1, name:"DexTrader",   addr:"0x9c2f…3d1e", joined:"Mar 3",  vol:31200,  status:"active",  earned:156.00, qualified:true  },
  { seed:2, name:"TRex",        addr:"0x7b1a…9f4c", joined:"Mar 5",  vol:22800,  status:"active",  earned:114.00, qualified:true  },
  { seed:4, name:"KryptoLisa",  addr:"0x5e9d…2c7f", joined:"Mar 6",  vol:18400,  status:"active",  earned:92.00,  qualified:true  },
  { seed:3, name:"ArbiMax",     addr:"0x2d8e…7a3b", joined:"Mar 7",  vol:8200,   status:"active",  earned:41.00,  qualified:true  },
  { seed:5, name:"PetraFX",     addr:"0x8c4d…1f2a", joined:"Mar 9",  vol:2400,   status:"pending", earned:0,      qualified:false },
  { seed:6, name:"ZeroRisk",    addr:"0x3e1f…5c8d", joined:"Mar 9",  vol:0,      status:"pending", earned:0,      qualified:false },
];

const BONUS_HISTORY = [
  { type:"signup",   label:"Account created",    amount:50,  date:"Feb 28", status:"active",  expiry:"May 28" },
  { type:"deposit",  label:"First deposit $500", amount:100, date:"Mar 1",  status:"active",  expiry:"May 30" },
  { type:"referral", label:"Referred CryptoWolf",amount:50,  date:"Mar 1",  status:"used",    expiry:"—"      },
  { type:"referral", label:"Referred DexTrader", amount:50,  date:"Mar 3",  status:"used",    expiry:"—"      },
  { type:"referral", label:"Referred TRex",      amount:50,  date:"Mar 5",  status:"active",  expiry:"Jun 2"  },
  { type:"referral", label:"Referred KryptoLisa",amount:50,  date:"Mar 6",  status:"active",  expiry:"Jun 3"  },
  { type:"referral", label:"Referred ArbiMax",   amount:50,  date:"Mar 7",  status:"active",  expiry:"Jun 4"  },
  { type:"streak",   label:"5-referral streak",  amount:200, date:"Mar 7",  status:"active",  expiry:"Jun 4"  },
];

const LEADERBOARD = [
  { rank:1, seed:0, name:"CryptoWolf", refs:48, earned:8420, vol:2840000 },
  { rank:2, seed:2, name:"TRex",       refs:34, earned:6210, vol:1980000 },
  { rank:3, seed:4, name:"KryptoLisa", refs:28, earned:4840, vol:1420000 },
  { rank:4, seed:1, name:"DexTrader",  refs:22, earned:3620, vol:1120000 },
  { rank:5, seed:7, name:"BitMaster",  refs:18, earned:2840, vol:890000  },
];

function Avatar({ seed, size=32 }) {
  const colors=[T.accent,T.green,T.red,T.gold,T.purple,T.cyan,"#FF6B35","#00B4D8"];
  const names=["CW","DX","TR","AM","KL","PF","ZR","BM"];
  const c=colors[seed%colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${c}22`,
      border:`2px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.32, fontWeight:800, color:c, fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
      {names[seed%names.length]}
    </div>
  );
}

export default function ReferralBonus() {
  const [tab, setTab] = useState("overview");
  const REFERRAL_CODE = "WIK-WOLF-X42";
  const REFERRAL_LINK = `https://wikicious.com/ref/${REFERRAL_CODE}`;
  const totalEarned   = REFERRALS.reduce((a,b)=>a+b.earned,0);
  const activeBonus   = BONUS_HISTORY.filter(b=>b.status==="active").reduce((a,b)=>a+b.amount,0);
  const qualifiedRefs = REFERRALS.filter(r=>r.qualified).length;
  const pendingRefs   = REFERRALS.filter(r=>!r.qualified).length;

  const BONUS_TYPES = [
    { icon:"🎁", title:"Sign-up Bonus",   amount:50,  type:"Trade Credit", desc:"Instant on registration", color:T.accent },
    { icon:"💰", title:"First Deposit",   amount:100, type:"Trade Credit", desc:"Deposit $100+ to unlock", color:T.green  },
    { icon:"👥", title:"Per Referral",    amount:50,  type:"Trade Credit", desc:"Per qualified friend",     color:T.purple },
    { icon:"🔥", title:"5-Friend Streak", amount:200, type:"Trade Credit", desc:"Refer 5 friends total",    color:T.gold   },
    { icon:"💎", title:"Rev Share",       amount:null, type:"Real USDC",   desc:"10% of friend's fees forever", color:T.cyan },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      background:T.bg0, color:T.t1, padding:16, fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1C2138;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      `}</style>

      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:T.bg1,
        borderRadius:10, padding:4, border:`1px solid ${T.border}` }}>
        {[["overview","🎁 Overview"],["referrals","👥 Referrals"],["bonus","💎 Bonus Balance"],["leaderboard","🏆 Top Referrers"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
            background:tab===id?T.accent:"transparent",
            color:tab===id?"#000":T.t3,
            fontSize:11, fontWeight:700, fontFamily:"'Syne',sans-serif", transition:"all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>

      {/* ── OVERVIEW ── */}
      {tab==="overview" && (
        <div>
          {/* Hero stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"Active Bonus Credit", val:activeBonus, prefix:"$", color:T.green, sub:"Trade credit (not withdrawable)" },
              { label:"Real USDC Earned",    val:totalEarned, prefix:"$", color:T.gold,  sub:"From referral rev share" },
              { label:"Qualified Referrals", val:qualifiedRefs, prefix:"",color:T.accent,sub:`${pendingRefs} pending qualification` },
              { label:"Streak Progress",     val:qualifiedRefs, prefix:"",suffix:"/5", color:T.purple, sub:"5 refs = $200 streak bonus" },
            ].map((s,i)=>(
              <div key={s.label} style={{ background:T.bg1, borderRadius:12,
                border:`1px solid ${s.color}33`, padding:"16px",
                animation:`fadeUp 0.4s ease ${i*80}ms both` }}>
                <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                  letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:800, lineHeight:1 }}>
                  <AnimatedCounter target={s.val} prefix={s.prefix} suffix={s.suffix||""} color={s.color}/>
                </div>
                <div style={{ fontSize:10, color:T.t3, marginTop:5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Streak progress bar */}
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.gold}33`,
            padding:"18px 20px", marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${T.gold},${T.accent},${T.green})` }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif" }}>
                  🔥 Referral Streak
                </div>
                <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>
                  Refer {5-qualifiedRefs} more friends to unlock the $200 streak bonus
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:24, fontWeight:800, color:T.gold,
                  fontFamily:"'JetBrains Mono',monospace" }}>{qualifiedRefs}/5</div>
                <div style={{ fontSize:10, color:`${T.gold}88` }}>$200 at 5</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[1,2,3,4,5].map(n=>(
                <div key={n} style={{ flex:1, height:8, borderRadius:4,
                  background:n<=qualifiedRefs
                    ? `linear-gradient(90deg,${T.gold},${T.green})`
                    : T.bg3,
                  boxShadow:n<=qualifiedRefs?`0 0 8px ${T.gold}66`:"none",
                  transition:"all 0.4s", position:"relative", overflow:"hidden" }}>
                  {n<=qualifiedRefs && (
                    <div style={{ position:"absolute", inset:0,
                      background:"linear-gradient(90deg,transparent,#ffffff22,transparent)",
                      animation:"shimmer 2s infinite" }}/>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Referral link */}
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`,
            padding:"20px", marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
              marginBottom:4 }}>Your Referral Link</div>
            <div style={{ fontSize:11, color:T.t3, marginBottom:14, fontFamily:"'Outfit',sans-serif" }}>
              Share this link. When friends sign up and trade, you earn 10% of their fees in real USDC — forever.
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ flex:1, background:T.bg3, borderRadius:8, padding:"10px 14px",
                border:`1px solid ${T.border2}`, fontFamily:"'JetBrains Mono',monospace",
                fontSize:12, color:T.accent, minWidth:200 }}>{REFERRAL_LINK}</div>
              <CopyButton text={REFERRAL_LINK}/>
              <button style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.accent}44`,
                background:`${T.accent}11`, color:T.accent, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>Share ↗</button>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              {["Twitter/X","Telegram","WhatsApp","Discord"].map(p=>(
                <button key={p} style={{ padding:"6px 14px", borderRadius:6,
                  border:`1px solid ${T.border2}`, background:T.bg3, color:T.t3,
                  fontSize:11, cursor:"pointer", fontFamily:"'Syne',sans-serif",
                  transition:"all 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border2; e.currentTarget.style.color=T.t3; }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Bonus types */}
          <div style={{ fontSize:12, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>HOW BONUSES WORK</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
            {BONUS_TYPES.map((b,i)=>(
              <div key={b.title} style={{ background:T.bg1, borderRadius:12,
                border:`1px solid ${b.color}33`, padding:"16px",
                animation:`fadeUp 0.4s ease ${i*60}ms both` }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{b.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1,
                  fontFamily:"'Syne',sans-serif", marginBottom:4 }}>{b.title}</div>
                <div style={{ fontSize:22, fontWeight:800, color:b.color,
                  fontFamily:"'JetBrains Mono',monospace", marginBottom:4 }}>
                  {b.amount ? `$${b.amount}` : "10%"}
                </div>
                <div style={{ fontSize:10, color:b.color, background:`${b.color}18`,
                  border:`1px solid ${b.color}33`, padding:"2px 8px", borderRadius:10,
                  display:"inline-block", marginBottom:6, fontWeight:700,
                  fontFamily:"'Syne',sans-serif" }}>{b.type}</div>
                <div style={{ fontSize:11, color:T.t3, lineHeight:1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Important note */}
          <div style={{ background:`${T.gold}0A`, borderRadius:10, padding:"12px 16px",
            border:`1px solid ${T.gold}33`, marginTop:14, fontSize:12, color:T.gold,
            lineHeight:1.6 }}>
            ⚠ <strong>Trade Credits</strong> are virtual and cannot be withdrawn. Profits made using trade credit ARE real USDC and can be withdrawn. Revenue share is always real USDC.
          </div>
        </div>
      )}

      {/* ── REFERRALS ── */}
      {tab==="referrals" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              ["Total Referred",  String(REFERRALS.length),           T.accent],
              ["Qualified",       String(qualifiedRefs),               T.green],
              ["Rev Share Earned",fmt$(totalEarned),                   T.gold],
            ].map(([k,v,c])=>(
              <div key={k} style={{ background:T.bg1, borderRadius:10, padding:"12px 16px",
                border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif",
                  letterSpacing:"0.1em", marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c,
                  fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 100px 80px 80px 80px",
              padding:"8px 16px", borderBottom:`1px solid ${T.border}`,
              fontSize:9, color:T.t3, fontFamily:"'Syne',sans-serif", letterSpacing:"0.1em" }}>
              <span>TRADER</span><span>JOINED</span><span>VOLUME</span>
              <span>STATUS</span><span>EARNED</span><span>ACTION</span>
            </div>
            {REFERRALS.map((r,i)=>(
              <div key={i} style={{ display:"grid",
                gridTemplateColumns:"1fr 100px 100px 80px 80px 80px",
                padding:"12px 16px", borderBottom:i<REFERRALS.length-1?`1px solid ${T.border}11`:"none",
                alignItems:"center", transition:"background 0.15s",
                animation:`fadeUp 0.3s ease ${i*50}ms both` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar seed={r.seed} size={30}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.t1,
                      fontFamily:"'Syne',sans-serif" }}>{r.name}</div>
                    <div style={{ fontSize:10, color:T.t3,
                      fontFamily:"'JetBrains Mono',monospace" }}>{r.addr}</div>
                  </div>
                </div>
                <span style={{ fontSize:11, color:T.t3 }}>{r.joined}</span>
                <span style={{ fontSize:11, color:T.t2,
                  fontFamily:"'JetBrains Mono',monospace" }}>{fmt$(r.vol,0)}</span>
                <span>
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10,
                    background:r.qualified?`${T.green}18`:`${T.gold}18`,
                    color:r.qualified?T.green:T.gold,
                    border:`1px solid ${r.qualified?T.green:T.gold}33`,
                    fontFamily:"'Syne',sans-serif" }}>
                    {r.qualified?"ACTIVE":"PENDING"}
                  </span>
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:T.gold,
                  fontFamily:"'JetBrains Mono',monospace" }}>
                  {r.earned>0?`+$${r.earned.toFixed(2)}`:"—"}
                </span>
                <button style={{ padding:"4px 10px", borderRadius:5,
                  border:`1px solid ${T.border2}`, background:"transparent",
                  color:T.t3, fontSize:10, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif" }}>View</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop:12, padding:"12px 16px", background:`${T.accent}0A`,
            borderRadius:10, border:`1px solid ${T.accent}22`, fontSize:11,
            color:T.accent, lineHeight:1.6 }}>
            💡 Qualification requires: wallet holds ≥ 0.001 ETH + at least 1 trade placed. Pending friends haven't qualified yet — remind them to trade!
          </div>
        </div>
      )}

      {/* ── BONUS BALANCE ── */}
      {tab==="bonus" && (
        <div>
          {/* Balance display */}
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.green}33`,
            padding:"24px", marginBottom:16, position:"relative", overflow:"hidden",
            textAlign:"center" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${T.green},${T.accent},${T.green})` }}/>
            <div style={{ fontSize:11, color:T.t3, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>TOTAL ACTIVE BONUS CREDIT</div>
            <div style={{ fontSize:52, fontWeight:800, color:T.green,
              fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>
              <AnimatedCounter target={activeBonus} prefix="$" color={T.green}/>
            </div>
            <div style={{ fontSize:12, color:`${T.green}88`, marginTop:6 }}>Trade-only credit · Cannot be withdrawn</div>
            <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:16, fontSize:12 }}>
              <span style={{ color:T.t3 }}>Real USDC earned: <strong style={{color:T.gold}}>{fmt$(totalEarned)}</strong></span>
              <span style={{ color:T.t3 }}>Pending claim: <strong style={{color:T.gold}}>$89.50</strong></span>
            </div>
            <button style={{ marginTop:14, padding:"10px 24px", borderRadius:8, border:"none",
              background:`linear-gradient(135deg,${T.gold},#E8A000)`,
              color:"#000", fontSize:12, fontWeight:800, cursor:"pointer",
              fontFamily:"'Syne',sans-serif", boxShadow:`0 4px 16px ${T.gold}44` }}>
              Claim $89.50 USDC
            </button>
          </div>

          {/* Bonus history table */}
          <div style={{ background:T.bg1, borderRadius:14, border:`1px solid ${T.border}`, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
              fontSize:11, fontWeight:700, color:T.t3, fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.1em" }}>BONUS HISTORY</div>
            <div style={{ display:"grid",
              gridTemplateColumns:"28px 1fr 80px 80px 70px 80px",
              padding:"6px 16px", fontSize:9, color:T.t3,
              fontFamily:"'Syne',sans-serif", letterSpacing:"0.1em",
              borderBottom:`1px solid ${T.border}` }}>
              <span></span><span>BONUS</span><span>AMOUNT</span>
              <span>DATE</span><span>STATUS</span><span>EXPIRES</span>
            </div>
            {BONUS_HISTORY.map((b,i)=>{
              const icons={signup:"🎁",deposit:"💰",referral:"👥",streak:"🔥"};
              const colors={signup:T.accent,deposit:T.green,referral:T.purple,streak:T.gold};
              const c=colors[b.type];
              return (
                <div key={i} style={{ display:"grid",
                  gridTemplateColumns:"28px 1fr 80px 80px 70px 80px",
                  padding:"11px 16px", borderBottom:i<BONUS_HISTORY.length-1?`1px solid ${T.border}11`:"none",
                  alignItems:"center", animation:`fadeUp 0.3s ease ${i*40}ms both` }}>
                  <span style={{ fontSize:14 }}>{icons[b.type]}</span>
                  <span style={{ fontSize:12, color:T.t1, fontFamily:"'Outfit',sans-serif" }}>{b.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:c,
                    fontFamily:"'JetBrains Mono',monospace" }}>+${b.amount}</span>
                  <span style={{ fontSize:11, color:T.t3 }}>{b.date}</span>
                  <span>
                    <span style={{ fontSize:9, padding:"2px 7px", borderRadius:10, fontWeight:700,
                      background:b.status==="active"?`${T.green}18`:`${T.t3}18`,
                      color:b.status==="active"?T.green:T.t3,
                      border:`1px solid ${b.status==="active"?T.green:T.t3}33`,
                      fontFamily:"'Syne',sans-serif" }}>
                      {b.status.toUpperCase()}
                    </span>
                  </span>
                  <span style={{ fontSize:11, color:T.t3 }}>{b.expiry}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop:10, fontSize:10, color:T.t3, lineHeight:1.7 }}>
            Bonuses expire 90 days after issue. Active bonuses are reset by new grants. 
            Profits from bonus trades are real USDC and are withdrawable at any time.
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {tab==="leaderboard" && (
        <div>
          <div style={{ background:`linear-gradient(135deg,${T.bg1},${T.bg2})`,
            borderRadius:14, border:`1px solid ${T.gold}33`, padding:"20px",
            marginBottom:16, textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${T.gold},${T.accent},${T.purple})` }}/>
            <div style={{ fontSize:28 }}>🏆</div>
            <div style={{ fontSize:16, fontWeight:800, color:T.t1,
              fontFamily:"'Syne',sans-serif", marginTop:8 }}>Top Referrer Prize Pool</div>
            <div style={{ fontSize:36, fontWeight:800, color:T.gold,
              fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>$10,000</div>
            <div style={{ fontSize:12, color:T.t3, marginTop:4 }}>Distributed monthly to top referrers in real USDC</div>
          </div>

          {LEADERBOARD.map((t,i)=>{
            const RANK_COLORS=["#FFB800","#C0C0C0","#CD7F32",T.accent,T.t2];
            const rc=RANK_COLORS[i];
            return (
              <div key={t.rank} style={{ background:T.bg1, borderRadius:12,
                border:`1px solid ${rc}${i===0?"55":"22"}`, padding:"14px 18px",
                marginBottom:8, display:"flex", alignItems:"center", gap:14,
                animation:`fadeUp 0.4s ease ${i*80}ms both`,
                boxShadow:i===0?`0 0 24px ${rc}22`:"none" }}>
                <div style={{ fontSize:20, fontWeight:800, color:rc,
                  fontFamily:"'JetBrains Mono',monospace", width:28, textAlign:"center" }}>
                  {i===0?"👑":i===1?"🥈":i===2?"🥉":`#${t.rank}`}
                </div>
                <Avatar seed={t.seed} size={i===0?44:36}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:i===0?15:13, fontWeight:800, color:T.t1,
                    fontFamily:"'Syne',sans-serif" }}>{t.name}</div>
                  <div style={{ fontSize:11, color:T.t3 }}>{t.refs} qualified referrals · Vol {fmt$(t.vol,0)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:rc,
                    fontFamily:"'JetBrains Mono',monospace" }}>+{fmt$(t.earned)}</div>
                  <div style={{ fontSize:10, color:T.t3 }}>earned this month</div>
                </div>
                {i===0 && (
                  <div style={{ padding:"4px 10px", borderRadius:6, background:`${T.gold}18`,
                    border:`1px solid ${T.gold}44`, fontSize:10, color:T.gold,
                    fontWeight:700, fontFamily:"'Syne',sans-serif", whiteSpace:"nowrap" }}>
                    PRIZE: $5,000
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ marginTop:12, padding:"12px 16px", background:`${T.accent}0A`,
            borderRadius:10, border:`1px solid ${T.accent}22`, fontSize:11,
            color:T.accent, lineHeight:1.6 }}>
            📅 Monthly prize pool resets on the 1st. Current period ends in <strong>21 days</strong>. Keep referring to climb the ranks!
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
