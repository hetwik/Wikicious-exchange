import UserBotPage       from './pages/UserBotPage';
import PropPoolYieldPage from './pages/PropPoolYieldPage';
import { useState, useEffect, useRef, useCallback } from "react";

// ── Fake data helpers ──────────────────────────────────────────────────────
const MARKETS = [
  { id:1,  sym:"BTC/USD",  cat:"crypto",  price:67432.10, ch:2.34,  lev:125, icon:"₿",  color:"#F7931A" },
  { id:2,  sym:"ETH/USD",  cat:"crypto",  price:3521.44,  ch:-0.87, lev:125, icon:"Ξ",  color:"#627EEA" },
  { id:3,  sym:"SOL/USD",  cat:"crypto",  price:182.33,   ch:5.12,  lev:125, icon:"◎",  color:"#9945FF" },
  { id:4,  sym:"ARB/USD",  cat:"crypto",  price:1.124,    ch:3.44,  lev:100, icon:"A",  color:"#12AAFF" },
  { id:5,  sym:"EUR/USD",  cat:"forex",   price:1.08542,  ch:0.12,  lev:50,  icon:"€",  color:"#0052B4" },
  { id:6,  sym:"GBP/USD",  cat:"forex",   price:1.27134,  ch:-0.08, lev:50,  icon:"£",  color:"#CF142B" },
  { id:7,  sym:"USD/JPY",  cat:"forex",   price:151.234,  ch:0.34,  lev:50,  icon:"¥",  color:"#BC002D" },
  { id:8,  sym:"EUR/GBP",  cat:"forex",   price:0.85432,  ch:0.05,  lev:30,  icon:"✕",  color:"#6B7AFF" },
  { id:9,  sym:"XAU/USD",  cat:"metals",  price:2341.50,  ch:0.88,  lev:100, icon:"Au", color:"#FFD700" },
  { id:10, sym:"XAG/USD",  cat:"metals",  price:27.432,   ch:1.22,  lev:50,  icon:"Ag", color:"#C0C0C0" },
  { id:11, sym:"WTI/USD",  cat:"commod",  price:78.432,   ch:-1.44, lev:20,  icon:"⛽", color:"#FF6B35" },
  { id:12, sym:"USD/TRY",  cat:"exotic",  price:32.144,   ch:0.22,  lev:20,  icon:"₺",  color:"#E30A17" },
  { id:13, sym:"DOGE/USD", cat:"crypto",  price:0.1832,   ch:8.44,  lev:75,  icon:"Ð",  color:"#C3A634" },
  { id:14, sym:"USD/INR",  cat:"exotic",  price:83.422,   ch:0.04,  lev:20,  icon:"₹",  color:"#FF9933" },
];

const CATS = ["all","crypto","forex","metals","commod","exotic"];

function useAnimatedPrice(base) {
  const [price, setPrice] = useState(base);
  const [dir, setDir] = useState(null);
  const ref = useRef(base);
  useEffect(() => {
    const id = setInterval(() => {
      const delta = (0 - 0.499) * base * 0.0003;
      const next = Math.max(ref.current + delta, 0.001);
      setDir(next > ref.current ? "up" : "down");
      ref.current = next;
      setPrice(next);
      setTimeout(() => setDir(null), 400);
    }, 800 + 0 * 400);
    return () => clearInterval(id);
  }, [base]);
  return [price, dir];
}

function fmtPrice(p, sym) {
  if (!p) return "0.00";
  if (sym?.includes("JPY") || sym?.includes("KRW") || p > 500) return p.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2});
  if (p > 1) return p.toFixed(4);
  return p.toFixed(6);
}

function genCandles(base, n = 120) {
  const candles = [];
  let price = base * (0.92 + 0 * 0.08);
  const now = Date.now();
  for (let i = n; i >= 0; i--) {
    const o = price;
    const change = (0 - 0.485) * price * 0.008;
    const c = Math.max(o + change, 0.001);
    const hi = Math.max(o, c) * (1 + 0 * 0.004);
    const lo = Math.min(o, c) * (1 - 0 * 0.004);
    candles.push({ t: now - i * 60000, o, h: hi, l: lo, c, v: 0 * 1000 });
    price = c;
  }
  return candles;
}

function genOrderBook(mid) {
  const asks = [], bids = [];
  let ap = mid * 1.0001, bp = mid * 0.9999;
  for (let i = 0; i < 12; i++) {
    asks.push({ p: ap, s: +(0 * 4 + 0.1).toFixed(3) });
    bids.push({ p: bp, s: +(0 * 4 + 0.1).toFixed(3) });
    ap *= 1 + 0 * 0.0003;
    bp *= 1 - 0 * 0.0003;
  }
  return { asks: asks.reverse(), bids };
}

