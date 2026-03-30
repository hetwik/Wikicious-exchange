import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '../components/layout/AppLayout';

const S = {
  bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138',
  t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270',
  a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7', teal:'#00D4FF'
};

const TABS = [
  { id:'webhook',   icon:'🔗', label:'TradingView Webhooks' },
  { id:'apikeys',   icon:'🔑', label:'API Keys'             },
  { id:'smartorder',icon:'🎯', label:'Smart Orders'         },
  { id:'backtest',  icon:'📊', label:'Backtester'           },
  { id:'signals',   icon:'📡', label:'Signal Marketplace'   },
];

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_WEBHOOKS = [
  { id:1, name:'BTC RSI Divergence',   market:'BTCUSDT', active:true,  triggers:248, lastHit:'2m ago',   secret:'wh_4f2a...c8e1' },
  { id:2, name:'ETH Trend Breakout',   market:'ETHUSDT', active:true,  triggers:84,  lastHit:'18m ago',  secret:'wh_8b3c...f2d4' },
  { id:3, name:'LINK MACD Signal',     market:'LINKUSDT',active:false, triggers:12,  lastHit:'2d ago',   secret:'wh_2c9e...a7b5' },
];

const MOCK_APIKEYS = [
  { id:1, name:'TradingView Bot',       permissions:['trade','read'], created:'Jan 12', lastUsed:'2m ago',  calls:8420  },
  { id:2, name:'Python Algo Script',    permissions:['trade','read'], created:'Feb 3',  lastUsed:'1h ago',  calls:2840  },
  { id:3, name:'MetaTrader Bridge',     permissions:['read'],         created:'Mar 8',  lastUsed:'5d ago',  calls:184   },
];

const SMART_ORDER_TYPES = [
  {
    id:'twap', name:'TWAP', full:'Time-Weighted Average Price', icon:'⏱', color:S.a,
    desc:'Splits your order into equal slices executed at regular intervals over a time window. Minimises market impact for large orders.',
    params:[['Total Size','$10,000'],['Duration','4 hours'],['Intervals','48 (every 5min)'],['Market','BTCUSDT']],
    useCase:'Accumulate 0.15 BTC over 4 hours without moving the price.',
  },
  {
    id:'vwap', name:'VWAP', full:'Volume-Weighted Average Price', icon:'📊', color:S.gold,
    desc:'Executes slices weighted by historical volume profile. Trades more during high-volume periods (market open/close) and less during quiet hours.',
    params:[['Total Size','$25,000'],['Target','Beat VWAP'],['Window','1 day'],['Market','ETHUSDT']],
    useCase:'Institutional-grade execution that tracks daily volume profile.',
  },
  {
    id:'iceberg', name:'Iceberg', full:'Hidden Order Size', icon:'🧊', color:S.teal,
    desc:'Shows only a small visible portion of your order on the book. Remaining size is hidden and automatically refills when the visible portion fills.',
    params:[['Total Size','$50,000'],['Visible Slice','$2,000'],['Price','Limit $67,250'],['Market','BTCUSDT']],
    useCase:'Post a $50K buy limit without tipping off other traders.',
  },
  {
    id:'chase', name:'Chase', full:'Price Chase Order', icon:'🏃', color:S.p,
    desc:'Continuously re-prices a limit order to stay just inside the spread. Guarantees maker fee while still executing quickly.',
    params:[['Size','$5,000'],['Max Spread','0.02%'],['Timeout','10 min'],['Market','SOLUSDT']],
    useCase:'Get maker fee on a trade you need filled within 10 minutes.',
  },
  {
    id:'sniper', name:'Sniper', full:'Breakout Sniper', icon:'🎯', color:S.r,
    desc:'Watches for a price level breach then executes instantly at market. Combines with a stop-loss to enter breakouts with defined risk.',
    params:[['Trigger Price','$68,000'],['Size','$3,000'],['Stop-Loss','$66,500'],['Market','BTCUSDT']],
    useCase:'Enter BTC the moment it breaks all-time high resistance.',
  },
  {
    id:'scale', name:'Scale In/Out', full:'Scaled Position Entry', icon:'📈', color:S.g,
    desc:'Divides your total size into tranches at different price levels (e.g. 30% at market, 30% at -2%, 40% at -4%). Averages into or out of a position.',
    params:[['Total Size','$9,000'],['Tranches','3 × $3,000'],['Spacing','-2% each'],['Market','ARBUSDT']],
    useCase:'Average into a long position across a dip zone.',
  },
];

