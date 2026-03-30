import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

const S = { bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7' };

// Forex market hours (UTC)
function getMarketStatus() {
  const now = new Date();
  const utcH = now.getUTCHours();
  const utcD = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const utcMin = now.getUTCMinutes();
  const totalMin = utcH * 60 + utcMin;

  if (utcD === 0) return { open:false, session:'Weekend', next:'Monday 00:00 UTC' };
  if (utcD === 6) return { open:false, session:'Weekend', next:'Monday 00:00 UTC' };
  if (utcD === 5 && totalMin >= 21*60) return { open:false, session:'Weekend', next:'Monday 00:00 UTC' };

  // Sessions
  let session = 'Quiet';
  if (totalMin >= 0*60 && totalMin < 9*60)  session = 'Sydney / Tokyo';
  if (totalMin >= 7*60 && totalMin < 16*60) session = 'London (Peak)';
  if (totalMin >= 12*60 && totalMin < 21*60) session = 'New York';
  if (totalMin >= 7*60 && totalMin < 16*60 && totalMin >= 12*60) session = 'London + New York (Most Liquid)';

  return { open:true, session, next:'' };
}

const FOREX_PAIRS = {
  Majors: [
    { s:'EURUSD',  base:'EUR', quote:'USD', price:1.08420, chg:+0.12, spread:0.0001, pip:0.0001, lev:500, vol:'$48.2M' },
    { s:'GBPUSD',  base:'GBP', quote:'USD', price:1.26840, chg:-0.08, spread:0.0001, pip:0.0001, lev:500, vol:'$28.4M' },
    { s:'USDJPY',  base:'USD', quote:'JPY', price:148.420, chg:+0.24, spread:0.01,   pip:0.01,   lev:500, vol:'$42.1M' },
    { s:'USDCHF',  base:'USD', quote:'CHF', price:0.89840, chg:-0.04, spread:0.0001, pip:0.0001, lev:500, vol:'$18.2M' },
    { s:'AUDUSD',  base:'AUD', quote:'USD', price:0.64820, chg:+0.18, spread:0.0001, pip:0.0001, lev:500, vol:'$22.1M' },
    { s:'USDCAD',  base:'USD', quote:'CAD', price:1.35840, chg:+0.06, spread:0.0001, pip:0.0001, lev:500, vol:'$14.8M' },
    { s:'NZDUSD',  base:'NZD', quote:'USD', price:0.60120, chg:-0.14, spread:0.0001, pip:0.0001, lev:500, vol:'$8.4M'  },
    { s:'EURGBP',  base:'EUR', quote:'GBP', price:0.85480, chg:+0.04, spread:0.0001, pip:0.0001, lev:500, vol:'$12.4M' },
    { s:'EURJPY',  base:'EUR', quote:'JPY', price:160.840, chg:+0.36, spread:0.01,   pip:0.01,   lev:500, vol:'$18.8M' },
    { s:'GBPJPY',  base:'GBP', quote:'JPY', price:188.240, chg:+0.28, spread:0.01,   pip:0.01,   lev:500, vol:'$14.2M' },
  ],
  Minors: [
    { s:'EURAUD',  base:'EUR', quote:'AUD', price:1.67280, chg:+0.08, spread:0.0002, pip:0.0001, lev:200, vol:'$4.2M' },
    { s:'EURCAD',  base:'EUR', quote:'CAD', price:1.47280, chg:-0.12, spread:0.0002, pip:0.0001, lev:200, vol:'$3.8M' },
    { s:'GBPAUD',  base:'GBP', quote:'AUD', price:1.95840, chg:+0.18, spread:0.0002, pip:0.0001, lev:200, vol:'$3.4M' },
    { s:'GBPCAD',  base:'GBP', quote:'CAD', price:1.72480, chg:-0.06, spread:0.0002, pip:0.0001, lev:200, vol:'$2.8M' },
    { s:'AUDCAD',  base:'AUD', quote:'CAD', price:0.88120, chg:+0.04, spread:0.0002, pip:0.0001, lev:200, vol:'$2.4M' },
    { s:'AUDJPY',  base:'AUD', quote:'JPY', price:96.240,  chg:+0.42, spread:0.01,   pip:0.01,   lev:200, vol:'$4.8M' },
    { s:'CADJPY',  base:'CAD', quote:'JPY', price:109.240, chg:+0.18, spread:0.01,   pip:0.01,   lev:200, vol:'$2.8M' },
    { s:'CHFJPY',  base:'CHF', quote:'JPY', price:165.240, chg:+0.24, spread:0.01,   pip:0.01,   lev:200, vol:'$3.2M' },
    { s:'NZDJPY',  base:'NZD', quote:'JPY', price:89.240,  chg:+0.32, spread:0.01,   pip:0.01,   lev:200, vol:'$2.1M' },
    { s:'NZDCAD',  base:'NZD', quote:'CAD', price:0.81640, chg:-0.08, spread:0.0003, pip:0.0001, lev:200, vol:'$1.8M' },
  ],
  Exotics: [
    { s:'USDSGD',  base:'USD', quote:'SGD', price:1.33840, chg:+0.02, spread:0.0005, pip:0.0001, lev:50, vol:'$1.2M' },
    { s:'USDHKD',  base:'USD', quote:'HKD', price:7.82040, chg:+0.00, spread:0.001,  pip:0.001,  lev:50, vol:'$0.8M' },
    { s:'USDZAR',  base:'USD', quote:'ZAR', price:18.4240, chg:+0.48, spread:0.02,   pip:0.001,  lev:50, vol:'$0.6M' },
    { s:'USDMXN',  base:'USD', quote:'MXN', price:17.1840, chg:-0.28, spread:0.02,   pip:0.001,  lev:50, vol:'$0.5M' },
    { s:'USDINR',  base:'USD', quote:'INR', price:83.9840, chg:+0.04, spread:0.05,   pip:0.01,   lev:50, vol:'$0.4M' },
    { s:'USDTRY',  base:'USD', quote:'TRY', price:32.4840, chg:+0.12, spread:0.05,   pip:0.001,  lev:50, vol:'$0.4M' },
    { s:'USDBRL',  base:'USD', quote:'BRL', price:4.9840,  chg:+0.08, spread:0.02,   pip:0.001,  lev:50, vol:'$0.3M' },
    { s:'USDCNH',  base:'USD', quote:'CNH', price:7.2840,  chg:+0.02, spread:0.002,  pip:0.0001, lev:50, vol:'$0.5M' },
    { s:'EURTRY',  base:'EUR', quote:'TRY', price:35.1240, chg:+0.24, spread:0.08,   pip:0.001,  lev:50, vol:'$0.3M' },
    { s:'EURPLN',  base:'EUR', quote:'PLN', price:4.2840,  chg:-0.06, spread:0.001,  pip:0.0001, lev:50, vol:'$0.4M' },
  ],
};

const FLAG = { EUR:'🇪🇺', GBP:'🇬🇧', USD:'🇺🇸', JPY:'🇯🇵', AUD:'🇦🇺', CAD:'🇨🇦', NZD:'🇳🇿', CHF:'🇨🇭', SGD:'🇸🇬', HKD:'🇭🇰', ZAR:'🇿🇦', MXN:'🇲🇽', INR:'🇮🇳', TRY:'🇹🇷', BRL:'🇧🇷', CNH:'🇨🇳', PLN:'🇵🇱' };

export default function ForexPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('Majors');
  const [sel, setSel] = useState(FOREX_PAIRS.Majors[0]);
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(100);
  const [status, setStatus] = useState(getMarketStatus());

  useEffect(() => {
    const t = setInterval(() => setStatus(getMarketStatus()), 60000);
    return () => clearInterval(t);
  }, []);

  const bid = sel.price - sel.spread / 2;
  const ask = sel.price + sel.spread / 2;
  const pipValue = amount ? (parseFloat(amount) * leverage * sel.pip / sel.price * 10).toFixed(4) : '—';
  const margin = amount ? (parseFloat(amount) / leverage).toFixed(2) : '—';

  return (
    <AppLayout>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'16px 20px' }}>

        {/* Header with market status */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#5B7FFF18', border:'1px solid #5B7FFF40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🌍</div>
            <div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:S.t1 }}>Forex</h1>
              <div style={{ fontSize:12, color:S.t3 }}>28 currency pairs · up to 500× leverage · WikiForexOracle</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background: status.open ? '#00E5A010' : '#FF406010', border:`1px solid ${status.open?'#00E5A030':'#FF406030'}`, borderRadius:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: status.open ? S.g : S.r, boxShadow:`0 0 6px ${status.open?S.g:S.r}` }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color: status.open ? S.g : S.r }}>
                {status.open ? 'MARKET OPEN' : 'MARKET CLOSED'}
              </div>
              <div style={{ fontSize:10, color:S.t3 }}>{status.session || status.next}</div>
            </div>
          </div>
        </div>

        {/* Market hours banner */}
        <div style={{ background:'#5B7FFF0D', border:'1px solid #5B7FFF25', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', gap:16, flexWrap:'wrap' }}>
          {[['🌏 Sydney', '00:00–09:00'],['🗼 Tokyo', '00:00–09:00'],['💂 London', '07:00–16:00'],['🗽 New York', '12:00–21:00'],['🔒 Close', 'Fri 21:00 UTC']].map(([city,hours])=>(
            <div key={city} style={{ fontSize:11 }}>
              <span style={{ color:S.t3 }}>{city} </span>
              <span style={{ color:S.t1, fontFamily:'monospace', fontWeight:700 }}>{hours}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
          {/* Left: pair list */}
          <div>
            {/* Category tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:14 }}>
              {Object.keys(FOREX_PAIRS).map(t => (
                <button key={t} onClick={() => { setTab(t); setSel(FOREX_PAIRS[t][0]); }} style={{
                  padding:'7px 18px', borderRadius:8, border:`1px solid ${tab===t?S.a:S.b}`,
                  background: tab===t ? `${S.a}15` : 'transparent', cursor:'pointer',
                  fontWeight:700, fontSize:11, color: tab===t ? S.a : S.t3
                }}>
                  {t} ({FOREX_PAIRS[t].length})
                </button>
              ))}
            </div>

            {/* Pair table */}
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr', padding:'8px 16px', background:'#131829', borderBottom:`1px solid ${S.b}` }}>
                {['Pair','Price','24h %','Spread','Max Lev','Volume'].map(h => (
                  <div key={h} style={{ fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</div>
                ))}
              </div>
              {FOREX_PAIRS[tab].map((p,i) => (
                <div key={p.s} onClick={() => setSel(p)}
                  style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr',
                    padding:'11px 16px', borderBottom:`1px solid #1C213828`,
                    background: sel.s===p.s ? `${S.a}0C` : 'transparent',
                    cursor:'pointer', transition:'background .1s',
                    borderLeft: sel.s===p.s ? `3px solid ${S.a}` : '3px solid transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>{FLAG[p.base]||'🏳'}</span>
                    <span style={{ fontSize:14 }}>{FLAG[p.quote]||'🏳'}</span>
                    <div>
                      <div style={{ fontWeight:800, fontSize:12, color:S.t1 }}>{p.base}/{p.quote}</div>
                      <div style={{ fontSize:9, color:S.t3 }}>{p.lev}× max lev</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:S.t1, alignSelf:'center' }}>
                    {p.price.toFixed(p.price > 10 ? 3 : 5)}
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color: p.chg>=0?S.g:S.r, alignSelf:'center' }}>
                    {p.chg>=0?'+':''}{p.chg}%
                  </div>
                  <div style={{ fontSize:11, color:S.t2, alignSelf:'center', fontFamily:'monospace' }}>
                    {(p.spread * 10000).toFixed(1)} pips
                  </div>
                  <div style={{ fontSize:12, fontFamily:'monospace', color:S.gold, fontWeight:700, alignSelf:'center' }}>
                    {p.lev}×
                  </div>
                  <div style={{ fontSize:11, color:S.g, fontFamily:'monospace', alignSelf:'center' }}>
                    {p.vol}
                  </div>
                </div>
              ))}
            </div>

            {/* Info cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:14 }}>
              {[
                {icon:'⏰', title:'Market Hours', desc:'Mon 00:00 – Fri 21:00 UTC. Opening positions blocked outside hours. Closing always permitted.'},
                {icon:'📊', title:'Pip Value', desc:'1 pip = 0.0001 for most pairs. 0.01 for JPY pairs. Position sizing shown in lot units (100,000 base).'},
                {icon:'🔗', title:'Oracle Source', desc:'WikiForexOracle with Chainlink primary feeds (15 pairs) + Pyth fallback + guardian for exotics.'},
              ].map(({icon,title,desc}) => (
                <div key={title} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:11, padding:14 }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                  <div style={{ fontWeight:700, fontSize:12, color:S.t1, marginBottom:4 }}>{title}</div>
                  <div style={{ fontSize:11, color:S.t3, lineHeight:1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: trade form */}
          <div style={{ position:'sticky', top:68 }}>
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:14, padding:20 }}>
              {/* Pair header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:22 }}>{FLAG[sel.base]||'🏳'}</span>
                <span style={{ fontSize:22 }}>{FLAG[sel.quote]||'🏳'}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:16, color:S.t1 }}>{sel.base}/{sel.quote}</div>
                  <div style={{ fontSize:20, fontWeight:900, fontFamily:'monospace', color:S.a }}>
                    {sel.price.toFixed(sel.price>10?3:5)}
                  </div>
                </div>
              </div>

              {/* Bid/Ask */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
                <div style={{ background:'#00E5A010', border:'1px solid #00E5A030', borderRadius:8, padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:S.g, fontWeight:700, marginBottom:3 }}>BID</div>
                  <div style={{ fontSize:16, fontWeight:900, color:S.g, fontFamily:'monospace' }}>{bid.toFixed(sel.price>10?3:5)}</div>
                </div>
                <div style={{ background:'#FF406010', border:'1px solid #FF406030', borderRadius:8, padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:S.r, fontWeight:700, marginBottom:3 }}>ASK</div>
                  <div style={{ fontSize:16, fontWeight:900, color:S.r, fontFamily:'monospace' }}>{ask.toFixed(sel.price>10?3:5)}</div>
                </div>
              </div>

              {/* Buy/Sell */}
              <div style={{ display:'flex', gap:4, background:'#0A0C16', padding:3, borderRadius:9, marginBottom:14 }}>
                {['buy','sell'].map(s => (
                  <button key={s} onClick={() => setSide(s)} style={{
                    flex:1, padding:'9px 0', borderRadius:7, border:'none', cursor:'pointer',
                    fontWeight:800, fontSize:12, background: side===s?(s==='buy'?S.g:S.r):'transparent',
                    color: side===s?(s==='buy'?'#000':'#fff'):S.t3
                  }}>{s==='buy'?'▲ BUY':'▼ SELL'}</button>
                ))}
              </div>

              {/* Amount (lots) */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>AMOUNT (USD)</div>
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="1000"
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8,
                    color:S.t1, fontSize:15, fontFamily:'monospace', padding:'10px 12px', outline:'none', boxSizing:'border-box' }}/>
              </div>

              {/* Leverage */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>
                  <span>LEVERAGE</span><span style={{ color:S.a, fontSize:12, fontFamily:'monospace', fontWeight:900 }}>{leverage}×</span>
                </div>
                <input type="range" min="1" max={sel.lev} value={leverage} onChange={e=>setLeverage(Number(e.target.value))}
                  style={{ width:'100%', accentColor:S.a }}/>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:S.t3, marginTop:2 }}>
                  <span>1×</span><span>{sel.lev}×</span>
                </div>
              </div>

              {/* Trade details */}
              {amount && (
                <div style={{ background:'#0A0C16', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                  {[
                    ['Position Size', `$${(parseFloat(amount)*leverage).toLocaleString()}`],
                    ['Required Margin', `$${margin}`],
                    ['Pip Value', `$${pipValue}`],
                    ['Spread Cost', `${(sel.spread*10000).toFixed(1)} pips`],
                    ['Taker Fee (0.01%)', `$${(parseFloat(amount||0)*leverage*0.0001).toFixed(2)}`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                      <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                      <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <button style={{
                width:'100%', padding:13, borderRadius:10, border:'none',
                cursor: status.open && address ? 'pointer' : 'not-allowed',
                fontWeight:900, fontSize:13,
                background: !address ? S.s2 : !status.open ? '#FF406040' : side==='buy' ? S.g : S.r,
                color: !address || !status.open ? S.t3 : side==='buy' ? '#000' : '#fff'
              }}>
                {!address ? 'Connect Wallet' :
                 !status.open ? '🔒 Market Closed' :
                 `${side==='buy'?'BUY':'SELL'} ${sel.base}/${sel.quote} at ${side==='buy'?ask.toFixed(5):bid.toFixed(5)}`}
              </button>

              {!status.open && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#FF406010', border:'1px solid #FF406030', borderRadius:7, fontSize:11, color:S.r, textAlign:'center' }}>
                  Forex markets open Monday 00:00 UTC
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
