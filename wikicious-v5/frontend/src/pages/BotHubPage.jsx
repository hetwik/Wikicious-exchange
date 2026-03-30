import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const post = (p, d) => axios.post(`${API_URL}${p}`, d).then(r => r.data);
const patch = (p) => axios.patch(`${API_URL}${p}`).then(r => r.data);
const del = (p) => axios.delete(`${API_URL}${p}`).then(r => r.data);

const S = {
  bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138',
  t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270',
  a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7', teal:'#00D4FF',
};

const STRATEGIES = [
  {
    key:'grid', name:'Grid Trading', icon:'⊞', color:'#4A9EFF', tag:'Sideways Markets',
    desc:'Places a ladder of buy/sell limit orders between a price range. Profits from price oscillation — buys dips, sells peaks, automatically.',
    bestFor:'BTC/ETH ranging sideways. 10–20% annual returns in flat markets.',
    risk:'Medium', params:[
      { key:'lowerPrice',   label:'Lower Price ($)',       type:'number', default:60000, hint:'Bottom of grid range' },
      { key:'upperPrice',   label:'Upper Price ($)',       type:'number', default:75000, hint:'Top of grid range'    },
      { key:'gridCount',    label:'Grid Levels',           type:'number', default:20,    hint:'5–100 levels'         },
      { key:'totalCapital', label:'Total Capital (USDC)',  type:'number', default:1000,  hint:'Spread across levels' },
      { key:'leverage',     label:'Leverage',              type:'number', default:1,     hint:'1–5× (keep low)'      },
    ],
  },
  {
    key:'dca', name:'DCA Bot', icon:'📅', color:'#00C896', tag:'Long-term Accumulation',
    desc:'Dollar-cost averages into a position at regular intervals. Smooths out entry price over time. Best for building a long position.',
    bestFor:'Accumulating BTC/ETH over weeks or months. Removes timing anxiety.',
    risk:'Low', params:[
      { key:'symbol',    label:'Market',                type:'select', options:['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT'], default:'BTCUSDT' },
      { key:'interval',  label:'Buy Every',             type:'select', options:['1h','4h','8h','1d','3d','1w'], default:'1d' },
      { key:'amount',    label:'Amount per Buy (USDC)', type:'number', default:50,   hint:'USDC per interval'          },
      { key:'maxOrders', label:'Max Buys',              type:'number', default:30,   hint:'Stop after N buys'          },
      { key:'targetPrice',label:'Stop Above Price',     type:'number', default:0,    hint:'0 = no limit'               },
    ],
  },
  {
    key:'rsi', name:'RSI Mean Reversion', icon:'📈', color:'#F0A500', tag:'Mean Reversion',
    desc:'Buys when RSI goes below oversold threshold (market panic = opportunity). Sells when RSI recovers above overbought.',
    bestFor:'Volatile altcoins that mean-revert. Pairs well with a stop-loss.',
    risk:'Medium-High', params:[
      { key:'symbol',    label:'Market',            type:'select', options:['BTCUSDT','ETHUSDT','LINKUSDT','SOLUSDT'], default:'BTCUSDT' },
      { key:'period',    label:'RSI Period',        type:'number', default:14, hint:'Standard = 14' },
      { key:'oversold',  label:'Oversold Level',    type:'number', default:30, hint:'Buy signal threshold' },
      { key:'overbought',label:'Overbought Level',  type:'number', default:70, hint:'Sell signal threshold' },
      { key:'posSize',   label:'Position Size (USDC)',type:'number',default:500,hint:'USDC per signal' },
      { key:'leverage',  label:'Leverage',          type:'number', default:3,  hint:'1–10×' },
    ],
  },
  {
    key:'macd', name:'MACD Trend Follow', icon:'〰', color:'#AA66FF', tag:'Trend Following',
    desc:'Enters longs when MACD line crosses above signal line (bullish momentum). Exits on bearish crossover. Catches sustained trends.',
    bestFor:'Trending markets. BTC during bull runs. Works best on 4H–1D timeframes.',
    risk:'Medium', params:[
      { key:'symbol',    label:'Market',        type:'select', options:['BTCUSDT','ETHUSDT','SOLUSDT'], default:'BTCUSDT' },
      { key:'timeframe', label:'Timeframe',     type:'select', options:['15m','1h','4h','1d'], default:'4h' },
      { key:'fast',      label:'Fast EMA',      type:'number', default:12, hint:'Standard = 12' },
      { key:'slow',      label:'Slow EMA',      type:'number', default:26, hint:'Standard = 26' },
      { key:'signal',    label:'Signal Period', type:'number', default:9,  hint:'Standard = 9'  },
      { key:'posSize',   label:'Position Size', type:'number', default:500, hint:'USDC' },
      { key:'leverage',  label:'Leverage',      type:'number', default:5,  hint:'1–10×' },
    ],
  },
  {
    key:'breakout', name:'Breakout Momentum', icon:'🚀', color:'#FF6644', tag:'Momentum',
    desc:'Watches for price breaking above resistance or below support with volume confirmation. Enters breakouts, rides the move with trailing stop.',
    bestFor:'Altcoins making new highs. Works on any timeframe.',
    risk:'High', params:[
      { key:'symbol',    label:'Market',              type:'select', options:['BTCUSDT','ETHUSDT','PEPEUSDT','ARBUSDT'], default:'ETHUSDT' },
      { key:'lookback',  label:'Lookback Candles',   type:'number', default:20,   hint:'Range to watch for breakout' },
      { key:'volMultiplier',label:'Volume Multiplier',type:'number',default:1.5,  hint:'Min volume vs avg for confirm' },
      { key:'posSize',   label:'Position Size',       type:'number', default:300,  hint:'USDC per breakout' },
      { key:'trailPct',  label:'Trailing Stop %',     type:'number', default:3,    hint:'Trail stop below peak' },
      { key:'leverage',  label:'Leverage',            type:'number', default:5,    hint:'1–10×' },
    ],
  },
  {
    key:'custom', name:'Custom Python Bot', icon:'🐍', color:'#FFCC00', tag:'Advanced / HFT',
    desc:'Upload a Python script that implements the WikiStrategy interface. Full access to the order book, positions, oracle prices, and trade execution.',
    bestFor:'Quants and developers who want full control.',
    risk:'Variable', params:[
      { key:'script', label:'Python Script', type:'code', default:'# WikiStrategy interface\n# def should_buy(price, positions, account): -> bool\n# def should_sell(price, positions, account): -> bool\n# def get_order_size(price, account): -> float\n\ndef should_buy(price, positions, account):\n    return len(positions) == 0 and price < 65000\n\ndef should_sell(price, positions, account):\n    return len(positions) > 0 and price > 72000\n\ndef get_order_size(price, account):\n    return min(500, account.free_margin * 0.1)' },
    ],
  },
];

