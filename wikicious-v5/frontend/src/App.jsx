import { useState } from "react";

// ── Screen imports (inline mini-versions for the preview shell) ──
// In production these are separate files:
// import WikiciousApp     from "./WikiciousApp";
// import { SocialFeed, PropScreen, WalletScreen } from "./screens/SocialPropWallet";
// import ProfileLeaderboard from "./screens/ProfileLeaderboard";
// import MarketsScreen    from "./screens/MarketsScreen";
// import ReferralBonus    from "./screens/ReferralBonus";
// import Onboarding       from "./screens/Onboarding";

const T = {
  bg0:"#06080F", bg1:"#0A0C16", bg2:"#0E1120", bg3:"#131829",
  border:"#1C2138", t1:"#EDF0FA", t2:"#8892B0", t3:"#4A5270",
  green:"#00E5A0", red:"#FF4060", accent:"#5B7FFF", gold:"#FFB800",
  purple:"#A855F7", cyan:"#00D4FF",
};

const NAV = [
  { id:"trade",     label:"Trade",      icon:"📊", badge:null },
  { id:"markets",   label:"Markets",    icon:"🌐", badge:"63" },
  { id:"social",    label:"Social",     icon:"💬", badge:"3"  },
  { id:"prop",      label:"Prop",       icon:"🏆", badge:null },
  { id:"wallet",    label:"Wallet",     icon:"💼", badge:null },
  { id:"leaderboard",label:"Leaders",  icon:"🥇", badge:null },
  { id:"referral",  label:"Referral",   icon:"🎁", badge:"$50" },
];

function ScreenPlaceholder({ name, icon, color=T.accent }) {
  return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
      flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:56 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color:T.t1,
        fontFamily:"'Syne',sans-serif" }}>{name}</div>
      <div style={{ fontSize:13, color:T.t3, maxWidth:320, textAlign:"center",
        lineHeight:1.6 }}>
        This screen is fully built in its own file.<br/>
        Import and drop in for production.
      </div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <code style={{ padding:"6px 12px", borderRadius:6, background:T.bg2,
          border:`1px solid ${T.border}`, color:color, fontSize:11 }}>
          {`import ${name.replace(/\s/g,"")} from "./screens/${name.replace(/\s/g,"")}"`}
        </code>
      </div>
    </div>
  );
}

// ── Toast system ────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const color = type==="success" ? T.green : type==="warn" ? T.gold : T.red;
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:9999,
      padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:700,
      background:T.bg2, color, border:`1px solid ${color}44`,
      boxShadow:`0 8px 32px ${color}33`,
      animation:"slideIn 0.3s ease", fontFamily:"'Syne',sans-serif" }}>
      {type==="success"?"✓ ":type==="warn"?"⚠ ":"✗ "}{msg}
    </div>
  );
}

