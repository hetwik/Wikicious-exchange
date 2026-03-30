import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const PLANS = [
  { id:'basic', name:'Basic', price:20, color:'#8892B0', icon:'📊',
    features:['Real-time price feeds (15 symbols)','Basic candlestick charts','7-day historical data','On-chain position tracker','Public leaderboard access'],
    limits:['No API access','No whale tracking','No custom alerts'] },
  { id:'pro', name:'Pro', price:49, color:'#5B7FFF', icon:'🔬', recommended:true,
    features:['Everything in Basic','Liquidation heatmaps','Whale wallet tracker','Funding rate history','30-day historical data','REST API access (10K calls/day)','Custom price alerts','Open interest analytics'],
    limits:[] },
  { id:'enterprise', name:'Enterprise', price:199, color:'#FFB800', icon:'🏛️',
    features:['Everything in Pro','Raw data export (CSV/JSON)','365-day historical data','Unlimited API calls','WebSocket data stream','Custom dashboards','Priority support','White-label rights'],
    limits:[] },
];

const MOCK_STATS = { totalSubscribers:284, mrr:'$8,420', arr:'$101,040', churnRate:'3.2%', planBreakdown:{basic:180, pro:84, enterprise:20} };

function PlanCard({ plan, onSubscribe, current }) {
  const isCurrent = current === plan.id;
  return (
    <div style={{ background:plan.recommended?`${plan.color}0A`:'#0E1120', border:`2px solid ${plan.recommended||isCurrent?plan.color:'#1C2138'}`, borderRadius:16, padding:28, position:'relative', transition:'all .2s' }}>
      {plan.recommended && !isCurrent && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#000', borderRadius:20, padding:'4px 16px', fontSize:10, fontWeight:900 }}>MOST POPULAR</div>
      )}
      {isCurrent && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'#00E5A0', color:'#000', borderRadius:20, padding:'4px 16px', fontSize:10, fontWeight:900 }}>CURRENT PLAN</div>
      )}
      <div style={{ fontSize:28, marginBottom:10 }}>{plan.icon}</div>
      <div style={{ fontWeight:900, fontSize:20, color:'#EDF0FA', marginBottom:4 }}>{plan.name}</div>
      <div style={{ marginBottom:20 }}>
        <span style={{ color:plan.color, fontSize:36, fontWeight:900, fontFamily:'monospace' }}>${plan.price}</span>
        <span style={{ color:'#4A5270', fontSize:13 }}>/month</span>
      </div>
      <div style={{ borderTop:'1px solid #1C2138', paddingTop:16, marginBottom:16 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
            <span style={{ color:plan.color, fontSize:12, marginTop:1 }}>✓</span>
            <span style={{ color:'#8892B0', fontSize:12, lineHeight:1.5 }}>{f}</span>
          </div>
        ))}
        {plan.limits.map(l => (
          <div key={l} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
            <span style={{ color:'#4A5270', fontSize:12, marginTop:1 }}>✗</span>
            <span style={{ color:'#4A5270', fontSize:12, lineHeight:1.5 }}>{l}</span>
          </div>
        ))}
      </div>
      <button onClick={() => onSubscribe(plan)} style={{ width:'100%', padding:13, borderRadius:10, border:'none', cursor:'pointer', fontWeight:900, fontSize:13, transition:'all .15s',
        background:isCurrent?'#00E5A020':plan.recommended?plan.color:'transparent',
        color:isCurrent?'#00E5A0':plan.recommended?'#000':plan.color,
        border:`1px solid ${isCurrent?'#00E5A040':plan.color}` }}>
        {isCurrent ? '✓ Current Plan' : `Subscribe — $${plan.price}/mo`}
      </button>
    </div>
  );
}

const DEMO_LIQUIDATIONS = [
  { symbol:'BTCUSDT', size:'$240K', liqPrice:'$64,200', distance:'-2.4%', trader:'0x7f3a…', time:'2m ago' },
  { symbol:'ETHUSDT', size:'$84K',  liqPrice:'$3,180',  distance:'-1.8%', trader:'0x2b8c…', time:'5m ago' },
  { symbol:'SOLUSDT', size:'$42K',  liqPrice:'$148.40', distance:'-3.1%', trader:'0x9d1e…', time:'8m ago' },
  { symbol:'ARBUSDT', size:'$18K',  liqPrice:'$1.124',  distance:'-4.2%', trader:'0x4a2f…', time:'12m ago' },
];