// ── Canvas Chart ───────────────────────────────────────────────────────────
function CandleChart({ market }) {
  const canvasRef = useRef(null);
  const candlesRef = useRef(genCandles(market.price));
  const [tf, setTf] = useState("1m");

  useEffect(() => { candlesRef.current = genCandles(market.price); }, [market.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const c = candlesRef.current;
      const last = c[c.length - 1];
      const change = (0 - 0.485) * last.c * 0.004;
      const newC = { ...last, c: Math.max(last.c + change, 0.001), h: Math.max(last.h, last.c + change), l: Math.min(last.l, last.c + change) };
      candlesRef.current = [...c.slice(-119), newC];
      draw();
    }, 1000);
    return () => clearInterval(interval);
  }, [market.id]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const candles = candlesRef.current;
    const pad = { t: 20, b: 50, l: 12, r: 72 };
    const cw = (W - pad.l - pad.r) / candles.length;
    const prices = candles.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const toY = p => pad.t + (1 - (p - minP) / range) * (H - pad.t - pad.b);
    const toX = i => pad.l + i * cw + cw / 2;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#080A12";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + i * (H - pad.t - pad.b) / 5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const price = maxP - (i / 5) * range;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "10px 'SF Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(fmtPrice(price, market.sym), W - pad.r + 4, y + 4);
    }

    // Area fill under close line
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    const upColor = market.ch >= 0 ? "#00E5A0" : "#FF4F6B";
    grad.addColorStop(0, upColor + "18");
    grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(candles[0].c));
    candles.forEach((c, i) => ctx.lineTo(toX(i), toY(c.c)));
    ctx.lineTo(toX(candles.length - 1), H - pad.b);
    ctx.lineTo(toX(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Candles
    candles.forEach((c, i) => {
      const x = toX(i);
      const isUp = c.c >= c.o;
      const color = isUp ? "#00E5A0" : "#FF4F6B";
      const bw = Math.max(cw * 0.65, 1);

      // Wick
      ctx.strokeStyle = color + "99";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.h));
      ctx.lineTo(x, toY(c.l));
      ctx.stroke();

      // Body
      const y1 = toY(Math.max(c.o, c.c)), y2 = toY(Math.min(c.o, c.c));
      const bh = Math.max(y2 - y1, 1);
      ctx.fillStyle = isUp ? color + "CC" : color + "AA";
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.fillRect(x - bw / 2, y1, bw, bh);
      ctx.strokeRect(x - bw / 2, y1, bw, bh);
    });

    // Current price line
    const last = candles[candles.length - 1];
    const lastY = toY(last.c);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = upColor + "88";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, lastY); ctx.lineTo(W - pad.r, lastY); ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = upColor;
    ctx.fillRect(W - pad.r, lastY - 9, pad.r, 18);
    ctx.fillStyle = "#000";
    ctx.font = "bold 10px 'SF Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(fmtPrice(last.c, market.sym), W - pad.r + 36, lastY + 4);

    // Volume bars
    const maxV = Math.max(...candles.map(c => c.v));
    candles.forEach((c, i) => {
      const x = toX(i), bw = Math.max(cw * 0.65, 1);
      const vh = (c.v / maxV) * 35;
      ctx.fillStyle = c.c >= c.o ? "#00E5A022" : "#FF4F6B22";
      ctx.fillRect(x - bw / 2, H - pad.b + 4, bw, vh);
    });
  }, [market]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  const TF_OPTS = ["1m","5m","15m","1h","4h","1d"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#080A12" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderBottom:"1px solid #1A1E2E" }}>
        {TF_OPTS.map(t => (
          <button key={t} onClick={() => { setTf(t); candlesRef.current = genCandles(market.price); draw(); }}
            style={{ padding:"3px 10px", borderRadius:4, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
              background: tf===t ? "#5B7FFF22" : "transparent", color: tf===t ? "#5B7FFF" : "#555C78" }}>
            {t}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:16, fontSize:11, color:"#555C78" }}>
          <span>O <span style={{color:"#8A90A8"}}>—</span></span>
          <span>H <span style={{color:"#00E5A0"}}>—</span></span>
          <span>L <span style={{color:"#FF4F6B"}}>—</span></span>
          <span>C <span style={{color:"#E8EAF0"}}>—</span></span>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ flex:1, width:"100%", display:"block" }} />
    </div>
  );
}