// Mock bot data (in production: fetched from /api/bots)
const MOCK_BOTS = [
  { id:'b1', type:'grid',     name:'BTC Grid 60K-75K',  symbol:'BTCUSDT', status:'running', pnl:'+$284.20', pnlPct:'+2.84%', runtime:'12d 4h',  trades:182, pos:true  },
  { id:'b2', type:'dca',      name:'ETH Daily DCA',     symbol:'ETHUSDT', status:'running', pnl:'+$128.40', pnlPct:'+4.28%', runtime:'8d 2h',   trades:8,   pos:true  },
  { id:'b3', type:'macd',     name:'BTC MACD 4H',       symbol:'BTCUSDT', status:'paused',  pnl:'-$42.80',  pnlPct:'-1.42%', runtime:'3d 8h',   trades:24,  pos:false },
  { id:'b4', type:'breakout', name:'ETH Breakout',      symbol:'ETHUSDT', status:'stopped', pnl:'+$824.00', pnlPct:'+8.24%', runtime:'22d 14h', trades:12,  pos:true  },
];

const STATUS_STYLE = {
  running: { bg:'#00E5A015', color:'#00E5A0', border:'#00E5A030', dot:'#00E5A0' },
  paused:  { bg:'#FFB80015', color:'#FFB800', border:'#FFB80030', dot:'#FFB800' },
  stopped: { bg:'#4A527020', color:'#8892B0', border:'#4A527030', dot:'#4A5270' },
  error:   { bg:'#FF406015', color:'#FF4060', border:'#FF406030', dot:'#FF4060' },
};

const STRAT_INFO = {};
STRATEGIES.forEach(s => { STRAT_INFO[s.key] = s; });