const MOCK_SIGNALS = [
  { id:1, name:'Quant Alpha',    author:'0x4f2a…b8c1', strategy:'ML momentum + funding rate', winRate:'71.4%', pnl30d:'+$48,240', subscribers:284, price:'Free + 10% profit share', sharpe:'2.84', maxDD:'-4.2%', markets:'BTC, ETH, SOL', verified:true,  badge:'🏆 Top Performer' },
  { id:2, name:'TrendMaster Pro',author:'0x7b3c…d2e4', strategy:'EMA cross + volume filter',  winRate:'68.2%', pnl30d:'+$31,800', subscribers:184, price:'Free + 10% profit share', sharpe:'1.94', maxDD:'-8.1%', markets:'BTC, ETH',      verified:true,  badge:'⚡ Trending'     },
  { id:3, name:'DeltaArb',       author:'0x2c8f…a1b3', strategy:'Funding rate arbitrage',      winRate:'84.1%', pnl30d:'+$18,420', subscribers:92,  price:'Free + 10% profit share', sharpe:'3.42', maxDD:'-1.8%', markets:'BTC, ETH, BNB', verified:false, badge:'📊 Low Risk'     },
  { id:4, name:'MomentumBot',    author:'0x9e1a…4c2d', strategy:'Breakout + MACD confirm',    winRate:'62.8%', pnl30d:'+$14,240', subscribers:47,  price:'Free + 10% profit share', sharpe:'1.42', maxDD:'-12.4%',markets:'ETH, SOL, ARB', verified:false, badge:'🔥 High Return'  },
];

// Fake equity curve data
const genEquityCurve = (n=60, seed=1) => {
  let v = 10000, arr = [];
  for (let i=0; i<n; i++) {
    v *= (1 + (Math.sin(i*0.3+seed)*0.008 + (0.5-0.48)*0.012));
    arr.push(Math.round(v));
  }
  return arr;
};

function MiniChart({ data, color='#00E5A0', h=48 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v,i) => `${(i/(data.length-1)*200).toFixed(1)},${((1-(v-min)/(max-min))*h).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 200 ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`cg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none"/>
      <polygon points={`0,${h} ${pts} 200,${h}`} fill={`url(#cg${color.slice(1)})`}/>
    </svg>
  );
}

// ── Tab Components ─────────────────────────────────────────────────────────