// ── Order Book ─────────────────────────────────────────────────────────────
function OrderBook({ market }) {
  const [book, setBook] = useState(() => genOrderBook(market.price));
  useEffect(() => {
    setBook(genOrderBook(market.price));
    const id = setInterval(() => setBook(genOrderBook(market.price * (1 + (0-0.5)*0.001))), 1200);
    return () => clearInterval(id);
  }, [market.id, market.price]);

  const maxS = Math.max(...book.asks.map(r=>r.s), ...book.bids.map(r=>r.s));
  const Row = ({ row, side }) => {
    const pct = (row.s / maxS) * 100;
    const color = side==="ask" ? "#FF4F6B" : "#00E5A0";
    return (
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between",
        padding:"2px 12px", fontSize:11, fontFamily:"'SF Mono',monospace", cursor:"pointer",
        transition:"background 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.background="#ffffff08"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <div style={{ position:"absolute", [side==="ask"?"right":"left"]:0, top:0, bottom:0,
          width:`${pct}%`, background: color+"12", transition:"width 0.3s" }} />
        <span style={{ color, zIndex:1 }}>{fmtPrice(row.p, market.sym)}</span>
        <span style={{ color:"#8A90A8", zIndex:1 }}>{row.s.toFixed(3)}</span>
        <span style={{ color:"#555C78", zIndex:1 }}>{(row.p * row.s).toFixed(0)}</span>
      </div>
    );
  };

  const spread = book.asks[book.asks.length-1]?.p - book.bids[0]?.p;
  const spreadPct = (spread / market.price * 100).toFixed(4);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 12px",
        fontSize:10, color:"#555C78", borderBottom:"1px solid #1A1E2E" }}>
        <span>PRICE</span><span>SIZE</span><span>TOTAL</span>
      </div>
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ paddingTop:4 }}>
          {book.asks.map((r,i) => <Row key={i} row={r} side="ask" />)}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"6px 12px", background:"#0F1219", borderTop:"1px solid #1A1E2E", borderBottom:"1px solid #1A1E2E" }}>
          <span style={{ fontSize:14, fontWeight:700, fontFamily:"'SF Mono',monospace",
            color: market.ch >= 0 ? "#00E5A0" : "#FF4F6B" }}>
            {fmtPrice(market.price, market.sym)}
          </span>
          <span style={{ fontSize:10, color:"#555C78" }}>Spread: {spreadPct}%</span>
        </div>
        <div>
          {book.bids.map((r,i) => <Row key={i} row={r} side="bid" />)}
        </div>
      </div>
    </div>
  );
}