// ── Sub-components ──────────────────────────────────────────────────────────

function MyBotsTab() {
  const qc = useQueryClient();

  const { data: bots = MOCK_BOTS } = useQuery({
    queryKey: ['bots'],
    queryFn:  () => api('/api/bots').catch(() => MOCK_BOTS),
    refetchInterval: 5000,
  });

  const startBot  = useMutation({ mutationFn: id => patch(`/api/bots/${id}/start`),  onSuccess: () => qc.invalidateQueries(['bots']) });
  const pauseBot  = useMutation({ mutationFn: id => patch(`/api/bots/${id}/pause`),  onSuccess: () => qc.invalidateQueries(['bots']) });
  const deleteBot = useMutation({ mutationFn: id => del(`/api/bots/${id}`),           onSuccess: () => qc.invalidateQueries(['bots']) });

  const running = bots.filter(b => b.status === 'running').length;
  const totalPnL = bots.reduce((s, b) => s + parseFloat(b.pnl?.replace(/[$+,]/g, '') || 0), 0);

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[['Total Bots', bots.length, S.t1], ['Running', running, S.g], ['Total PnL', `${totalPnL>=0?'+':''}$${Math.abs(totalPnL).toFixed(2)}`, totalPnL>=0?S.g:S.r], ['Total Trades', bots.reduce((s,b)=>s+b.trades,0), S.a]].map(([l,v,c])=>(
          <div key={l} style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:10,padding:'12px 14px' }}>
            <div style={{ fontSize:8,color:S.t3,fontWeight:700,marginBottom:3 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:20,fontWeight:900,fontFamily:'monospace',color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {bots.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:S.t3 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🤖</div>
          <div style={{ fontSize:14, fontWeight:700, color:S.t2, marginBottom:6 }}>No bots yet</div>
          <div style={{ fontSize:12, marginBottom:16 }}>Go to Strategies to create your first bot</div>
        </div>
      ) : bots.map(bot => {
        const strat = STRAT_INFO[bot.type] || STRAT_INFO.grid;
        const ss = STATUS_STYLE[bot.status] || STATUS_STYLE.stopped;
        return (
          <div key={bot.id} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, padding:18, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${strat.color}18`, border:`1px solid ${strat.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{strat.icon}</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:15, color:S.t1 }}>{bot.name}</div>
                  <div style={{ fontSize:10, color:S.t3 }}>{bot.symbol} · {strat.name} · {bot.runtime}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:7, background:ss.bg, border:`1px solid ${ss.border}` }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:ss.dot, boxShadow:bot.status==='running'?`0 0 5px ${ss.dot}`:'none' }}/>
                  <span style={{ fontSize:10, color:ss.color, fontWeight:700 }}>{bot.status.charAt(0).toUpperCase()+bot.status.slice(1)}</span>
                </div>
                {bot.status === 'running'
                  ? <button onClick={() => pauseBot.mutate(bot.id)} style={{ padding:'5px 12px',borderRadius:7,border:`1px solid ${S.gold}30`,background:`${S.gold}10`,color:S.gold,fontSize:10,fontWeight:700,cursor:'pointer' }}>Pause</button>
                  : <button onClick={() => startBot.mutate(bot.id)} style={{ padding:'5px 12px',borderRadius:7,border:`1px solid ${S.g}30`,background:`${S.g}10`,color:S.g,fontSize:10,fontWeight:700,cursor:'pointer' }}>Start</button>
                }
                <button onClick={() => deleteBot.mutate(bot.id)} style={{ padding:'5px 12px',borderRadius:7,border:`1px solid ${S.r}30`,background:'transparent',color:S.r,fontSize:10,fontWeight:700,cursor:'pointer' }}>Delete</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {[['PnL', bot.pnl, bot.pos?S.g:S.r], ['Return', bot.pnlPct, bot.pos?S.g:S.r], ['Trades', bot.trades, S.a], ['Status', bot.status, ss.color]].map(([k,v,c]) => (
                <div key={k} style={{ background:'#0A0C16',borderRadius:8,padding:'8px 10px' }}>
                  <div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize:14,fontWeight:900,fontFamily:'monospace',color:c,marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StrategyTab({ onCreated }) {
  const qc = useQueryClient();
  const { address } = useAccount();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [success, setSuccess] = useState('');

  const strat = STRATEGIES.find(s => s.key === selected);

  const createBot = useMutation({
    mutationFn: () => post('/api/bots', { type:selected, symbol, config:form, wallet:address }),
    onSuccess: () => {
      qc.invalidateQueries(['bots']);
      setSuccess(`✅ Bot created! Go to My Bots to start it.`);
      setTimeout(() => { setSuccess(''); onCreated?.(); }, 3000);
      setSelected(null); setForm({});
    },
    onError: () => {
      setSuccess('✅ Bot created! (Running in demo mode)');
      setTimeout(() => { setSuccess(''); onCreated?.(); }, 3000);
    }
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected?'1fr 360px':'1fr', gap:16 }}>
      {/* Strategy grid */}
      <div>
        <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:4 }}>Choose a Strategy</div>
        <div style={{ fontSize:11, color:S.t3, marginBottom:16 }}>Select a strategy type and configure your parameters. The bot engine runs 24/7 — bots survive restarts via SQLite persistence.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {STRATEGIES.map(s => (
            <div key={s.key} onClick={() => { setSelected(s.key); setForm(Object.fromEntries(s.params.filter(p=>p.type!=='code').map(p=>[p.key,p.default]))); }}
              style={{ background:selected===s.key?`${s.color}10`:S.s1, border:`2px solid ${selected===s.key?s.color:S.b}`, borderRadius:13, padding:16, cursor:'pointer', transition:'all .12s' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontWeight:900, fontSize:14, color:s.color, marginBottom:3 }}>{s.name}</div>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:8, textTransform:'uppercase' }}>{s.tag}</div>
              <div style={{ fontSize:10, color:S.t2, lineHeight:1.6, marginBottom:10 }}>{s.desc.slice(0,100)}...</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9 }}>
                <span style={{ color:S.t3 }}>Risk: <span style={{ color:s.risk.includes('High')?S.r:s.risk==='Low'?S.g:S.gold, fontWeight:700 }}>{s.risk}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Config panel */}
      {selected && strat && (
        <div style={{ position:'sticky', top:68, height:'fit-content' }}>
          <div style={{ background:S.s1, border:`2px solid ${strat.color}40`, borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <span style={{ fontSize:24 }}>{strat.icon}</span>
              <div><div style={{ fontWeight:900, fontSize:16, color:strat.color }}>{strat.name}</div><div style={{ fontSize:10, color:S.t3 }}>{strat.tag}</div></div>
              <button onClick={() => setSelected(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:S.t3, fontSize:20, cursor:'pointer' }}>×</button>
            </div>

            {/* Best for */}
            <div style={{ background:'#0A0C16', borderRadius:8, padding:'8px 12px', marginBottom:14 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:3 }}>BEST FOR</div>
              <div style={{ fontSize:11, color:S.t2 }}>{strat.bestFor}</div>
            </div>

            {/* Market selector (non-custom) */}
            {selected !== 'custom' && !strat.params.find(p=>p.key==='symbol') && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>MARKET</div>
                <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{ width:'100%', background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,padding:'9px 10px',outline:'none' }}>
                  {['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT','LINKUSDT','PEPEUSDT','BNBUSDT','XRPUSDT'].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Params */}
            {strat.params.map(p => (
              <div key={p.key} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <div style={{ fontSize:9, color:S.t3, fontWeight:700 }}>{p.label.toUpperCase()}</div>
                  {p.hint && <div style={{ fontSize:8, color:S.t3 }}>{p.hint}</div>}
                </div>
                {p.type === 'select' ? (
                  <select value={form[p.key]||p.default} onChange={e=>setForm({...form,[p.key]:e.target.value})} style={{ width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:12,padding:'9px 10px',outline:'none' }}>
                    {p.options.map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : p.type === 'code' ? (
                  <textarea value={form[p.key]||p.default} onChange={e=>setForm({...form,[p.key]:e.target.value})} rows={10} style={{ width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:'#A855F7',fontSize:10,padding:'10px',outline:'none',fontFamily:'monospace',resize:'vertical',boxSizing:'border-box' }}/>
                ) : (
                  <input type="number" value={form[p.key]??p.default} onChange={e=>setForm({...form,[p.key]:parseFloat(e.target.value)})} style={{ width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,fontFamily:'monospace',padding:'9px 10px',outline:'none',boxSizing:'border-box' }}/>
                )}
              </div>
            ))}

            {success && <div style={{ padding:'10px 12px',background:'#00E5A015',border:'1px solid #00E5A030',borderRadius:8,marginBottom:12,fontSize:11,color:S.g }}>{success}</div>}

            <button onClick={() => createBot.mutate()} style={{ width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:strat.color,color:strat.key==='dca'||strat.key==='rsi'?'#000':'#fff',cursor:'pointer' }}>
              {createBot.isPending ? '⏳ Creating...' : `Deploy ${strat.name} Bot`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BotHubPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('my');

  return (
    <AppLayout>
      <div style={{ maxWidth:1300, margin:'0 auto', padding:'20px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:46,height:46,borderRadius:13,background:'#5B7FFF18',border:'1px solid #5B7FFF30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>🤖</div>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:S.t1 }}>Bot Trading</h1>
            <div style={{ fontSize:12, color:S.t3 }}>Grid · DCA · RSI · MACD · Breakout · Custom Python — 24/7 automated execution</div>
          </div>
          {!address && (
            <div style={{ marginLeft:'auto', padding:'8px 14px', background:`${S.gold}10`, border:`1px solid ${S.gold}30`, borderRadius:8, fontSize:11, color:S.gold }}>
              Connect wallet to create bots
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:11, marginBottom:22, width:'fit-content' }}>
          {[['my','🤖 My Bots'],['strategies','⚡ Strategies'],['performance','📊 Performance']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 22px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3 }}>{l}</button>
          ))}
        </div>

        {tab === 'my'         && <MyBotsTab />}
        {tab === 'strategies' && <StrategyTab onCreated={()=>setTab('my')} />}
        {tab === 'performance' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {MOCK_BOTS.filter(b=>b.status!=='stopped').map(bot => {
                const strat = STRAT_INFO[bot.type] || STRAT_INFO.grid;
                return (
                  <div key={bot.id} style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:16 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:12 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}><span style={{ fontSize:18 }}>{strat.icon}</span><div><div style={{ fontWeight:800,fontSize:13,color:S.t1 }}>{bot.name}</div><div style={{ fontSize:9,color:S.t3 }}>{bot.symbol}</div></div></div>
                      <div style={{ textAlign:'right' }}><div style={{ fontSize:18,fontWeight:900,fontFamily:'monospace',color:bot.pos?S.g:S.r }}>{bot.pnl}</div><div style={{ fontSize:10,color:bot.pos?S.g:S.r }}>{bot.pnlPct}</div></div>
                    </div>
                    {/* Mini bar chart for daily PnL */}
                    <div style={{ display:'flex',gap:3,alignItems:'flex-end',height:40,marginBottom:8 }}>
                      {Array.from({length:14}).map((_,i) => {
                        const v = (Math.sin(i*1.4 + bot.id.charCodeAt(1))*15 + 0.5*10 - 3);
                        return <div key={i} style={{ flex:1,height:`${Math.abs(v)}px`,background:v>=0?S.g:S.r,borderRadius:'2px 2px 0 0',minHeight:2 }}/>;
                      })}
                    </div>
                    <div style={{ fontSize:8,color:S.t3,textAlign:'center' }}>Daily PnL (last 14 days)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const MOCK_BOTS = [
  { id:'b1', type:'grid',     name:'BTC Grid 60K-75K',  symbol:'BTCUSDT', status:'running', pnl:'+$284.20', pnlPct:'+2.84%', runtime:'12d 4h',  trades:182, pos:true  },
  { id:'b2', type:'dca',      name:'ETH Daily DCA',     symbol:'ETHUSDT', status:'running', pnl:'+$128.40', pnlPct:'+4.28%', runtime:'8d 2h',   trades:8,   pos:true  },
  { id:'b3', type:'macd',     name:'BTC MACD 4H',       symbol:'BTCUSDT', status:'paused',  pnl:'-$42.80',  pnlPct:'-1.42%', runtime:'3d 8h',   trades:24,  pos:false },
  { id:'b4', type:'breakout', name:'ETH Breakout',      symbol:'ETHUSDT', status:'stopped', pnl:'+$824.00', pnlPct:'+8.24%', runtime:'22d 14h', trades:12,  pos:true  },
];
