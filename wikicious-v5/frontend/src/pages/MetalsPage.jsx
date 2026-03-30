import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '../components/layout/AppLayout';

const S = { bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7', org:'#FF8C42' };

const ASSETS = [
  // Metals
  { s:'XAUUSD', name:'Gold',      unit:'oz',  color:'#FFB800', icon:'🥇', cat:'Metal',     price:2342.80, chg:+0.84, spread:0.50,  lev:100, oi:'$24.8M', vol:'$142M/day', info:'Largest precious metal market. Hedge against inflation and USD weakness.' },
  { s:'XAGUSD', name:'Silver',    unit:'oz',  color:'#C0C0C0', icon:'🥈', cat:'Metal',     price:27.480,  chg:+1.24, spread:0.02,  lev:100, oi:'$8.4M',  vol:'$28M/day',  info:'Silver trades both as precious metal and industrial input (solar panels, EV).' },
  { s:'XPTUSD', name:'Platinum',  unit:'oz',  color:'#E5E4E2', icon:'💎', cat:'Metal',     price:924.40,  chg:-0.42, spread:0.50,  lev:50,  oi:'$2.1M',  vol:'$8M/day',   info:'Used in automotive catalytic converters. Supply concentrated in South Africa.' },
  { s:'XPDUSD', name:'Palladium', unit:'oz',  color:'#A0A0A0', icon:'⚙️', cat:'Metal',     price:984.20,  chg:-1.82, spread:1.00,  lev:50,  oi:'$1.2M',  vol:'$4M/day',   info:'Palladium is a rare platinum-group metal used in emissions control systems.' },
  // Energy
  { s:'WTIUSD',   name:'Crude Oil (WTI)',   unit:'bbl', color:'#2D5016', icon:'🛢️', cat:'Energy', price:78.420, chg:+1.12, spread:0.05, lev:100, oi:'$18.4M', vol:'$94M/day',  info:'West Texas Intermediate — the US oil benchmark. NYMEX settlement.' },
  { s:'BRENTUSD', name:'Crude Oil (Brent)', unit:'bbl', color:'#1A3A0A', icon:'🛢️', cat:'Energy', price:82.840, chg:+0.94, spread:0.05, lev:100, oi:'$22.1M', vol:'$124M/day', info:'Brent Crude — the global benchmark. ICE settlement. ~75% of world crude.' },
  { s:'NGUSD',    name:'Natural Gas',       unit:'MMBtu',color:'#FF8C42', icon:'🔥', cat:'Energy', price:2.2840, chg:-2.84, spread:0.005,lev:50,  oi:'$4.2M',  vol:'$18M/day',  info:'Henry Hub Natural Gas. Highly seasonal — weather drives price more than supply.' },
  // Agriculture
  { s:'CORNUSD',  name:'Corn',    unit:'bu',  color:'#F5C842', icon:'🌽', cat:'Agri', price:442.40, chg:+0.28, spread:0.50, lev:25, oi:'$1.2M', vol:'$8M/day',  info:'CBOT corn futures. Influenced by USDA crop reports and weather in US Midwest.' },
  { s:'WHEATUSD', name:'Wheat',   unit:'bu',  color:'#C8A842', icon:'🌾', cat:'Agri', price:528.40, chg:-0.64, spread:0.50, lev:25, oi:'$0.8M', vol:'$6M/day',  info:'CBOT soft red winter wheat. Geopolitical supply disruptions heavily impact price.' },
  { s:'SOYUSD',   name:'Soybeans',unit:'bu',  color:'#8B6914', icon:'🫘', cat:'Agri', price:1184.4, chg:+0.14, spread:0.50, lev:25, oi:'$0.6M', vol:'$4M/day',  info:'CBOT soybeans — largest global oilseed. China demand is the dominant price driver.' },
  { s:'COFFEEUSD',name:'Coffee',  unit:'lb',  color:'#5C3317', icon:'☕', cat:'Agri', price:184.40, chg:+2.84, spread:0.10, lev:25, oi:'$0.4M', vol:'$2M/day',  info:'ICE arabica coffee (KC). Brazil weather and El Niño are the key supply factors.' },
  { s:'COTTONUSD',name:'Cotton',  unit:'lb',  color:'#F5F5F5', icon:'🫧', cat:'Agri', price:78.420, chg:-0.42, spread:0.10, lev:25, oi:'$0.3M', vol:'$2M/day',  info:'ICE cotton (CT). US export competitiveness vs India/Pakistan is the key dynamic.' },
  // Indices
  { s:'SPX500', name:'S&P 500',   unit:'pts', color:'#5B7FFF', icon:'📊', cat:'Index', price:5284.0, chg:+0.42, spread:0.50, lev:100, oi:'$28.4M', vol:'$184M/day', info:'500 largest US companies by market cap. Most widely traded equity index globally.' },
  { s:'NAS100', name:'NASDAQ 100',unit:'pts', color:'#A855F7', icon:'💻', cat:'Index', price:18428.0,chg:+0.68, spread:1.00, lev:100, oi:'$24.1M', vol:'$164M/day', info:'100 largest non-financial US tech companies. Apple, MSFT, NVDA dominate weighting.' },
  { s:'DJI30',  name:'Dow Jones', unit:'pts', color:'#00E5A0', icon:'🏭', cat:'Index', price:39284.0,chg:+0.24, spread:2.00, lev:100, oi:'$12.4M', vol:'$84M/day',  info:'30 blue-chip US companies. Price-weighted (unlike cap-weighted S&P). Less volatile.' },
  { s:'GER40',  name:'DAX 40',    unit:'pts', color:'#FFB800', icon:'🇩🇪', cat:'Index', price:18284.0,chg:+0.18, spread:2.00, lev:100, oi:'$8.4M',  vol:'$42M/day',  info:'40 largest German companies. Strong exposure to automotive and industrial sectors.' },
  { s:'UK100',  name:'FTSE 100',  unit:'pts', color:'#FF4060', icon:'🇬🇧', cat:'Index', price:8284.0, chg:-0.12, spread:1.00, lev:100, oi:'$6.2M',  vol:'$28M/day',  info:'100 largest UK companies. Heavy weighting toward energy, financials, miners.' },
  { s:'JPN225', name:'Nikkei 225',unit:'pts', color:'#FF8C42', icon:'🇯🇵', cat:'Index', price:38284.0,chg:+0.84, spread:5.00, lev:100, oi:'$8.8M',  vol:'$48M/day',  info:'225 large Japanese companies. Currency impact: yen weakening = Nikkei rising.' },
];

const CATS = ['All','Metal','Energy','Agri','Index'];

export default function MetalsPage() {
  const { address } = useAccount();
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState(ASSETS[0]);
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(20);

  const filtered = cat === 'All' ? ASSETS : ASSETS.filter(a => a.cat === cat);
  const margin = amount ? (parseFloat(amount) / leverage).toFixed(2) : '—';
  const pos = amount ? (parseFloat(amount) * leverage).toFixed(2) : '—';

  return (
    <AppLayout>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'16px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🥇</div>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:S.t1 }}>Metals · Energy · Commodities · Indices</h1>
            <div style={{ fontSize:12, color:S.t3 }}>Gold, Silver, Oil, Natural Gas, S&P 500, NASDAQ · {ASSETS.length} markets · Market hours enforced</div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            {l:'Gold (XAU)',   v:'$2,342.80', c:S.gold},
            {l:'Silver (XAG)', v:'$27.48',    c:'#C0C0C0'},
            {l:'WTI Oil',      v:'$78.42',    c:'#4CAF50'},
            {l:'S&P 500',      v:'5,284',     c:S.a},
            {l:'NASDAQ 100',   v:'18,428',    c:S.p},
          ].map(({l,v,c}) => (
            <div key={l} style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:11, padding:'12px 14px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize:18, fontWeight:900, fontFamily:'monospace', color:c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
          <div>
            {/* Category filter */}
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{
                  padding:'7px 16px', borderRadius:8, border:`1px solid ${cat===c?S.gold:S.b}`,
                  background: cat===c ? '#FFB80015' : 'transparent',
                  cursor:'pointer', fontWeight:700, fontSize:11,
                  color: cat===c ? S.gold : S.t3
                }}>{c}</button>
              ))}
            </div>

            {/* Asset grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
              {filtered.map(a => (
                <div key={a.s} onClick={() => { setSel(a); setLeverage(Math.min(leverage, a.lev)); }}
                  style={{ background: sel.s===a.s ? `${a.color}0C` : S.s1,
                    border:`1px solid ${sel.s===a.s?a.color:S.b}`,
                    borderRadius:13, padding:16, cursor:'pointer', transition:'all .12s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:`${a.color}20`, border:`1px solid ${a.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{a.icon}</div>
                      <div>
                        <div style={{ fontWeight:900, fontSize:14, color:S.t1 }}>{a.name}</div>
                        <div style={{ fontSize:9, color:S.t3 }}>{a.s} · per {a.unit}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:900, color:a.color }}>
                        ${a.price.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </div>
                      <div style={{ fontSize:11, fontFamily:'monospace', color:a.chg>=0?S.g:S.r, fontWeight:700 }}>
                        {a.chg>=0?'+':''}{a.chg}%
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:S.t3, lineHeight:1.5, marginBottom:8 }}>{a.info}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['Max Lev',`${a.lev}×`,S.gold],['OI',a.oi,S.a],['Vol',a.vol,S.g]].map(([k,v,c]) => (
                      <div key={k} style={{ background:'#0A0C16', borderRadius:6, padding:'4px 8px' }}>
                        <div style={{ fontSize:8, color:S.t3, fontWeight:700 }}>{k}</div>
                        <div style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade form */}
          <div style={{ position:'sticky', top:68, height:'fit-content' }}>
            <div style={{ background:S.s1, border:`1px solid ${sel.color}40`, borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:28 }}>{sel.icon}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:16, color:S.t1 }}>{sel.name}</div>
                  <div style={{ fontFamily:'monospace', fontSize:20, fontWeight:900, color:sel.color }}>
                    ${sel.price.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                </div>
              </div>

              {/* Bid/Ask */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
                <div style={{ background:'#00E5A010', border:'1px solid #00E5A030', borderRadius:7, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:S.g, fontWeight:700 }}>BID</div>
                  <div style={{ fontSize:13, fontWeight:900, color:S.g, fontFamily:'monospace' }}>
                    ${(sel.price - sel.spread/2).toFixed(sel.price>100?2:3)}
                  </div>
                </div>
                <div style={{ background:'#FF406010', border:'1px solid #FF406030', borderRadius:7, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:S.r, fontWeight:700 }}>ASK</div>
                  <div style={{ fontSize:13, fontWeight:900, color:S.r, fontFamily:'monospace' }}>
                    ${(sel.price + sel.spread/2).toFixed(sel.price>100?2:3)}
                  </div>
                </div>
              </div>

              {/* Buy/Sell */}
              <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:9, marginBottom:14 }}>
                {['buy','sell'].map(s => (
                  <button key={s} onClick={() => setSide(s)} style={{
                    flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer',
                    fontWeight:800, fontSize:12, background: side===s ? (s==='buy'?S.g:S.r) : 'transparent',
                    color: side===s ? (s==='buy'?'#000':'#fff') : S.t3
                  }}>{s==='buy'?'▲ LONG':'▼ SHORT'}</button>
                ))}
              </div>

              {/* Amount */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>COLLATERAL (USDC)</div>
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="500"
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8,
                    color:S.t1, fontSize:15, fontFamily:'monospace', padding:'10px 12px', outline:'none', boxSizing:'border-box' }}/>
              </div>

              {/* Leverage */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>
                  <span>LEVERAGE</span>
                  <span style={{ color:sel.color, fontSize:13, fontWeight:900, fontFamily:'monospace' }}>{leverage}×</span>
                </div>
                <input type="range" min="1" max={sel.lev} value={Math.min(leverage,sel.lev)}
                  onChange={e=>setLeverage(Number(e.target.value))}
                  style={{ width:'100%', accentColor:sel.color }}/>
              </div>

              {/* Trade details */}
              {amount && (
                <div style={{ background:'#0A0C16', borderRadius:8, padding:'10px', marginBottom:12 }}>
                  {[
                    ['Position Size', `$${parseFloat(pos).toLocaleString()}`],
                    ['Required Margin', `$${margin}`],
                    [`${sel.unit.toUpperCase()} Value`, `${(parseFloat(amount||0)*leverage/sel.price).toFixed(4)} ${sel.unit}`],
                    ['Fee (0.03%)', `$${(parseFloat(amount||0)*leverage*0.0003).toFixed(2)}`],
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
                cursor: address ? 'pointer' : 'not-allowed', fontWeight:900, fontSize:13,
                background: !address ? S.s2 : side==='buy' ? sel.color : S.r,
                color: !address ? S.t3 : '#000'
              }}>
                {address ? `${side==='buy'?'LONG':'SHORT'} ${sel.name}` : 'Connect Wallet'}
              </button>
            </div>

            {/* Quick facts */}
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:14, marginTop:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:S.t1, marginBottom:10 }}>Market Info</div>
              {[
                ['Taker Fee', '0.03%'],
                ['Maker Fee', 'FREE'],
                ['Settlement', 'Continuous'],
                ['Oracle', 'Chainlink + WikiForexOracle'],
                ['Market Hours', 'Mon–Fri (indices & metals)'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${S.b}20` }}>
                  <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                  <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