// ── Trade Form ─────────────────────────────────────────────────────────────
function TradeForm({ market }) {
  const [side, setSide] = useState("long");
  const [orderType, setOrderType] = useState("market");
  const [size, setSize] = useState("");
  const [lev, setLev] = useState(10);
  const [limitPrice, setLimitPrice] = useState("");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [showTpSl, setShowTpSl] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [livePrice] = useAnimatedPrice(market.price);
  const notional = (parseFloat(size) || 0) * lev;
  const margin = notional / lev;
  const fee = notional * 0.0005;
  const liqPrice = side === "long"
    ? livePrice * (1 - 1/lev * 0.9)
    : livePrice * (1 + 1/lev * 0.9);

  const handleSubmit = () => {
    if (!size) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const PCT_BTNS = [25, 50, 75, 100];
  const LEV_MARKS = [1,2,5,10,20,50,market.lev];

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12, height:"100%", overflowY:"auto" }}>
      {/* Long / Short toggle */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, background:"#0C0E18", borderRadius:8, padding:4 }}>
        {["long","short"].map(s => (
          <button key={s} onClick={() => setSide(s)} style={{
            padding:"10px 0", borderRadius:6, border:"none", cursor:"pointer", fontWeight:700,
            fontSize:13, letterSpacing:"0.05em", textTransform:"uppercase", transition:"all 0.2s",
            background: side===s ? (s==="long" ? "#00E5A0" : "#FF4F6B") : "transparent",
            color: side===s ? "#000" : (s==="long" ? "#00E5A044" : "#FF4F6B44"),
            boxShadow: side===s ? `0 0 20px ${s==="long"?"#00E5A044":"#FF4F6B44"}` : "none",
          }}>
            {s==="long" ? "▲ Long" : "▼ Short"}
          </button>
        ))}
      </div>

      {/* Order type */}
      <div style={{ display:"flex", gap:4 }}>
        {["market","limit","stop"].map(t => (
          <button key={t} onClick={() => setOrderType(t)} style={{
            flex:1, padding:"6px 0", borderRadius:6, border:`1px solid ${orderType===t?"#5B7FFF":"#1A1E2E"}`,
            background: orderType===t ? "#5B7FFF18" : "transparent",
            color: orderType===t ? "#5B7FFF" : "#555C78",
            fontSize:11, fontWeight:600, cursor:"pointer", textTransform:"capitalize",
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Limit price (if not market) */}
      {orderType !== "market" && (
        <div>
          <label style={{ fontSize:10, color:"#555C78", display:"block", marginBottom:4 }}>LIMIT PRICE (USD)</label>
          <input value={limitPrice} onChange={e=>setLimitPrice(e.target.value)}
            placeholder={fmtPrice(livePrice, market.sym)}
            style={{ width:"100%", background:"#0C0E18", border:"1px solid #1A1E2E",
              borderRadius:8, padding:"10px 12px", color:"#E8EAF0", fontSize:13,
              fontFamily:"'SF Mono',monospace", outline:"none", boxSizing:"border-box" }} />
        </div>
      )}

      {/* Size */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <label style={{ fontSize:10, color:"#555C78" }}>SIZE (USD)</label>
          <span style={{ fontSize:10, color:"#555C78" }}>Balance: <span style={{color:"#8A90A8"}}>$10,000.00</span></span>
        </div>
        <input value={size} onChange={e=>setSize(e.target.value)} placeholder="0.00"
          style={{ width:"100%", background:"#0C0E18", border:"1px solid #1A1E2E",
            borderRadius:8, padding:"10px 12px", color:"#E8EAF0", fontSize:14,
            fontFamily:"'SF Mono',monospace", outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, marginTop:6 }}>
          {PCT_BTNS.map(p => (
            <button key={p} onClick={() => setSize((10000 * p / 100 / lev).toFixed(2))}
              style={{ padding:"5px 0", borderRadius:5, border:"1px solid #1A1E2E",
                background:"#0C0E18", color:"#555C78", fontSize:10, cursor:"pointer",
                transition:"all 0.15s" }}
              onMouseEnter={e=>{e.target.style.borderColor="#5B7FFF";e.target.style.color="#5B7FFF"}}
              onMouseLeave={e=>{e.target.style.borderColor="#1A1E2E";e.target.style.color="#555C78"}}>
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Leverage */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <label style={{ fontSize:10, color:"#555C78" }}>LEVERAGE</label>
          <span style={{ fontSize:13, fontWeight:700, color:"#5B7FFF", fontFamily:"'SF Mono',monospace" }}>{lev}×</span>
        </div>
        <input type="range" min={1} max={market.lev} value={lev} onChange={e=>setLev(+e.target.value)}
          style={{ width:"100%", accentColor:"#5B7FFF", cursor:"pointer" }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {LEV_MARKS.map(m => (
            <span key={m} onClick={() => setLev(m)} style={{ fontSize:9, color: lev===m?"#5B7FFF":"#333A52", cursor:"pointer" }}>{m}×</span>
          ))}
        </div>
      </div>

      {/* TP/SL toggle */}
      <button onClick={() => setShowTpSl(v=>!v)} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"#0C0E18", border:"1px solid #1A1E2E", borderRadius:8,
        padding:"8px 12px", cursor:"pointer", color:"#555C78", fontSize:11 }}>
        <span>Take Profit / Stop Loss</span>
        <span style={{ color:"#5B7FFF", fontSize:14 }}>{showTpSl ? "−" : "+"}</span>
      </button>
      {showTpSl && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["TP Price","#00E5A0",tp,setTp],["SL Price","#FF4F6B",sl,setSl]].map(([label,color,val,set]) => (
            <div key={label}>
              <label style={{ fontSize:10, color:"#555C78", display:"block", marginBottom:4 }}>{label}</label>
              <input value={val} onChange={e=>set(e.target.value)} placeholder="—"
                style={{ width:"100%", background:"#0C0E18", border:`1px solid ${color}33`,
                  borderRadius:6, padding:"8px 10px", color, fontSize:12,
                  fontFamily:"'SF Mono',monospace", outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
      )}

      {/* Order summary */}
      {size && parseFloat(size) > 0 && (
        <div style={{ background:"#0C0E18", borderRadius:8, padding:"10px 12px",
          border:"1px solid #1A1E2E", fontSize:11 }}>
          {[
            ["Entry Price", orderType==="market" ? fmtPrice(livePrice, market.sym) : (limitPrice||"—"), "#E8EAF0"],
            ["Position Size", `$${notional.toFixed(2)}`, "#8A90A8"],
            ["Required Margin", `$${margin.toFixed(2)}`, "#5B7FFF"],
            ["Est. Fee", `$${fee.toFixed(4)}`, "#555C78"],
            ["Liq. Price", fmtPrice(liqPrice, market.sym), "#FF4F6B"],
          ].map(([k,v,c]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ color:"#555C78" }}>{k}</span>
              <span style={{ color:c, fontFamily:"'SF Mono',monospace", fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} style={{
        width:"100%", padding:"14px 0", borderRadius:10, border:"none", cursor:"pointer",
        fontWeight:700, fontSize:14, letterSpacing:"0.05em", transition:"all 0.2s",
        background: submitted ? "#00E5A0" :
          (side==="long" ? "linear-gradient(135deg,#00E5A0,#00B880)" : "linear-gradient(135deg,#FF4F6B,#D63851)"),
        color: submitted ? "#000" : "#fff",
        boxShadow: submitted ? "0 0 30px #00E5A066" :
          side==="long" ? "0 4px 20px #00E5A033" : "0 4px 20px #FF4F6B33",
        transform: submitted ? "scale(0.98)" : "scale(1)",
      }}>
        {submitted ? "✓ Order Placed!" : `${side==="long"?"▲ Open Long":"▼ Open Short"} @ ${lev}×`}
      </button>
    </div>
  );
}

// ── Positions Table ────────────────────────────────────────────────────────
function Positions({ onClose }) {
  const DEMO_POS = [
    { sym:"BTC/USD", side:"long",  size:50000, entry:66200, lev:10, pnl:620.50,  pnlPct:1.24, liq:59580, margin:5000 },
    { sym:"ETH/USD", side:"short", size:10000, entry:3580,  lev:5,  pnl:-44.20,  pnlPct:-0.88, liq:3902, margin:2000 },
    { sym:"XAU/USD", side:"long",  size:5000,  entry:2310,  lev:20, pnl:153.00,  pnlPct:3.06, liq:2195, margin:250  },
    { sym:"EUR/USD", side:"long",  size:25000, entry:1.0841,lev:50, pnl:32.50,   pnlPct:0.13, liq:1.0620, margin:500 },
  ];
  const [positions, setPositions] = useState(DEMO_POS);
  const [closing, setClosing] = useState(null);

  const closePos = (i) => {
    setClosing(i);
    setTimeout(() => {
      setPositions(p => p.filter((_,j) => j !== i));
      setClosing(null);
      onClose?.();
    }, 600);
  };

  return (
    <div style={{ overflowX:"auto", height:"100%" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:"1px solid #1A1E2E" }}>
            {["Market","Side","Size","Entry","Liq Price","Margin","PnL","Actions"].map(h => (
              <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10,
                color:"#555C78", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 && (
            <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:"#333A52", fontSize:13 }}>
              No open positions
            </td></tr>
          )}
          {positions.map((p, i) => (
            <tr key={i} style={{
              borderBottom:"1px solid #1A1E2E11",
              background: closing===i ? "#FF4F6B08" : "transparent",
              transition:"all 0.3s", opacity: closing===i ? 0 : 1,
            }}>
              <td style={{ padding:"10px 12px", fontWeight:700, color:"#E8EAF0" }}>{p.sym}</td>
              <td style={{ padding:"10px 12px" }}>
                <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:700,
                  background: p.side==="long" ? "#00E5A018" : "#FF4F6B18",
                  color: p.side==="long" ? "#00E5A0" : "#FF4F6B",
                  border: `1px solid ${p.side==="long"?"#00E5A033":"#FF4F6B33"}` }}>
                  {p.side==="long"?"▲ LONG":"▼ SHORT"}
                </span>
              </td>
              <td style={{ padding:"10px 12px", fontFamily:"'SF Mono',monospace", color:"#8A90A8" }}>${p.size.toLocaleString()}</td>
              <td style={{ padding:"10px 12px", fontFamily:"'SF Mono',monospace", color:"#8A90A8" }}>{fmtPrice(p.entry, p.sym)}</td>
              <td style={{ padding:"10px 12px", fontFamily:"'SF Mono',monospace", color:"#FF4F6B88" }}>{fmtPrice(p.liq, p.sym)}</td>
              <td style={{ padding:"10px 12px", fontFamily:"'SF Mono',monospace", color:"#5B7FFF" }}>${p.margin.toLocaleString()}</td>
              <td style={{ padding:"10px 12px" }}>
                <div style={{ fontFamily:"'SF Mono',monospace", fontWeight:700,
                  color: p.pnl >= 0 ? "#00E5A0" : "#FF4F6B" }}>
                  {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                </div>
                <div style={{ fontSize:10, color: p.pnl >= 0 ? "#00E5A088" : "#FF4F6B88" }}>
                  {p.pnl >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                </div>
              </td>
              <td style={{ padding:"10px 12px" }}>
                <button onClick={() => closePos(i)} style={{
                  padding:"4px 12px", borderRadius:5, border:"1px solid #FF4F6B44",
                  background:"#FF4F6B11", color:"#FF4F6B", fontSize:11, fontWeight:600,
                  cursor:"pointer", transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.target.style.background="#FF4F6B22";e.target.style.borderColor="#FF4F6B"}}
                  onMouseLeave={e=>{e.target.style.background="#FF4F6B11";e.target.style.borderColor="#FF4F6B44"}}>
                  Close
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Market Row in Sidebar ──────────────────────────────────────────────────
function MarketRow({ m, selected, onClick }) {
  const [price, dir] = useAnimatedPrice(m.price);
  return (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
      cursor:"pointer", borderRadius:8, margin:"1px 6px", transition:"background 0.15s",
      background: selected ? "#5B7FFF12" : "transparent",
      borderLeft: selected ? "2px solid #5B7FFF" : "2px solid transparent",
    }}
    onMouseEnter={e=>{ if(!selected) e.currentTarget.style.background="#ffffff05" }}
    onMouseLeave={e=>{ if(!selected) e.currentTarget.style.background="transparent" }}>
      <div style={{ width:30, height:30, borderRadius:8, background:`${m.color}18`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:12, fontWeight:800, color:m.color, flexShrink:0, border:`1px solid ${m.color}33` }}>
        {m.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:12, color: selected?"#E8EAF0":"#8A90A8",
          display:"flex", alignItems:"center", gap:4 }}>
          {m.sym}
          <span style={{ fontSize:9, color:"#5B7FFF99", background:"#5B7FFF11",
            padding:"1px 4px", borderRadius:3 }}>{m.lev}×</span>
        </div>
        <div style={{ fontSize:10, color:"#333A52", marginTop:1 }}>{m.cat}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontFamily:"'SF Mono',monospace", fontSize:11, fontWeight:600,
          color: dir==="up" ? "#00E5A0" : dir==="down" ? "#FF4F6B" : (selected?"#E8EAF0":"#8A90A8"),
          transition:"color 0.3s" }}>
          {fmtPrice(price, m.sym)}
        </div>
        <div style={{ fontSize:10, color: m.ch>=0?"#00E5A099":"#FF4F6B99", marginTop:1 }}>
          {m.ch>=0?"+":""}{m.ch.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

// ── Top Ticker Bar ─────────────────────────────────────────────────────────
function TickerBar({ market }) {
  const [price, dir] = useAnimatedPrice(market.price);
  const stats = [
    ["24h High", fmtPrice(market.price * 1.028, market.sym), "#E8EAF0"],
    ["24h Low",  fmtPrice(market.price * 0.971, market.sym), "#E8EAF0"],
    ["24h Vol",  "$284.3M", "#8A90A8"],
    ["OI Long",  "$48.2M",  "#00E5A0"],
    ["OI Short", "$41.7M",  "#FF4F6B"],
    ["Funding",  "+0.0100%","#5B7FFF"],
    ["Next",     "02:14",   "#555C78"],
    ["Max Lev",  `${market.lev}×`, "#F5C842"],
    ["Oracle",   "Chainlink","#555C78"],
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, padding:"0 16px",
      borderBottom:"1px solid #1A1E2E", height:48, overflowX:"auto", flexShrink:0,
      background:"#0A0C14" }}>
      {/* Symbol + price */}
      <div style={{ display:"flex", alignItems:"center", gap:10, paddingRight:20,
        borderRight:"1px solid #1A1E2E", flexShrink:0, marginRight:20 }}>
        <div style={{ width:28, height:28, borderRadius:6, background:`${market.color}18`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, color:market.color, fontWeight:800 }}>{market.icon}</div>
        <div>
          <div style={{ fontWeight:800, fontSize:13, color:"#E8EAF0", lineHeight:1 }}>{market.sym}</div>
          <div style={{ fontSize:9, color:"#555C78", textTransform:"uppercase", letterSpacing:1 }}>{market.cat}</div>
        </div>
        <div style={{ marginLeft:8 }}>
          <div style={{ fontFamily:"'SF Mono',monospace", fontSize:18, fontWeight:700,
            color: dir==="up" ? "#00E5A0" : dir==="down" ? "#FF4F6B" : "#E8EAF0",
            transition:"color 0.3s" }}>{fmtPrice(price, market.sym)}</div>
          <div style={{ fontSize:10, color: market.ch>=0?"#00E5A0":"#FF4F6B" }}>
            {market.ch>=0?"+":""}{market.ch.toFixed(2)}%
          </div>
        </div>
      </div>
      {/* Stats */}
      {stats.map(([k,v,c]) => (
        <div key={k} style={{ paddingRight:20, flexShrink:0 }}>
          <div style={{ fontSize:9, color:"#555C78", marginBottom:2, whiteSpace:"nowrap" }}>{k}</div>
          <div style={{ fontFamily:"'SF Mono',monospace", fontSize:11, color:c, fontWeight:600 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function WikiciousApp() {
  const [activeMkt, setActiveMkt] = useState(MARKETS[0]);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("positions");
  const [navTab, setNavTab] = useState("trade");
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredMkts = MARKETS.filter(m =>
    (cat==="all" || m.cat===cat) &&
    (m.sym.toLowerCase().includes(search.toLowerCase()))
  );

  const NAV = [
    { id:"trade",    label:"Trade",      icon:"📊" },
    { id:"markets",  label:"Markets",    icon:"🌐" },
    { id:"prop",     label:"Prop",       icon:"🏆" },
    { id:"social",   label:"Social",     icon:"💬" },
    { id:"referral", label:"Referral",   icon:"🎁" },
    { id:"wallet",   label:"Wallet",     icon:"💼" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#080A12",
      color:"#E8EAF0", fontFamily:"'DM Sans',-apple-system,sans-serif", overflow:"hidden",
      position:"relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:9999,
          padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:600,
          background: toast.type==="success" ? "#00E5A0" : "#FF4F6B",
          color:"#000", boxShadow:`0 8px 32px ${toast.type==="success"?"#00E5A066":"#FF4F6B66"}`,
          animation:"slideIn 0.3s ease" }}>
          {toast.type==="success" ? "✓ " : "✗ "}{toast.msg}
        </div>
      )}

      {/* Top Nav */}
      <div style={{ display:"flex", alignItems:"center", height:52, background:"#0A0C14",
        borderBottom:"1px solid #1A1E2E", padding:"0 16px", flexShrink:0, gap:4 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:24 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5B7FFF,#00E5A0)",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#000" }}>W</div>
          <span style={{ fontWeight:800, fontSize:15, color:"#E8EAF0", letterSpacing:"-0.02em" }}>Wikicious</span>
          <span style={{ fontSize:9, background:"#5B7FFF18", color:"#5B7FFF", padding:"2px 6px",
            borderRadius:4, border:"1px solid #5B7FFF33", fontWeight:700 }}>BETA</span>
        </div>

        {/* Nav tabs */}
        <div style={{ display:"flex", gap:2, flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setNavTab(n.id)} style={{
              padding:"6px 14px", borderRadius:7, border:"none", cursor:"pointer",
              background: navTab===n.id ? "#5B7FFF18" : "transparent",
              color: navTab===n.id ? "#5B7FFF" : "#555C78",
              fontSize:12, fontWeight:600, transition:"all 0.15s",
              borderBottom: navTab===n.id ? "2px solid #5B7FFF" : "2px solid transparent" }}
              onMouseEnter={e=>{ if(navTab!==n.id) e.currentTarget.style.color="#8A90A8" }}
              onMouseLeave={e=>{ if(navTab!==n.id) e.currentTarget.style.color="#555C78" }}>
              <span style={{ marginRight:5 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px",
            background:"#00E5A011", border:"1px solid #00E5A033", borderRadius:20 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#00E5A0",
              boxShadow:"0 0 6px #00E5A0" }} />
            <span style={{ fontSize:10, color:"#00E5A0", fontWeight:700 }}>Arbitrum</span>
          </div>
          <button onClick={() => setConnected(v=>!v)} style={{
            padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
            background: connected ? "#1A1E2E" : "linear-gradient(135deg,#5B7FFF,#7B5AFF)",
            color: connected ? "#8A90A8" : "#fff",
            fontSize:12, fontWeight:700, transition:"all 0.2s",
            boxShadow: connected ? "none" : "0 4px 16px #5B7FFF44" }}>
            {connected ? "0x4f3a...8b2c" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {/* Main content area */}
      {navTab === "trade" ? (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Markets Sidebar */}
          <div style={{ width: sidebarOpen ? 240 : 0, flexShrink:0, overflow:"hidden",
            background:"#0A0C14", borderRight:"1px solid #1A1E2E",
            display:"flex", flexDirection:"column", transition:"width 0.2s" }}>
            {/* Search */}
            <div style={{ padding:"10px 10px 6px" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search markets..."
                style={{ width:"100%", background:"#12151F", border:"1px solid #1A1E2E",
                  borderRadius:8, padding:"7px 10px", color:"#E8EAF0", fontSize:12,
                  outline:"none", boxSizing:"border-box" }} />
            </div>
            {/* Category filter */}
            <div style={{ display:"flex", gap:3, padding:"0 10px 8px", flexWrap:"wrap" }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{
                  padding:"3px 8px", borderRadius:4, border:"none", cursor:"pointer",
                  background: cat===c ? "#5B7FFF22" : "transparent",
                  color: cat===c ? "#5B7FFF" : "#555C78",
                  fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>
                  {c}
                </button>
              ))}
            </div>
            {/* Market list */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {filteredMkts.map(m => (
                <MarketRow key={m.id} m={m} selected={activeMkt.id===m.id}
                  onClick={() => setActiveMkt(m)} />
              ))}
            </div>
          </div>

          {/* Chart + trading area */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
            {/* Ticker */}
            <TickerBar market={activeMkt} />

            {/* Middle row: chart + orderbook + tradeform */}
            <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
              {/* Chart */}
              <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
                <CandleChart market={activeMkt} />
              </div>

              {/* Right panel: orderbook + trade form */}
              <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column",
                borderLeft:"1px solid #1A1E2E", overflow:"hidden" }}>
                {/* Orderbook */}
                <div style={{ flex:1, overflow:"hidden", borderBottom:"1px solid #1A1E2E", minHeight:0 }}>
                  <div style={{ padding:"8px 12px", fontSize:10, fontWeight:700,
                    color:"#555C78", letterSpacing:"0.1em", borderBottom:"1px solid #1A1E2E" }}>
                    ORDER BOOK
                  </div>
                  <div style={{ height:"calc(100% - 33px)", overflow:"hidden" }}>
                    <OrderBook market={activeMkt} />
                  </div>
                </div>
                {/* Trade form */}
                <div style={{ height:460, overflow:"hidden", flexShrink:0 }}>
                  <div style={{ padding:"8px 12px", fontSize:10, fontWeight:700,
                    color:"#555C78", letterSpacing:"0.1em", borderBottom:"1px solid #1A1E2E" }}>
                    PLACE ORDER
                  </div>
                  <div style={{ height:"calc(100% - 33px)", overflow:"auto" }}>
                    <TradeForm market={activeMkt} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom panel: positions / orders / history */}
            <div style={{ height:200, flexShrink:0, borderTop:"1px solid #1A1E2E",
              display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:0,
                borderBottom:"1px solid #1A1E2E", background:"#0A0C14" }}>
                {[
                  ["positions","Positions","4"],
                  ["orders","Open Orders","1"],
                  ["history","History",""],
                  ["funding","Funding",""],
                ].map(([id,label,badge]) => (
                  <button key={id} onClick={() => setTab(id)} style={{
                    padding:"8px 16px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                    background:"transparent", transition:"all 0.15s",
                    color: tab===id ? "#E8EAF0" : "#555C78",
                    borderBottom: tab===id ? "2px solid #5B7FFF" : "2px solid transparent" }}>
                    {label}
                    {badge && <span style={{ marginLeft:5, background:"#5B7FFF33", color:"#5B7FFF",
                      fontSize:9, padding:"1px 5px", borderRadius:8, fontWeight:700 }}>{badge}</span>}
                  </button>
                ))}
                <div style={{ marginLeft:"auto", padding:"0 12px", display:"flex", gap:16, fontSize:11 }}>
                  <span style={{ color:"#555C78" }}>Total PnL: <span style={{color:"#00E5A0",fontWeight:700}}>+$761.30</span></span>
                  <span style={{ color:"#555C78" }}>Margin Used: <span style={{color:"#5B7FFF",fontWeight:700}}>$7,750</span></span>
                </div>
              </div>
              <div style={{ flex:1, overflow:"auto" }}>
                {tab === "positions" && <Positions onClose={() => showToast("Position closed")} />}
                {tab === "orders" && (
                  <div style={{ padding:16 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead><tr>{["Market","Type","Side","Price","Size","Status",""].map(h=>(
                        <th key={h} style={{padding:"4px 12px",textAlign:"left",fontSize:10,color:"#555C78"}}>{h}</th>
                      ))}</tr></thead>
                      <tbody><tr>
                        <td style={{padding:"8px 12px",color:"#E8EAF0",fontWeight:700}}>BTC/USD</td>
                        <td style={{padding:"8px 12px",color:"#8A90A8"}}>Limit</td>
                        <td style={{padding:"8px 12px"}}><span style={{color:"#00E5A0",fontWeight:700}}>Long</span></td>
                        <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#8A90A8"}}>64,500.00</td>
                        <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#8A90A8"}}>$5,000</td>
                        <td style={{padding:"8px 12px"}}><span style={{color:"#F5C842",fontSize:10,fontWeight:700}}>● PENDING</span></td>
                        <td style={{padding:"8px 12px"}}><button onClick={()=>showToast("Order cancelled","error")}
                          style={{padding:"3px 10px",borderRadius:4,border:"1px solid #FF4F6B33",
                            background:"#FF4F6B11",color:"#FF4F6B",fontSize:10,cursor:"pointer"}}>Cancel</button></td>
                      </tr></tbody>
                    </table>
                  </div>
                )}
                {tab === "history" && (
                  <div style={{ padding:24, textAlign:"center", color:"#333A52", fontSize:13 }}>
                    Trade history will appear here
                  </div>
                )}
                {tab === "funding" && (
                  <div style={{ padding:16, display:"flex", gap:16, fontSize:12 }}>
                    {[["BTC/USD","+0.0100%","02:14:33"],["ETH/USD","-0.0050%","02:14:33"],["XAU/USD","+0.0080%","05:44:12"]].map(([s,f,t])=>(
                      <div key={s} style={{background:"#0C0E18",borderRadius:8,padding:"10px 14px",border:"1px solid #1A1E2E"}}>
                        <div style={{fontWeight:700,color:"#E8EAF0",marginBottom:4}}>{s}</div>
                        <div style={{color:f.startsWith("+")?"#00E5A0":"#FF4F6B",fontFamily:"monospace",fontWeight:700,fontSize:14}}>{f}</div>
                        <div style={{color:"#555C78",fontSize:10,marginTop:2}}>Next: {t}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Other nav pages placeholder */
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", gap:16, color:"#333A52" }}>
          <div style={{ fontSize:48 }}>{NAV.find(n=>n.id===navTab)?.icon}</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#555C78" }}>
            {NAV.find(n=>n.id===navTab)?.label} — Coming Soon
          </div>
          <div style={{ fontSize:13 }}>Switch to Trade to use the full terminal</div>
          <button onClick={()=>setNavTab("trade")} style={{
            padding:"10px 24px", borderRadius:8, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#5B7FFF,#7B5AFF)", color:"#fff", fontWeight:700 }}>
            Open Trading Terminal
          </button>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1A1E2E; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #2A2E3E; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        input[type=range] { height: 4px; }
        input[type=range]::-webkit-slider-thumb { width: 14px; height: 14px; }
        input::placeholder { color: #333A52; }
        input { color-scheme: dark; }
      `}</style>
    </div>
  );
}