function WebhookTab() {
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newMkt,  setNewMkt]    = useState('BTCUSDT');

  const PINE_EXAMPLE = `// TradingView Pine Script alert message format:
{
  "action": "{{strategy.order.action}}",
  "market": "BTCUSDT",
  "size_usd": 500,
  "leverage": 10,
  "tp": {{strategy.order.contracts}},
  "sl": {{close}} * 0.97
}`;

  return (
    <div>
      {/* Intro */}
      <div style={{ background:`${S.a}0D`, border:`1px solid ${S.a}25`, borderRadius:11, padding:'14px 18px', marginBottom:20, display:'flex', gap:16 }}>
        <div style={{ fontSize:28, flexShrink:0 }}>🔗</div>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:4 }}>TradingView Webhook Integration</div>
          <div style={{ fontSize:11, color:S.t2, lineHeight:1.7 }}>
            Create a webhook URL → paste into TradingView alert → your strategy fires real trades on Wikicious automatically.
            Send JSON payloads from any tool: TradingView, Pine Script, Python, MetaTrader, NinjaTrader, cTrader.
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          ['1', 'Create Webhook', 'Generate a unique secret URL for your strategy', S.a],
          ['2', 'Add to TradingView', 'Paste URL into your Pine Script alert → Webhook URL field', S.gold],
          ['3', 'Alert Fires', 'TradingView sends JSON payload when your signal triggers', S.p],
          ['4', 'Trade Executes', 'Wikicious receives it → executes on WikiPerp on-chain', S.g],
        ].map(([step,title,desc,color]) => (
          <div key={step} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:11, padding:14 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color, marginBottom:8 }}>{step}</div>
            <div style={{ fontWeight:800, fontSize:12, color:S.t1, marginBottom:4 }}>{title}</div>
            <div style={{ fontSize:10, color:S.t3, lineHeight:1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Webhook list */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>Your Webhooks ({MOCK_WEBHOOKS.length})</div>
        <button onClick={() => setNewModal(true)} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:S.a, color:'#fff', fontWeight:800, fontSize:11, cursor:'pointer' }}>
          + New Webhook
        </button>
      </div>

      {MOCK_WEBHOOKS.map(wh => (
        <div key={wh.id} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:wh.active?S.g:S.t3, boxShadow:wh.active?`0 0 6px ${S.g}`:'none' }}/>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>{wh.name}</div>
                <div style={{ fontSize:10, color:S.t3 }}>{wh.market} · {wh.triggers} triggers · last: {wh.lastHit}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'3px 10px', borderRadius:6, background:wh.active?'#00E5A015':'#4A527020', color:wh.active?S.g:S.t3, fontSize:10, fontWeight:700, border:`1px solid ${wh.active?'#00E5A030':'#4A527030'}` }}>
                {wh.active ? '● Active' : '○ Paused'}
              </span>
              <button style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${S.b}`, background:'transparent', color:S.t3, fontSize:10, cursor:'pointer' }}>Edit</button>
              <button style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${S.r}30`, background:'transparent', color:S.r, fontSize:10, cursor:'pointer' }}>Delete</button>
            </div>
          </div>
          {/* Webhook URL */}
          <div style={{ background:'#0A0C16', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:'monospace', fontSize:11, color:S.t2 }}>https://api.wikicious.io/webhook/{wh.secret}</div>
            <button onClick={() => navigator.clipboard?.writeText(`https://api.wikicious.io/webhook/${wh.secret}`)} style={{ padding:'3px 10px', borderRadius:5, border:`1px solid ${S.a}30`, background:`${S.a}10`, color:S.a, fontSize:9, fontWeight:700, cursor:'pointer' }}>📋 Copy</button>
          </div>
        </div>
      ))}

      {/* Pine Script example */}
      <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginTop:20 }}>
        <div style={{ fontWeight:800, fontSize:13, color:S.t1, marginBottom:10 }}>📋 Pine Script Alert Message Format</div>
        <div style={{ background:'#0A0C16', borderRadius:8, padding:14, fontFamily:'monospace', fontSize:11, color:'#00E5A0', lineHeight:1.8, whiteSpace:'pre' }}>{PINE_EXAMPLE}</div>
        <div style={{ marginTop:10, fontSize:11, color:S.t3, lineHeight:1.7 }}>
          Supported fields: <span style={{color:S.t1}}>action</span> (buy/sell), <span style={{color:S.t1}}>market</span>, <span style={{color:S.t1}}>size_usd</span>, <span style={{color:S.t1}}>leverage</span> (1–125), <span style={{color:S.t1}}>tp</span>, <span style={{color:S.t1}}>sl</span>, <span style={{color:S.t1}}>close_all</span> (true/false)
        </div>
      </div>

      {/* New webhook modal */}
      {newModal && (
        <div style={{ position:'fixed', inset:0, background:'#00000080', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#0D1017', border:`1px solid ${S.b}`, borderRadius:16, padding:28, width:440 }}>
            <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:20 }}>New Webhook</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:6 }}>STRATEGY NAME</div>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. BTC RSI Divergence" style={{ width:'100%', background:S.s2, border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:13, padding:'10px 12px', outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:6 }}>DEFAULT MARKET</div>
              <select value={newMkt} onChange={e=>setNewMkt(e.target.value)} style={{ width:'100%', background:S.s2, border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:13, padding:'10px 12px', outline:'none' }}>
                {['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT','LINKUSDT','PEPEUSDT'].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ background:`${S.gold}10`, border:`1px solid ${S.gold}30`, borderRadius:8, padding:'10px 12px', marginBottom:18, fontSize:11, color:S.gold }}>
              ⚠️ Your webhook secret is shown once. Store it securely — it authorises real trades.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setNewModal(false)} style={{ flex:1, padding:12, borderRadius:9, border:`1px solid ${S.b}`, background:'transparent', color:S.t3, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => setNewModal(false)} style={{ flex:1, padding:12, borderRadius:9, border:'none', background:S.a, color:'#fff', fontWeight:900, cursor:'pointer' }}>Create Webhook</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function APIKeysTab() {
  const [showNew, setShowNew] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [perms, setPerms] = useState({ trade:true, read:true, withdraw:false });

  return (
    <div>
      <div style={{ background:`${S.gold}0D`, border:`1px solid ${S.gold}25`, borderRadius:11, padding:'14px 18px', marginBottom:20, display:'flex', gap:14 }}>
        <div style={{ fontSize:28 }}>🔑</div>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:4 }}>API Key Management</div>
          <div style={{ fontSize:11, color:S.t2, lineHeight:1.7 }}>
            Generate API keys for automated trading from external tools — Python scripts, MetaTrader bridges, algorithmic systems. Keys are scoped by permission and can be revoked instantly.
          </div>
        </div>
      </div>

      {/* Endpoints overview */}
      <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:13, color:S.t1, marginBottom:12 }}>REST API Endpoints</div>
        {[
          ['POST','/api/v1/order',       'Place a market or limit order',      S.g],
          ['DELETE','/api/v1/order/:id', 'Cancel an open order',               S.r],
          ['GET','/api/v1/positions',    'Get your open positions',            S.a],
          ['GET','/api/v1/orderbook',    'Real-time order book depth',         S.a],
          ['GET','/api/v1/price/:market','Current mark price for a market',    S.a],
          ['POST','/api/v1/close',       'Close a position fully or partially', S.gold],
          ['GET','/api/v1/account',      'Account balance and margin info',    S.a],
          ['GET','/api/v1/history',      'Trade history (paginated)',          S.a],
        ].map(([method, path, desc, color]) => (
          <div key={path} style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 0', borderBottom:`1px solid ${S.b}20` }}>
            <span style={{ fontFamily:'monospace', fontSize:10, fontWeight:800, color, background:`${color}15`, padding:'2px 8px', borderRadius:4, minWidth:48, textAlign:'center' }}>{method}</span>
            <span style={{ fontFamily:'monospace', fontSize:11, color:S.t1, flex:1 }}>{path}</span>
            <span style={{ fontSize:10, color:S.t3 }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* Key list */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>Your API Keys ({MOCK_APIKEYS.length})</div>
        <button onClick={() => setShowNew(true)} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:S.gold, color:'#000', fontWeight:800, fontSize:11, cursor:'pointer' }}>
          + Generate Key
        </button>
      </div>

      {MOCK_APIKEYS.map(k => (
        <div key={k.id} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>{k.name}</div>
              <div style={{ fontSize:10, color:S.t3 }}>Created {k.created} · Last used {k.lastUsed} · {k.calls.toLocaleString()} API calls</div>
            </div>
            <button style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${S.r}30`, background:`${S.r}10`, color:S.r, fontSize:10, fontWeight:700, cursor:'pointer' }}>Revoke</button>
          </div>
          {/* Key preview */}
          <div style={{ background:'#0A0C16', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontFamily:'monospace', fontSize:11, color:S.t3 }}>wk_live_••••••••••••••••••••••{k.id}f8a</div>
            <span style={{ fontSize:9, color:S.t3 }}>Shown once at creation</span>
          </div>
          {/* Permissions */}
          <div style={{ display:'flex', gap:6 }}>
            {k.permissions.map(p => (
              <span key={p} style={{ padding:'2px 9px', borderRadius:5, background:`${S.a}15`, color:S.a, border:`1px solid ${S.a}30`, fontSize:9, fontWeight:700 }}>{p}</span>
            ))}
          </div>
        </div>
      ))}

      {/* Python example */}
      <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginTop:20 }}>
        <div style={{ fontWeight:800, fontSize:13, color:S.t1, marginBottom:10 }}>🐍 Python SDK Example</div>
        <div style={{ background:'#0A0C16', borderRadius:8, padding:14, fontFamily:'monospace', fontSize:11, color:'#A855F7', lineHeight:1.9, whiteSpace:'pre' }}>{`import wikicious

client = wikicious.Client(api_key="wk_live_your_key_here")

# Open a BTC long (10× leverage, $500 collateral)
order = client.order(
    market   = "BTCUSDT",
    side     = "long",
    size_usd = 500,
    leverage = 10,
    tp       = 72000,
    sl       = 64000,
)
print(f"Position ID: {order['positionId']}")`}</div>
      </div>

      {/* New key modal */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'#00000080', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#0D1017', border:`1px solid ${S.b}`, borderRadius:16, padding:28, width:440 }}>
            <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:20 }}>Generate API Key</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:6 }}>KEY NAME</div>
              <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="e.g. My Python Script" style={{ width:'100%', background:S.s2, border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:13, padding:'10px 12px', outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:8 }}>PERMISSIONS</div>
              {[['trade','Execute trades (open/close positions)'],['read','Read account, positions, prices'],['withdraw','Withdraw funds (⚠️ high risk)']].map(([p,desc]) => (
                <label key={p} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', borderBottom:`1px solid ${S.b}20` }}>
                  <input type="checkbox" checked={perms[p]} onChange={e=>setPerms({...perms,[p]:e.target.checked})} style={{ accentColor:S.a, width:14, height:14 }}/>
                  <div><div style={{ fontSize:12, fontWeight:700, color:S.t1 }}>{p}</div><div style={{ fontSize:10, color:S.t3 }}>{desc}</div></div>
                </label>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowNew(false)} style={{ flex:1, padding:12, borderRadius:9, border:`1px solid ${S.b}`, background:'transparent', color:S.t3, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => setShowNew(false)} style={{ flex:1, padding:12, borderRadius:9, border:'none', background:S.gold, color:'#000', fontWeight:900, cursor:'pointer' }}>Generate Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SmartOrderTab() {
  const [selected, setSelected] = useState(SMART_ORDER_TYPES[0]);
  const [amount, setAmount] = useState('10000');

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
      {/* Order type grid */}
      <div>
        <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:4 }}>Smart Order Types</div>
        <div style={{ fontSize:11, color:S.t3, marginBottom:16 }}>Institutional-grade execution algorithms. Reduce slippage, hide order size, automate entry strategies.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {SMART_ORDER_TYPES.map(ot => (
            <div key={ot.id} onClick={() => setSelected(ot)}
              style={{ background:selected.id===ot.id?`${ot.color}10`:S.s1, border:`2px solid ${selected.id===ot.id?ot.color:S.b}`, borderRadius:13, padding:14, cursor:'pointer', transition:'all .12s' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{ot.icon}</div>
              <div style={{ fontWeight:900, fontSize:14, color:ot.color, marginBottom:2 }}>{ot.name}</div>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:8 }}>{ot.full}</div>
              <div style={{ fontSize:10, color:S.t2, lineHeight:1.6 }}>{ot.desc.slice(0,80)}...</div>
            </div>
          ))}
        </div>

        {/* Use case */}
        <div style={{ marginTop:16, background:S.s1, border:`1px solid ${selected.color}30`, borderRadius:12, padding:16 }}>
          <div style={{ fontSize:9, color:selected.color, fontWeight:700, marginBottom:4 }}>💡 USE CASE</div>
          <div style={{ fontSize:12, color:S.t2, fontStyle:'italic' }}>"{selected.useCase}"</div>
        </div>
      </div>

      {/* Order form */}
      <div style={{ position:'sticky', top:68, height:'fit-content' }}>
        <div style={{ background:S.s1, border:`2px solid ${selected.color}40`, borderRadius:14, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <span style={{ fontSize:24 }}>{selected.icon}</span>
            <div>
              <div style={{ fontWeight:900, fontSize:16, color:selected.color }}>{selected.name} Order</div>
              <div style={{ fontSize:10, color:S.t3 }}>{selected.full}</div>
            </div>
          </div>

          {/* Params */}
          {selected.params.map(([k,v]) => (
            <div key={k} style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>{k.toUpperCase()}</div>
              <div style={{ background:'#0A0C16', borderRadius:8, padding:'9px 12px', fontFamily:'monospace', fontSize:13, color:S.t1, fontWeight:700 }}>{v}</div>
            </div>
          ))}

          {/* How it executes */}
          <div style={{ background:'#0A0C16', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:6 }}>EXECUTION PREVIEW</div>
            {selected.id==='twap' && ['00:00 Slice 1/48: $208.33','00:05 Slice 2/48: $208.33','00:10 Slice 3/48: $208.33','... continues every 5min...','03:55 Slice 48/48: $208.33'].map(s=><div key={s} style={{fontSize:10,color:S.t2,fontFamily:'monospace',padding:'2px 0'}}>{s}</div>)}
            {selected.id==='iceberg' && ['Show $2,000 on book','Wait for fill...','Refill $2,000 automatically','Repeat until $50,000 filled','Hidden: $48,000 remaining'].map(s=><div key={s} style={{fontSize:10,color:S.t2,fontFamily:'monospace',padding:'2px 0'}}>{s}</div>)}
            {selected.id==='vwap' && ['09:00 High volume → 15% of order','12:00 Low volume  → 5% of order','15:00 High volume → 20% of order','16:00 Close spike → 30% of order','Avg price tracks VWAP ✓'].map(s=><div key={s} style={{fontSize:10,color:S.t2,fontFamily:'monospace',padding:'2px 0'}}>{s}</div>)}
            {!['twap','iceberg','vwap'].includes(selected.id) && ['Order submitted...','Algorithm monitoring market...','Conditions met → execute','Confirmation received ✓'].map(s=><div key={s} style={{fontSize:10,color:S.t2,fontFamily:'monospace',padding:'2px 0'}}>{s}</div>)}
          </div>

          <button style={{ width:'100%', padding:13, borderRadius:10, border:'none', fontWeight:900, fontSize:13, background:selected.color, color: selected.id==='twap'||selected.id==='iceberg'?'#000':'#fff', cursor:'pointer' }}>
            Place {selected.name} Order
          </button>
        </div>
      </div>
    </div>
  );
}

function BacktestTab() {
  const [strategy, setStrategy] = useState('rsi');
  const [market, setMarket]     = useState('BTCUSDT');
  const [period, setPeriod]     = useState('6M');
  const [ran, setRan]           = useState(false);

  const equityCurve = useMemo(() => genEquityCurve(60, 42), []);
  const finalVal    = equityCurve[equityCurve.length - 1];
  const pnl         = ((finalVal / 10000 - 1) * 100).toFixed(1);
  const isPos       = pnl > 0;

  return (
    <div>
      {/* Config */}
      <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:18, marginBottom:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>
        <div>
          <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>STRATEGY</div>
          <select value={strategy} onChange={e=>setStrategy(e.target.value)} style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:12, padding:'9px 10px', outline:'none' }}>
            {['Grid Trading','Dollar Cost Avg (DCA)','RSI Mean Reversion','MACD Trend Follow','Breakout Momentum','Custom Pine Script'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>MARKET</div>
          <select value={market} onChange={e=>setMarket(e.target.value)} style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:12, padding:'9px 10px', outline:'none' }}>
            {['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT','PEPEUSDT'].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>PERIOD</div>
          <div style={{ display:'flex', gap:4 }}>
            {['1M','3M','6M','1Y','2Y'].map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{ flex:1, padding:'9px 0', borderRadius:7, border:`1px solid ${period===p?S.a:S.b}`, background:period===p?`${S.a}15`:'#0A0C16', color:period===p?S.a:S.t3, fontWeight:700, fontSize:10, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>CAPITAL</div>
          <div style={{ background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, padding:'9px 10px', fontFamily:'monospace', color:S.t1, fontSize:12 }}>$10,000</div>
        </div>
        <button onClick={()=>setRan(true)} style={{ padding:'10px 20px', borderRadius:9, border:'none', background:S.p, color:'#fff', fontWeight:900, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
          ▶ Run Backtest
        </button>
      </div>

      {ran && (
        <>
          {/* Results strip */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:16 }}>
            {[
              ['Total Return', `${isPos?'+':''}${pnl}%`, isPos?S.g:S.r],
              ['Final Value',  `$${finalVal.toLocaleString()}`,  isPos?S.g:S.t1],
              ['Max Drawdown', '-12.4%',  S.r],
              ['Sharpe Ratio', '1.84',    S.gold],
              ['Win Rate',     '64.2%',   S.g],
              ['Total Trades', '248',     S.a],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:4 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:16, fontWeight:900, fontFamily:'monospace', color:c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Equity Curve — {market} · {period}</div>
            <MiniChart data={equityCurve} color={isPos?S.g:S.r} h={120}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:9, color:S.t3, fontFamily:'monospace' }}>
              <span>Start: $10,000</span><span>End: ${finalVal.toLocaleString()}</span>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Monthly Returns</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
              {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i) => {
                const ret = [4.2,-1.8,7.1,-3.2,9.4,-2.1][i];
                return (
                  <div key={m} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9, color:S.t3, marginBottom:4 }}>{m}</div>
                    <div style={{ height:60, background:'#0A0C16', borderRadius:6, display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden' }}>
                      <div style={{ width:'70%', height:`${Math.abs(ret)*6}px`, background:ret>=0?S.g:S.r, borderRadius:'3px 3px 0 0' }}/>
                    </div>
                    <div style={{ fontSize:9, fontFamily:'monospace', fontWeight:700, color:ret>=0?S.g:S.r, marginTop:4 }}>{ret>=0?'+':''}{ret}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!ran && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:S.t3 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:14, fontWeight:700, color:S.t2, marginBottom:6 }}>Configure and run your backtest</div>
          <div style={{ fontSize:12 }}>Select a strategy, market, and time period — then click Run Backtest</div>
        </div>
      )}
    </div>
  );
}

function SignalMarketplaceTab() {
  const [sortBy, setSortBy] = useState('pnl');

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>Signal Marketplace</div>
          <div style={{ fontSize:11, color:S.t3 }}>Subscribe to verified algo traders. Their signals auto-execute on your account via WikiSocial contract.</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <span style={{ fontSize:10, color:S.t3 }}>Sort:</span>
          {['pnl','winRate','sharpe','maxDD'].map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${sortBy===s?S.a:S.b}`, background:sortBy===s?`${S.a}15`:'transparent', color:sortBy===s?S.a:S.t3, fontSize:10, fontWeight:700, cursor:'pointer' }}>
              {s==='pnl'?'30d PnL':s==='winRate'?'Win %':s==='sharpe'?'Sharpe':'Max DD'}
            </button>
          ))}
        </div>
      </div>

      {MOCK_SIGNALS.map(sig => (
        <div key={sig.id} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, padding:18, marginBottom:12, display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto', gap:16, alignItems:'center' }}>
          {/* Identity */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:42, height:42, borderRadius:11, background:`${S.a}18`, border:`1px solid ${S.a}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:S.a }}>
              {sig.name[0]}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ fontWeight:900, fontSize:14, color:S.t1 }}>{sig.name}</div>
                {sig.verified && <span style={{ fontSize:9, color:S.a }}>✓</span>}
                <span style={{ fontSize:8, color:S.gold, background:`${S.gold}15`, border:`1px solid ${S.gold}30`, padding:'1px 7px', borderRadius:10, fontWeight:700 }}>{sig.badge}</span>
              </div>
              <div style={{ fontSize:10, color:S.t3 }}>{sig.strategy}</div>
              <div style={{ fontSize:9, color:S.t3, marginTop:2 }}>{sig.markets} · {sig.subscribers} subscribers</div>
            </div>
          </div>
          {/* 30d PnL */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:3 }}>30D PNL</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.g }}>{sig.pnl30d}</div>
          </div>
          {/* Win rate */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:3 }}>WIN RATE</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.gold }}>{sig.winRate}</div>
          </div>
          {/* Sharpe */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:3 }}>SHARPE</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.a }}>{sig.sharpe}</div>
          </div>
          {/* Max DD */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:3 }}>MAX DD</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.r }}>{sig.maxDD}</div>
          </div>
          {/* Subscribe */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
            <div style={{ fontSize:9, color:S.t3, textAlign:'right' }}>{sig.price}</div>
            <button style={{ padding:'8px 16px', borderRadius:8, border:'none', background:S.a, color:'#fff', fontWeight:800, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
              Subscribe →
            </button>
          </div>
        </div>
      ))}

      <div style={{ textAlign:'center', padding:'16px 0', fontSize:11, color:S.t3 }}>
        Revenue model: 10% of profits generated by signal subscribers goes to the signal provider.
        No monthly fee. Wikicious takes 20% of that 10%. All tracked on-chain via WikiSocialRewards.
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AlgoTradingPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('webhook');

  const TAB_COMP = { webhook:WebhookTab, apikeys:APIKeysTab, smartorder:SmartOrderTab, backtest:BacktestTab, signals:SignalMarketplaceTab };
  const TabComp = TAB_COMP[tab] || WebhookTab;

  return (
    <AppLayout>
      <div style={{ maxWidth:1300, margin:'0 auto', padding:'20px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:'#A855F718', border:'1px solid #A855F730', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>⚡</div>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:S.t1 }}>Algo Trading</h1>
            <div style={{ fontSize:12, color:S.t3 }}>TradingView webhooks · API keys · Smart orders · Backtester · Signal marketplace</div>
          </div>
          {!address && (
            <div style={{ marginLeft:'auto', padding:'8px 14px', background:`${S.gold}10`, border:`1px solid ${S.gold}30`, borderRadius:8, fontSize:11, color:S.gold }}>
              Connect wallet to use algo features
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:11, marginBottom:22, width:'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'9px 18px', borderRadius:9, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:11, transition:'all .12s', fontFamily:'sans-serif',
              display:'flex', alignItems:'center', gap:7,
              background: tab===t.id ? S.a : 'transparent',
              color:       tab===t.id ? '#fff' : S.t3,
            }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        <TabComp />
      </div>
    </AppLayout>
  );
}
