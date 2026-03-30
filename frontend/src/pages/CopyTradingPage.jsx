import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const S = {
  bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138',
  t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270',
  a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7',
};

const MOCK_MASTERS = [
  { addr:'0x7f3a…b2c4', name:'CryptoSage',   tag:'🏆 #1', pnl30d:'+$48,240', pnlPct:'+24.1%', pnl7d:'+$8,420', copiers:84,  winRate:'72%', maxDD:'-8.2%',  sharpe:'2.84', trades:248, avgHold:'4.2h', markets:'BTC,ETH,SOL',     risk:2, verified:true,  equity:[100,104,102,110,107,115,112,120,118,128,124,131] },
  { addr:'0x2b8c…d1e5', name:'BullRider',    tag:'⚡ Hot', pnl30d:'+$31,800', pnlPct:'+18.4%', pnl7d:'+$6,240', copiers:52,  winRate:'68%', maxDD:'-12.1%', sharpe:'1.94', trades:182, avgHold:'2.8h', markets:'BTC,ETH',        risk:4, verified:true,  equity:[100,98,103,101,108,105,112,110,118,115,122,119]  },
  { addr:'0x9d1e…4f7a', name:'DeltaHunter',  tag:'📊 Stable', pnl30d:'+$22,140', pnlPct:'+14.8%', pnl7d:'+$3,840', copiers:37,  winRate:'65%', maxDD:'-6.4%',  sharpe:'3.42', trades:94,  avgHold:'8.4h', markets:'BTC,ETH,ARB', risk:2, verified:false, equity:[100,101,103,102,105,104,108,107,111,110,113,115] },
  { addr:'0x4a2f…c8b3', name:'ArbitrageKing',tag:'🔒 Safe',  pnl30d:'+$18,600', pnlPct:'+9.3%',  pnl7d:'+$2,180', copiers:28,  winRate:'81%', maxDD:'-3.8%',  sharpe:'4.21', trades:840, avgHold:'0.4h', markets:'All pairs',   risk:1, verified:true,  equity:[100,100,101,101,102,102,103,103,104,105,105,106] },
  { addr:'0x8b3c…2e6d', name:'ThetaDecay',   tag:'🎯 Options', pnl30d:'+$12,480', pnlPct:'+8.1%',  pnl7d:'+$1,840', copiers:19,  winRate:'74%', maxDD:'-5.2%',  sharpe:'2.14', trades:62,  avgHold:'48h',  markets:'BTC,ETH',    risk:2, verified:false, equity:[100,101,102,103,103,104,104,105,106,106,107,108] },
  { addr:'0x3c7d…9e1b', name:'MomentumPro',  tag:'🚀 High Return', pnl30d:'+$9,840', pnlPct:'+24.6%', pnl7d:'+$4,120', copiers:12, winRate:'58%',  maxDD:'-22.4%', sharpe:'1.24', trades:420, avgHold:'1.2h', markets:'Meme coins',  risk:5, verified:false, equity:[100,95,108,102,118,110,130,115,142,128,148,140] },
];

const RISK_LABELS = ['','Ultra Safe','Conservative','Moderate','Aggressive','Very High'];
const RISK_COLORS = ['','#00E5A0','#00E5A0','#5B7FFF','#FFB800','#FF4060'];

const MOCK_LIVE_FEED = [
  { trader:'CryptoSage',   action:'LONG',  market:'BTCUSDT', size:'$5,000',  lev:'10×', ts:'12s ago', pnl:'+$82',  pos:true  },
  { trader:'BullRider',    action:'SHORT', market:'ETHUSDT', size:'$2,000',  lev:'5×',  ts:'38s ago', pnl:'+$24',  pos:true  },
  { trader:'ArbitrageKing',action:'CLOSE', market:'SOLUSDT', size:'$1,200',  lev:'3×',  ts:'1m ago',  pnl:'+$184', pos:true  },
  { trader:'DeltaHunter',  action:'LONG',  market:'ARBUSDT', size:'$800',    lev:'8×',  ts:'2m ago',  pnl:'-$42',  pos:false },
  { trader:'CryptoSage',   action:'CLOSE', market:'BTCUSDT', size:'$4,800',  lev:'10×', ts:'4m ago',  pnl:'+$280', pos:true  },
];