export default function AnalyticsPage() {
  const { address } = useAccount();
  const [activeView, setActiveView] = useState('demo');
  const [currentPlan, setCurrentPlan] = useState(null);

  const { data: subStats = MOCK_STATS } = useQuery({ queryKey:['analytics-stats'], queryFn:()=>api('/api/analytics/stats'), placeholderData:MOCK_STATS });

  const handleSubscribe = (plan) => {
    if (!address) { alert('Connect wallet first'); return; }
    setCurrentPlan(plan.id);
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#A855F720', border:'1px solid #A855F740', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📡</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#EDF0FA' }}>Premium Analytics</h1>
            <p style={{ margin:0, color:'#4A5270', fontSize:13 }}>Advanced trading data, liquidation maps, whale tracking. Recurring SaaS revenue.</p>
          </div>
        </div>

        {/* Business stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:28 }}>
          {[
            {l:'Subscribers',    v:subStats.totalSubscribers, c:'#5B7FFF'},
            {l:'Monthly Revenue',v:subStats.mrr,              c:'#00E5A0'},
            {l:'Annual Run Rate',v:subStats.arr,              c:'#FFB800'},
            {l:'Churn Rate',     v:subStats.churnRate,        c:'#FF4060'},
            {l:'Enterprise',     v:subStats.planBreakdown?.enterprise||20, c:'#A855F7'},
          ].map(({l,v,c}) => (
            <div key={l} style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:'#4A5270', fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Demo preview tabs */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', gap:4, background:'#0E1120', padding:4, borderRadius:10, border:'1px solid #1C2138', marginBottom:16, width:'fit-content' }}>
            {[
              {id:'demo',       label:'📊 Live Preview'},
              {id:'plans',      label:'💳 Plans'},
              {id:'api',        label:'⚡ API Docs'},
            ].map(t => (
              <button key={t.id} onClick={()=>setActiveView(t.id)}
                style={{ padding:'8px 18px', borderRadius:7, border:'none', cursor:'pointer', fontWeight:700, fontSize:12,
                  background:activeView===t.id?'#A855F7':'transparent', color:activeView===t.id?'#fff':'#4A5270' }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeView === 'demo' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Liquidation heatmap demo */}
              <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#EDF0FA' }}>🔥 Liquidation Heatmap</div>
                  <span style={{ background:'#5B7FFF18', color:'#5B7FFF', border:'1px solid #5B7FFF30', borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>PRO+</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {['$68K','$67K','$66K','$65K','$64K','$63K','$62K'].map((price, i) => {
                    const longs = [12,28,84,240,420,180,62][i];
                    const shorts = [8,22,48,140,90,42,18][i];
                    const maxVal = 420;
                    return (
                      <div key={price} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ color:'#4A5270', fontSize:10, fontFamily:'monospace', width:40 }}>{price}</span>
                        <div style={{ flex:1, height:16, background:'#0A0C16', borderRadius:2, overflow:'hidden', display:'flex' }}>
                          <div style={{ width:`${longs/maxVal*100}%`, background:'#00E5A040', borderRadius:'2px 0 0 2px' }} />
                          <div style={{ width:`${shorts/maxVal*100}%`, background:'#FF406040', borderRadius:'0 2px 2px 0' }} />
                        </div>
                        <span style={{ color:'#4A5270', fontSize:9, width:60, textAlign:'right', fontFamily:'monospace' }}>${((longs+shorts)*1000/1e6).toFixed(1)}M</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', gap:16, marginTop:10 }}>
                  <span style={{ color:'#00E5A0', fontSize:10 }}>■ Long liquidations</span>
                  <span style={{ color:'#FF4060', fontSize:10 }}>■ Short liquidations</span>
                </div>
              </div>

              {/* Upcoming liquidations */}
              <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#EDF0FA' }}>⚠️ Near-Liquidation Alerts</div>
                  <span style={{ background:'#5B7FFF18', color:'#5B7FFF', border:'1px solid #5B7FFF30', borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>PRO+</span>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Symbol','Size','Liq Price','Distance'].map(h => (
                      <th key={h} style={{ textAlign:'left', fontSize:9, color:'#4A5270', fontWeight:700, padding:'0 0 8px', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {DEMO_LIQUIDATIONS.map((l,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #1C213840' }}>
                        <td style={{ padding:'7px 0', color:'#5B7FFF', fontWeight:700, fontSize:12 }}>{l.symbol.replace('USDT','')}</td>
                        <td style={{ padding:'7px 0', color:'#EDF0FA', fontSize:12, fontFamily:'monospace' }}>{l.size}</td>
                        <td style={{ padding:'7px 0', color:'#EDF0FA', fontSize:12, fontFamily:'monospace' }}>{l.liqPrice}</td>
                        <td style={{ padding:'7px 0', color:'#FF4060', fontSize:12, fontWeight:700 }}>{l.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Whale tracker */}
              <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#EDF0FA' }}>🐋 Whale Wallet Tracker</div>
                  <span style={{ background:'#5B7FFF18', color:'#5B7FFF', border:'1px solid #5B7FFF30', borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>PRO+</span>
                </div>
                {[
                  { addr:'0x7f3a…b2c4', action:'Opened Long',  sym:'BTC', size:'$2.4M', lev:'10×', ago:'3m' },
                  { addr:'0x2b8c…d1e5', action:'Closed Short', sym:'ETH', size:'$840K', lev:'5×',  ago:'8m' },
                  { addr:'0x9d1e…4f7a', action:'Opened Long',  sym:'ARB', size:'$420K', lev:'20×', ago:'15m' },
                ].map((w,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1C213840' }}>
                    <div>
                      <span style={{ color:'#A855F7', fontSize:11, fontFamily:'monospace' }}>{w.addr}</span>
                      <span style={{ color:'#4A5270', fontSize:11 }}> · {w.action} {w.sym} {w.lev}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ color:'#FFB800', fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{w.size}</span>
                      <span style={{ color:'#4A5270', fontSize:10 }}> · {w.ago}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Funding rates */}
              <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20 }}>
                <div style={{ fontWeight:800, fontSize:14, color:'#EDF0FA', marginBottom:14 }}>📉 Funding Rate History</div>
                {['BTCUSDT','ETHUSDT','ARBUSDT','SOLUSDT'].map(sym => {
                  const rate = (0.5*.004-.002).toFixed(4);
                  const pos = parseFloat(rate) > 0;
                  return (
                    <div key={sym} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #1C213440' }}>
                      <span style={{ color:'#EDF0FA', fontWeight:600, fontSize:12 }}>{sym.replace('USDT','')}</span>
                      <div style={{ flex:1, margin:'0 16px', height:4, background:'#0A0C16', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${Math.abs(parseFloat(rate))*2500}%`, height:'100%', background:pos?'#00E5A0':'#FF4060', marginLeft:pos?'50%':'', transform:pos?'':'translateX(-100%)', marginLeft:pos?'50%':'auto' }} />
                      </div>
                      <span style={{ color:pos?'#00E5A0':'#FF4060', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>{pos?'+':''}{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'plans' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {PLANS.map(plan => <PlanCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} current={currentPlan} />)}
            </div>
          )}

          {activeView === 'api' && (
            <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:28, maxWidth:800 }}>
              <div style={{ fontWeight:800, fontSize:16, color:'#EDF0FA', marginBottom:6 }}>REST API Documentation</div>
              <div style={{ color:'#4A5270', fontSize:13, marginBottom:20 }}>Available on Pro and Enterprise plans. Base URL: <code style={{ color:'#5B7FFF', background:'#0A0C16', padding:'2px 8px', borderRadius:4 }}>https://api.wikicious.io/v1</code></div>
              {[
                { method:'GET', endpoint:'/prices',                  desc:'Real-time mark prices for all symbols',   plan:'Basic' },
                { method:'GET', endpoint:'/liquidations',            desc:'Recent liquidation events with position data', plan:'Pro' },
                { method:'GET', endpoint:'/whales',                  desc:'Large position changes (>$100K)',          plan:'Pro' },
                { method:'GET', endpoint:'/funding-rates',           desc:'Historical funding rate data',             plan:'Pro' },
                { method:'GET', endpoint:'/open-interest',          desc:'Long/short OI breakdown by market',        plan:'Pro' },
                { method:'WS',  endpoint:'/ws/trades',              desc:'Real-time trade stream WebSocket',         plan:'Enterprise' },
                { method:'GET', endpoint:'/export/positions',        desc:'Raw position data CSV export',             plan:'Enterprise' },
              ].map(({ method,endpoint,desc,plan }) => (
                <div key={endpoint} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid #1C213440' }}>
                  <span style={{ background:method==='WS'?'#A855F718':'#5B7FFF18', color:method==='WS'?'#A855F7':'#5B7FFF', border:`1px solid ${method==='WS'?'#A855F730':'#5B7FFF30'}`, borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:800, minWidth:42, textAlign:'center' }}>{method}</span>
                  <code style={{ color:'#00E5A0', fontSize:12, flex:1 }}>{endpoint}</code>
                  <span style={{ color:'#8892B0', fontSize:12, flex:2 }}>{desc}</span>
                  <span style={{ background:'#FFB80018', color:'#FFB800', border:'1px solid #FFB80030', borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>{plan}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