// ── Main App shell ──────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("trade");
  const [connected, setConnected] = useState(false);
  const [onboarded, setOnboarded] = useState(true); // set false to show onboarding
  const [toast, setToast]         = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(()=>setToast(null), 3000);
  };

  if (!onboarded) {
    return (
      <div style={{ background:T.bg0, minHeight:"100vh" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
        `}</style>
        {/* Onboarding would render here */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          minHeight:"100vh", color:T.t1, fontFamily:"'Syne',sans-serif",
          flexDirection:"column", gap:16 }}>
          <div style={{ fontSize:48 }}>🚀</div>
          <div style={{ fontSize:20, fontWeight:800 }}>Onboarding Flow</div>
          <div style={{ fontSize:13, color:T.t3 }}>5-step onboarding: Landing → Connect → Arbitrum → Bonus → Done</div>
          <button onClick={()=>setOnboarded(true)} style={{ padding:"10px 24px", borderRadius:8,
            border:"none", background:T.accent, color:"#000", fontSize:13, fontWeight:700,
            cursor:"pointer" }}>Enter App</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh",
      background:T.bg0, color:T.t1, fontFamily:"'Outfit',sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1C2138;border-radius:2px}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {toast && <Toast {...toast}/>}

      {/* ── TOP NAV BAR ─────────────────────────────────────────────── */}
      <div style={{ height:52, background:T.bg1, borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", padding:"0 16px", gap:4,
        flexShrink:0, zIndex:100 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:20,
          cursor:"pointer" }} onClick={()=>setScreen("trade")}>
          <div style={{ width:30, height:30, borderRadius:9,
            background:"linear-gradient(135deg,#5B7FFF,#00E5A0)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:900, fontSize:16, color:"#000",
            boxShadow:"0 4px 12px #5B7FFF44" }}>W</div>
          <span style={{ fontWeight:800, fontSize:16, fontFamily:"'Syne',sans-serif",
            color:T.t1, letterSpacing:"-0.02em" }}>Wikicious</span>
          <span style={{ fontSize:9, background:`${T.accent}18`, color:T.accent,
            padding:"2px 6px", borderRadius:4, border:`1px solid ${T.accent}33`,
            fontWeight:700, fontFamily:"'Syne',sans-serif" }}>BETA</span>
        </div>

        {/* Nav tabs */}
        <div style={{ display:"flex", gap:2, flex:1, overflowX:"auto" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setScreen(n.id)} style={{
              padding:"6px 12px", borderRadius:7, border:"none", cursor:"pointer",
              background: screen===n.id ? `${T.accent}18` : "transparent",
              color: screen===n.id ? T.accent : T.t3,
              fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif",
              borderBottom: screen===n.id ? `2px solid ${T.accent}` : "2px solid transparent",
              transition:"all 0.15s", position:"relative", whiteSpace:"nowrap",
              display:"flex", alignItems:"center", gap:5 }}
              onMouseEnter={e=>{ if(screen!==n.id) { e.currentTarget.style.color=T.t2; e.currentTarget.style.background=`${T.accent}08`; }}}
              onMouseLeave={e=>{ if(screen!==n.id) { e.currentTarget.style.color=T.t3; e.currentTarget.style.background="transparent"; }}}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge && (
                <span style={{ fontSize:8, padding:"1px 5px", borderRadius:8, fontWeight:800,
                  background: n.id==="referral" ? `${T.gold}22` : `${T.accent}22`,
                  color: n.id==="referral" ? T.gold : T.accent,
                  border:`1px solid ${n.id==="referral"?T.gold:T.accent}33` }}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {/* Network badge */}
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px",
            background:`${T.green}0A`, border:`1px solid ${T.green}22`, borderRadius:20 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:T.green,
              boxShadow:`0 0 6px ${T.green}`, animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:10, color:T.green, fontWeight:700,
              fontFamily:"'Syne',sans-serif" }}>Arbitrum</span>
          </div>

          {/* Notifications */}
          <button onClick={()=>setNotifOpen(v=>!v)} style={{ position:"relative",
            width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`,
            background:T.bg2, cursor:"pointer", fontSize:14, display:"flex",
            alignItems:"center", justifyContent:"center" }}>
            🔔
            <div style={{ position:"absolute", top:4, right:4, width:8, height:8,
              borderRadius:"50%", background:T.red, border:`2px solid ${T.bg0}` }}/>
          </button>

          {/* Wallet button */}
          <button onClick={()=>{ setConnected(v=>!v); showToast(connected?"Disconnected":"Connected: 0x4f3a…8b2c", connected?"warn":"success"); }}
            style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer",
              background: connected ? T.bg3 : `linear-gradient(135deg,${T.accent},${T.purple})`,
              color: connected ? T.t2 : "#fff", fontSize:12, fontWeight:700,
              fontFamily:"'Syne',sans-serif", transition:"all 0.2s",
              border: connected ? `1px solid ${T.border2}` : "none",
              boxShadow: connected ? "none" : `0 4px 16px ${T.accent}44` }}>
            {connected ? "0x4f3a…8b2c" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {/* Notification dropdown */}
      {notifOpen && (
        <div style={{ position:"absolute", top:52, right:16, zIndex:200,
          background:T.bg1, borderRadius:12, border:`1px solid ${T.border}`,
          width:300, boxShadow:`0 16px 40px #00000088`,
          animation:"fadeUp 0.2s ease" }}>
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}`,
            fontSize:12, fontWeight:700, color:T.t1, fontFamily:"'Syne',sans-serif",
            display:"flex", justifyContent:"space-between" }}>
            Notifications
            <button onClick={()=>setNotifOpen(false)} style={{ background:"none",
              border:"none", color:T.t3, cursor:"pointer", fontSize:14 }}>×</button>
          </div>
          {[
            { icon:"💹", text:"BTC/USD position up +$840", sub:"2 minutes ago", color:T.green },
            { icon:"🎁", text:"Your referral CryptoWolf just traded", sub:"5 minutes ago", color:T.gold },
            { icon:"🏆", text:"Prop eval: 68% to target", sub:"1 hour ago", color:T.accent },
            { icon:"💬", text:"TRex commented on your post", sub:"3 hours ago", color:T.purple },
          ].map((n,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 14px",
              borderBottom:`1px solid ${T.border}11`, cursor:"pointer",
              transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:18 }}>{n.icon}</span>
              <div>
                <div style={{ fontSize:12, color:T.t1 }}>{n.text}</div>
                <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>{n.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SCREEN CONTENT ──────────────────────────────────────────── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {screen === "trade"      && <ScreenPlaceholder name="Trading Terminal" icon="📊" color={T.accent}/>}
        {screen === "markets"    && <ScreenPlaceholder name="MarketsScreen"    icon="🌐" color={T.cyan}/>}
        {screen === "social"     && <ScreenPlaceholder name="SocialFeed"       icon="💬" color={T.purple}/>}
        {screen === "prop"       && <ScreenPlaceholder name="PropScreen"       icon="🏆" color={T.gold}/>}
        {screen === "wallet"     && <ScreenPlaceholder name="WalletScreen"     icon="💼" color={T.green}/>}
        {screen === "leaderboard"&& <ScreenPlaceholder name="ProfileLeaderboard" icon="🥇" color={T.gold}/>}
        {screen === "referral"   && <ScreenPlaceholder name="ReferralBonus"    icon="🎁" color={T.gold}/>}
      </div>

      {/* ── BOTTOM STATUS BAR ───────────────────────────────────────── */}
      <div style={{ height:26, background:T.bg1, borderTop:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", padding:"0 16px", gap:16,
        fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>
        <span style={{ color:T.green }}>● LIVE</span>
        <span>BTC $67,432</span>
        <span>ETH $3,521</span>
        <span>XAU $2,341</span>
        <span>EUR/USD 1.0854</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:12 }}>
          <span>Positions: 4</span>
          <span style={{ color:T.green }}>PnL: +$761</span>
          <span>Gas: ~$0.01</span>
        </div>
      </div>
    </div>
  );
}

/*
── HOW TO USE ──────────────────────────────────────────────────────────────

Replace the ScreenPlaceholder components with real screen imports:

import WikiciousApp          from "./WikiciousApp";                       // Trading terminal
import { SocialFeed,
         PropScreen,
         WalletScreen }      from "./screens/SocialPropWallet";
import ProfileLeaderboard   from "./screens/ProfileLeaderboard";
import MarketsScreen        from "./screens/MarketsScreen";
import ReferralBonus        from "./screens/ReferralBonus";
import Onboarding           from "./screens/Onboarding";

Then in the screen content section replace eg:
  {screen === "trade" && <ScreenPlaceholder .../>}
with:
  {screen === "trade" && <WikiciousApp />}

And set:
  const [onboarded, setOnboarded] = useState(false);
  // reads from localStorage in production

── FILE STRUCTURE ──────────────────────────────────────────────────────────

frontend/src/
├── App.jsx                          ← This file (shell + nav)
├── WikiciousApp.jsx                 ← Trading terminal (built)
├── index.jsx                        ← Entry point
└── screens/
    ├── SocialPropWallet.jsx         ← Social + Prop + Wallet (built)
    ├── ProfileLeaderboard.jsx       ← Profile + Leaderboard (built)
    ├── MarketsScreen.jsx            ← Markets browser (built)
    ├── ReferralBonus.jsx            ← Referral + Bonus (built)
    └── Onboarding.jsx               ← 5-step onboarding (built)
*/