const MOCK_MY_COPIES = [
  { master:'CryptoSage', since:'Feb 12', ratio:'1.0×', maxSize:'$500', copiedTrades:84, myPnL:'+$4,240', active:true  },
  { master:'ArbitrageKing', since:'Mar 2', ratio:'0.5×', maxSize:'$200', copiedTrades:420, myPnL:'+$820', active:true  },
];

function MiniSparkline({ data, color='#00E5A0', h=36 }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 100;
  const pts = data.map((v,i) => `${(i/(data.length-1)*w).toFixed(1)},${((1-(v-min)/range)*h).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id={`sg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg${color.slice(1)})`}/>
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function RiskMeter({ level }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width:5, height: i<=level?14:6, borderRadius:2, background:i<=level?RISK_COLORS[level]:S.b, transition:'all .2s' }}/>
      ))}
      <span style={{ fontSize:9, color:RISK_COLORS[level], fontWeight:700, marginLeft:3 }}>{RISK_LABELS[level]}</span>
    </div>
  );
}

function MasterCard({ m, onCopy }) {
  const [exp, setExp] = useState(false);
  const pnlColor = m.pnlPct.startsWith('+') ? S.g : S.r;

  return (
    <div style={{ background:S.s1, border:`1px solid ${exp?S.a:S.b}`, borderRadius:14, overflow:'hidden', transition:'border-color .15s', cursor:'pointer' }} onClick={() => setExp(e=>!e)}>
      {/* Main row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', padding:'16px 18px', alignItems:'center', gap:12 }}>
        {/* Identity */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${S.a}18`, border:`1px solid ${S.a}30`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:20, color:S.a, flexShrink:0 }}>
            {m.name[0]}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
              <div style={{ fontWeight:900, fontSize:14, color:S.t1 }}>{m.name}</div>
              {m.verified && <span style={{ fontSize:10, color:S.a }}>✓</span>}
            </div>
            <div style={{ fontSize:9, color:S.gold, background:`${S.gold}15`, border:`1px solid ${S.gold}30`, display:'inline-block', padding:'1px 8px', borderRadius:10, fontWeight:700 }}>{m.tag}</div>
            <div style={{ fontSize:9, color:S.t3, marginTop:3 }}>{m.markets}</div>
          </div>
        </div>
        {/* 30d PnL */}
        <div>
          <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:3 }}>30D PNL</div>
          <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:pnlColor }}>{m.pnlPct}</div>
          <div style={{ fontSize:10, color:pnlColor, fontFamily:'monospace' }}>{m.pnl30d}</div>
        </div>
        {/* Win rate */}
        <div>
          <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:3 }}>WIN RATE</div>
          <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:900, color:S.gold }}>{m.winRate}</div>
          <div style={{ fontSize:9, color:S.t3 }}>{m.trades} trades</div>
        </div>
        {/* Max DD */}
        <div>
          <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:3 }}>MAX DD</div>
          <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.r }}>{m.maxDD}</div>
        </div>
        {/* Sharpe */}
        <div>
          <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:3 }}>SHARPE</div>
          <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:900, color:S.a }}>{m.sharpe}</div>
        </div>
        {/* Risk */}
        <div>
          <div style={{ fontSize:8, color:S.t3, fontWeight:700, marginBottom:5 }}>RISK</div>
          <RiskMeter level={m.risk}/>
          <div style={{ fontSize:9, color:S.t3, marginTop:3 }}>{m.copiers} copiers</div>
        </div>
        {/* CTA */}
        <button onClick={e => { e.stopPropagation(); onCopy(m); }} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:S.a, color:'#fff', fontWeight:900, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
          Copy →
        </button>
      </div>

      {/* Expanded detail */}
      {exp && (
        <div style={{ padding:'0 18px 18px', borderTop:`1px solid ${S.b}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:16, paddingTop:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:S.t1, marginBottom:10 }}>Equity Curve (30 days)</div>
              <MiniSparkline data={m.equity} color={pnlColor} h={80}/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
                {[['7d PnL', m.pnl7d, S.g],['Avg Hold', m.avgHold, S.a],['Trades', m.trades, S.gold],['Copiers', m.copiers, S.p]].map(([k,v,c]) => (
                  <div key={k} style={{ background:'#0A0C16', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:8, color:S.t3, fontWeight:700 }}>{k}</div>
                    <div style={{ fontSize:14, fontWeight:900, fontFamily:'monospace', color:c, marginTop:3 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:S.t1, marginBottom:10 }}>Recent Trades</div>
              {[['BTCUSDT','LONG','$5,000','10×','+$280'],['ETHUSDT','SHORT','$2,000','5×','+$92'],['SOLUSDT','LONG','$1,000','8×','-$48'],['ARBUSDT','LONG','$500','10×','+$124']].map(([mkt,side,sz,lev,pnl],i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}20`, alignItems:'center' }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:9, background:side==='LONG'?'#00E5A015':'#FF406015', color:side==='LONG'?S.g:S.r, border:`1px solid ${side==='LONG'?'#00E5A030':'#FF406030'}`, padding:'1px 6px', borderRadius:4, fontWeight:700 }}>{side}</span>
                    <span style={{ fontSize:10, color:S.t1, fontWeight:700 }}>{mkt}</span>
                    <span style={{ fontSize:9, color:S.t3 }}>{lev}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:pnl.startsWith('+')?S.g:S.r }}>{pnl}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyModal({ master, onClose }) {
  const [ratio,    setRatio]    = useState(1.0);
  const [maxSize,  setMaxSize]  = useState(500);
  const [copySL,   setCopySL]   = useState(true);
  const [copyTP,   setCopyTP]   = useState(true);
  const [maxDD,    setMaxDD]    = useState(15);

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000080', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#0D1017', border:`1px solid ${S.b}`, borderRadius:18, padding:28, maxWidth:460, width:'100%' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:18, color:S.t1 }}>Copy {master.name}</div>
            <div style={{ fontSize:11, color:S.t3 }}>Configure how trades are mirrored to your account</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:S.t3, fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Risk warning */}
        <div style={{ background:`${S.r}0D`, border:`1px solid ${S.r}25`, borderRadius:9, padding:'10px 13px', marginBottom:18, fontSize:11, color:S.r, lineHeight:1.7 }}>
          ⚠️ Past performance doesn't guarantee future results. Only copy with money you can afford to lose.
          Max drawdown on this trader: <strong>{master.maxDD}</strong>.
        </div>

        {/* Copy ratio */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700 }}>COPY RATIO</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.a }}>{ratio.toFixed(1)}×</div>
          </div>
          <input type="range" min="0.1" max="2" step="0.1" value={ratio} onChange={e=>setRatio(parseFloat(e.target.value))} style={{ width:'100%', accentColor:S.a }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:S.t3, marginTop:3 }}>
            <span>0.1× (10% of trades)</span><span>2.0× (double size)</span>
          </div>
        </div>

        {/* Max trade size */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>MAX TRADE SIZE (USDC)</div>
          <input type="number" value={maxSize} onChange={e=>setMaxSize(Number(e.target.value))} style={{ width:'100%', background:S.s2, border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:14, fontFamily:'monospace', padding:'10px 12px', outline:'none', boxSizing:'border-box' }}/>
          <div style={{ fontSize:9, color:S.t3, marginTop:3 }}>Cap how much USDC is risked per copied trade</div>
        </div>

        {/* Stop-loss trigger */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700 }}>STOP-COPY IF DRAWDOWN EXCEEDS</div>
            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900, color:S.r }}>{maxDD}%</div>
          </div>
          <input type="range" min="5" max="50" step="5" value={maxDD} onChange={e=>setMaxDD(Number(e.target.value))} style={{ width:'100%', accentColor:S.r }}/>
          <div style={{ fontSize:9, color:S.t3, marginTop:3 }}>Automatically stop copying if your losses hit this threshold</div>
        </div>

        {/* Toggle options */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {[['Copy Take-Profit',copySL,setCopySL,'#00E5A0'],['Copy Stop-Loss',copyTP,setCopyTP,'#FF4060']].map(([label,val,setter,color]) => (
            <div key={label} onClick={() => setter(!val)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:`${val?color:S.s2}10`, border:`1px solid ${val?color:S.b}30`, borderRadius:9, cursor:'pointer' }}>
              <span style={{ fontSize:11, color:S.t1, fontWeight:700 }}>{label}</span>
              <div style={{ width:34, height:18, borderRadius:9, background:val?color:S.b, position:'relative', transition:'background .2s' }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:val?18:2, transition:'left .2s' }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background:S.s2, borderRadius:9, padding:'10px 13px', marginBottom:18 }}>
          <div style={{ fontSize:10, color:S.t2, fontWeight:700, marginBottom:6 }}>COPY SUMMARY</div>
          {[
            ['Trader',        master.name],
            ['Ratio',         `${ratio.toFixed(1)}× (${(ratio*100).toFixed(0)}% of their size)`],
            ['Max per trade', `$${maxSize}`],
            ['Auto-stop at',  `-${maxDD}% drawdown`],
            ['Protocol cut',  '10% of profits only (no monthly fee)'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
              <span style={{ fontSize:10, color:S.t3 }}>{k}</span>
              <span style={{ fontSize:10, fontFamily:'monospace', color:S.t1, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>

        <button style={{ width:'100%', padding:14, borderRadius:11, border:'none', fontWeight:900, fontSize:14, background:S.a, color:'#fff', cursor:'pointer' }}>
          Start Copying {master.name}
        </button>
      </div>
    </div>
  );
}

export default function CopyTradingPage() {
  const { address } = useAccount();
  const [tab, setTab]         = useState('discover');
  const [sortBy, setSortBy]   = useState('pnl30d');
  const [riskFilter, setRisk] = useState(0); // 0 = all
  const [copyModal, setCopyModal] = useState(null);
  const [liveFeed, setLiveFeed]   = useState(MOCK_LIVE_FEED);

  // Simulate live feed updates
  useEffect(() => {
    const t = setInterval(() => {
      const actions = ['LONG','SHORT','CLOSE'];
      const markets = ['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT','PEPEUSDT'];
      const traders = MOCK_MASTERS.map(m=>m.name);
      setLiveFeed(prev => [{
        trader:  traders[Math.floor(0.5*traders.length)],
        action:  actions[Math.floor(0.5*actions.length)],
        market:  markets[Math.floor(0.5*markets.length)],
        size:   `$${(0.5*4500+500).toFixed(0)}`,
        lev:    `${[3,5,8,10,20][Math.floor(0.5*5)]}×`,
        ts:     'just now',
        pnl:    `${0.5>0.35?'+':'-'}$${(0.5*300+10).toFixed(0)}`,
        pos:    0.5>0.35,
      }, ...prev.slice(0,9)]);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const sorted = [...MOCK_MASTERS]
    .filter(m => riskFilter === 0 || m.risk <= riskFilter)
    .sort((a,b) => {
      if (sortBy==='pnl30d')  return parseFloat(b.pnlPct) - parseFloat(a.pnlPct);
      if (sortBy==='winRate') return parseFloat(b.winRate) - parseFloat(a.winRate);
      if (sortBy==='sharpe')  return parseFloat(b.sharpe)  - parseFloat(a.sharpe);
      if (sortBy==='maxDD')   return parseFloat(b.maxDD)   - parseFloat(a.maxDD); // less negative = better
      return 0;
    });

  return (
    <AppLayout>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'20px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ width:46,height:46,borderRadius:13,background:'#00E5A018',border:'1px solid #00E5A030',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>📋</div>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:S.t1 }}>Copy Trading</h1>
            <div style={{ fontSize:12, color:S.t3 }}>Mirror top traders automatically · 10% profit share only · WikiSocial on-chain</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:12 }}>
            {[['$284K','Total Copied',S.a],['148','Active Copiers',S.g],['+14.9%','Avg Copier ROI',S.gold]].map(([v,l,c])=>(
              <div key={l} style={{ textAlign:'right' }}>
                <div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:16,fontWeight:900,fontFamily:'monospace',color:c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:10, marginBottom:20, width:'fit-content' }}>
          {[['discover','🔍 Discover Traders'],['mine','📋 My Copies'],['feed','⚡ Live Feed'],['become','📡 Become a Leader']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 18px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3 }}>{l}</button>
          ))}
        </div>

        {/* DISCOVER */}
        {tab==='discover' && (
          <>
            {/* Filters */}
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <span style={{ fontSize:10, color:S.t3 }}>Sort:</span>
                {[['pnl30d','30d PnL'],['winRate','Win %'],['sharpe','Sharpe'],['maxDD','Lowest DD']].map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)} style={{ padding:'5px 11px',borderRadius:6,border:`1px solid ${sortBy===k?S.a:S.b}`,background:sortBy===k?`${S.a}15`:'transparent',color:sortBy===k?S.a:S.t3,fontSize:10,fontWeight:700,cursor:'pointer' }}>{l}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:4, alignItems:'center', marginLeft:16 }}>
                <span style={{ fontSize:10, color:S.t3 }}>Max Risk:</span>
                {[[0,'All'],[2,'Low'],[3,'Med'],[5,'High']].map(([v,l])=>(
                  <button key={v} onClick={()=>setRisk(v)} style={{ padding:'5px 11px',borderRadius:6,border:`1px solid ${riskFilter===v?RISK_COLORS[v]||S.a:S.b}`,background:riskFilter===v?`${RISK_COLORS[v]||S.a}15`:'transparent',color:riskFilter===v?RISK_COLORS[v]||S.a:S.t3,fontSize:10,fontWeight:700,cursor:'pointer' }}>{l}</button>
                ))}
              </div>
              <div style={{ marginLeft:'auto', fontSize:10, color:S.t3 }}>{sorted.length} traders</div>
            </div>

            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', padding:'8px 18px', background:S.s2, borderRadius:'10px 10px 0 0', border:`1px solid ${S.b}` }}>
              {['Trader','30d PnL','Win Rate','Max DD','Sharpe','Risk / Copiers',''].map(h=>(
                <div key={h} style={{ fontSize:8, color:S.t3, fontWeight:700, textTransform:'uppercase' }}>{h}</div>
              ))}
            </div>

            <div style={{ border:`1px solid ${S.b}`, borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
              {sorted.map((m,i) => <MasterCard key={m.addr} m={m} onCopy={setCopyModal}/>)}
            </div>
          </>
        )}

        {/* MY COPIES */}
        {tab==='mine' && (
          <div>
            {!address ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:S.t3 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>👛</div>
                <div style={{ fontSize:14, fontWeight:700, color:S.t2, marginBottom:6 }}>Connect your wallet</div>
                <div style={{ fontSize:12 }}>Connect to see your active copy subscriptions</div>
              </div>
            ) : MOCK_MY_COPIES.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:S.t3 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:14, fontWeight:700, color:S.t2, marginBottom:6 }}>No active copies</div>
                <button onClick={()=>setTab('discover')} style={{ padding:'10px 24px',borderRadius:9,border:'none',background:S.a,color:'#fff',fontWeight:800,cursor:'pointer' }}>Discover Traders →</button>
              </div>
            ) : (
              <div>
                {MOCK_MY_COPIES.map(sub => (
                  <div key={sub.master} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, padding:18, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div>
                        <div style={{ fontWeight:900, fontSize:16, color:S.t1, marginBottom:2 }}>Copying {sub.master}</div>
                        <div style={{ fontSize:10, color:S.t3 }}>Since {sub.since} · {sub.copiedTrades} trades copied</div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ padding:'4px 12px',borderRadius:7,background:'#00E5A015',color:S.g,border:'1px solid #00E5A030',fontSize:10,fontWeight:700 }}>● Active</span>
                        <button style={{ padding:'4px 12px',borderRadius:7,border:`1px solid ${S.r}30`,background:'transparent',color:S.r,fontSize:10,cursor:'pointer' }}>Stop Copying</button>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
                      {[['Copy Ratio',sub.ratio,S.a],['Max Trade',sub.maxSize,S.gold],['Copied Trades',sub.copiedTrades,S.t1],['My PnL',sub.myPnL,S.g],['Status','Active',S.g]].map(([k,v,c])=>(
                        <div key={k} style={{ background:'#0A0C16',borderRadius:8,padding:'10px 12px' }}>
                          <div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>{k.toUpperCase()}</div>
                          <div style={{ fontSize:15,fontWeight:900,fontFamily:'monospace',color:c,marginTop:4 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE FEED */}
        {tab==='feed' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:S.g,boxShadow:`0 0 6px ${S.g}`,animation:'pulse 2s infinite' }}/>
              <div style={{ fontWeight:800,fontSize:14,color:S.t1 }}>Live Trade Feed</div>
              <div style={{ fontSize:10,color:S.t3 }}>Real-time trades from master traders you can follow</div>
            </div>
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'grid',gridTemplateColumns:'1.5fr 0.8fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr',padding:'8px 16px',background:S.s2,borderBottom:`1px solid ${S.b}` }}>
                {['Trader','Action','Market','Size','Lev','Time','PnL'].map(h=><div key={h} style={{ fontSize:8,color:S.t3,fontWeight:700 }}>{h}</div>)}
              </div>
              {liveFeed.map((item,i) => (
                <div key={i} style={{ display:'grid',gridTemplateColumns:'1.5fr 0.8fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr',padding:'11px 16px',borderBottom:`1px solid ${S.b}20`,alignItems:'center',background:i===0?`${S.a}08`:'transparent',transition:'background 0.5s' }}>
                  <div style={{ fontWeight:700,fontSize:12,color:S.t1 }}>{item.trader}</div>
                  <span style={{ fontSize:10,fontWeight:800,background:item.action==='LONG'?'#00E5A015':item.action==='SHORT'?'#FF406015':'#5B7FFF15',color:item.action==='LONG'?S.g:item.action==='SHORT'?S.r:S.a,border:`1px solid ${item.action==='LONG'?'#00E5A030':item.action==='SHORT'?'#FF406030':'#5B7FFF30'}`,padding:'2px 8px',borderRadius:5 }}>{item.action}</span>
                  <div style={{ fontWeight:700,fontSize:12,color:S.t1 }}>{item.market}</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,color:S.t2 }}>{item.size}</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,color:S.gold }}>{item.lev}</div>
                  <div style={{ fontSize:10,color:S.t3 }}>{item.ts}</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,fontWeight:700,color:item.pos?S.g:S.r }}>{item.pnl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BECOME A LEADER */}
        {tab==='become' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:24,marginBottom:16 }}>
              <div style={{ fontWeight:900,fontSize:18,color:S.t1,marginBottom:4 }}>Become a Signal Provider</div>
              <div style={{ fontSize:12,color:S.t3,marginBottom:20 }}>Let others copy your trades and earn 10% of their profits automatically via WikiSocialRewards contract.</div>
              {[['Trade publicly','Your positions are visible to potential copiers in real-time'],['Build track record','30-day verified PnL, win rate, Sharpe ratio shown on leaderboard'],['Earn passively','10% of all profits your copiers make — paid on-chain automatically'],['No responsibility','Copiers set their own risk limits. You just trade as normal.']].map(([title,desc],i)=>(
                <div key={title} style={{ display:'flex',gap:12,marginBottom:14 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:`${S.a}18`,border:`1px solid ${S.a}30`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:S.a,flexShrink:0 }}>{i+1}</div>
                  <div><div style={{ fontWeight:700,fontSize:13,color:S.t1,marginBottom:2 }}>{title}</div><div style={{ fontSize:11,color:S.t3,lineHeight:1.6 }}>{desc}</div></div>
                </div>
              ))}
              <div style={{ background:'#0A0C16',borderRadius:9,padding:'12px 14px',marginBottom:20 }}>
                {[['Min volume required','$10K lifetime exchange volume (auto-verified)'],['Payout','10% of copier profits → your wallet every 24h'],['Contract','WikiSocialRewards.sol on Arbitrum'],['Cut','Wikicious takes 20% of your 10% — you keep 80%']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${S.b}20` }}><span style={{ fontSize:11,color:S.t3 }}>{k}</span><span style={{ fontSize:11,fontFamily:'monospace',color:S.t1 }}>{v}</span></div>
                ))}
              </div>
              <button style={{ width:'100%',padding:14,borderRadius:11,border:'none',fontWeight:900,fontSize:14,background:`linear-gradient(135deg,${S.a},${S.p})`,color:'#fff',cursor:'pointer' }}>
                Apply to Become a Signal Provider
              </button>
            </div>
          </div>
        )}
      </div>

      {copyModal && <CopyModal master={copyModal} onClose={()=>setCopyModal(null)}/>}
    </AppLayout>
  );
}
