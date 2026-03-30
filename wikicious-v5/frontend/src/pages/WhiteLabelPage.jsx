// WhiteLabelPage.jsx
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const PLANS = [
  { id:'starter',  name:'Starter',  price:'$500',  calls:'100K/mo',  sla:'99.5%', color:'#8892B0', features:['100K API calls/month','OrderBook embedding','WebSocket price feed','Standard support','1 custom domain'] },
  { id:'growth',   name:'Growth',   price:'$1,200',calls:'500K/mo',  sla:'99.9%', color:'#5B7FFF', features:['500K API calls/month','Full perp engine embed','Custom branding','Priority support','3 custom domains','Revenue share dashboard'], recommended:true },
  { id:'scale',    name:'Scale',    price:'$2,000',calls:'2M/mo',    sla:'99.99%',color:'#FFB800', features:['2M API calls/month','Dedicated infrastructure','White-glove setup','SLA guarantee','Unlimited domains','Custom fee sharing','Co-marketing'] },
];

const MOCK_STATS = { activeClients:12, mrr:'$18,400', arr:'$220,800', apiCallsMonth:4820000, uptime:'99.97%' };

export default function WhiteLabelPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState({ company:'', website:'', plan:'growth', useCase:'' });

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['wl-stats'], queryFn:()=>api('/api/whitelabel/stats'), placeholderData:MOCK_STATS });

  const S = { card:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800' };

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏷️</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>White-Label API</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Other protocols embed your exchange infrastructure. Pure B2B SaaS revenue.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            {l:'Active Clients',  v:stats.activeClients,    c:S.accent},
            {l:'Monthly Revenue', v:stats.mrr,               c:S.green},
            {l:'Annual Run Rate', v:stats.arr,               c:S.gold},
            {l:'API Calls/Month', v:`${(stats.apiCallsMonth/1e6).toFixed(1)}M`, c:'#A855F7'},
            {l:'Uptime',          v:stats.uptime,            c:S.green},
          ].map(({l,v,c}) => (
            <div key={l} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:19, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:4, background:S.card, padding:4, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:20, width:'fit-content' }}>
          {['overview','pricing','contact'].map(t => (
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{ padding:'8px 18px', borderRadius:7, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, background:activeTab===t?S.gold:'transparent', color:activeTab===t?'#000':S.t3 }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
              <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:22 }}>
                <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:16 }}>What You Provide</div>
                {[
                  { icon:'📋', t:'OrderBook Engine', d:'Full CLOB matching engine with maker/taker fees' },
                  { icon:'📈', t:'Perpetuals Engine', d:'Complete perp trading with leverage, funding, liquidations' },
                  { icon:'💹', t:'Price Feeds', d:'Chainlink + guardian oracle data for 15+ markets' },
                  { icon:'🔄', t:'Spot Routing', d:'Uniswap V3 routing with spread revenue sharing' },
                  { icon:'📊', t:'Analytics Data', d:'Full historical trade and position data via REST/WS' },
                ].map(({ icon,t,d }) => (
                  <div key={t} style={{ display:'flex', gap:12, marginBottom:12 }}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <div>
                      <div style={{ color:S.t1, fontWeight:700, fontSize:12 }}>{t}</div>
                      <div style={{ color:S.t3, fontSize:11 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:22 }}>
                <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:16 }}>Revenue Share Model</div>
                <div style={{ background:'#0A0C16', borderRadius:10, padding:16, marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ color:S.t2, fontSize:13 }}>Monthly Subscription</span>
                    <span style={{ color:S.gold, fontWeight:900, fontSize:16, fontFamily:'monospace' }}>$500–$2,000</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:S.t2, fontSize:13 }}>Volume-based bonus</span>
                    <span style={{ color:S.green, fontWeight:700, fontSize:13, fontFamily:'monospace' }}>0.01% of client volume</span>
                  </div>
                </div>
                {[
                  ['Client signs up', 'They pay monthly SaaS fee'],
                  ['Client builds UI', 'Your engine powers their trades'],
                  ['Users trade', 'All fees still flow to you'],
                  ['Everyone wins', 'Client gets product, you get revenue'],
                ].map(([s,d],i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:`${S.gold}20`, border:`1px solid ${S.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', color:S.gold, fontWeight:900, fontSize:10, flexShrink:0 }}>{i+1}</div>
                    <div>
                      <div style={{ color:S.t1, fontWeight:700, fontSize:12 }}>{s}</div>
                      <div style={{ color:S.t3, fontSize:11 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ background:p.recommended?`${p.color}0A`:S.card, border:`2px solid ${p.recommended?p.color:S.border}`, borderRadius:16, padding:26, position:'relative' }}>
                {p.recommended && <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:p.color, color:'#fff', borderRadius:20, padding:'3px 14px', fontSize:10, fontWeight:900 }}>MOST POPULAR</div>}
                <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:4 }}>{p.name}</div>
                <div style={{ marginBottom:16 }}>
                  <span style={{ color:p.color, fontSize:30, fontWeight:900, fontFamily:'monospace' }}>{p.price}</span>
                  <span style={{ color:S.t3, fontSize:12 }}>/month</span>
                </div>
                {[['API Calls',p.calls],['Uptime SLA',p.sla]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.border}40` }}>
                    <span style={{ color:S.t3, fontSize:12 }}>{k}</span>
                    <span style={{ color:S.t1, fontSize:12, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, marginBottom:16 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:7, marginBottom:7 }}>
                      <span style={{ color:p.color, fontSize:11 }}>✓</span>
                      <span style={{ color:S.t2, fontSize:12 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setActiveTab('contact')} style={{ width:'100%', padding:12, borderRadius:9, border:`1px solid ${p.color}`, background:p.recommended?p.color:'transparent', color:p.recommended?'#fff':p.color, fontWeight:800, fontSize:12, cursor:'pointer' }}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'contact' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:28 }}>
              <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:20 }}>Start Your White-Label Integration</div>
              {[['Company Name','company','e.g. Degen Exchange'],['Website','website','e.g. degenexchange.io']].map(([l,k,ph])=>(
                <div key={k} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.08em', marginBottom:5 }}>{l.toUpperCase()}</div>
                  <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                    style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.border}`, borderRadius:8, color:S.t1, fontSize:13, padding:'9px 12px', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.08em', marginBottom:8 }}>PLAN</div>
                <div style={{ display:'flex', gap:6 }}>
                  {PLANS.map(p=>(
                    <button key={p.id} onClick={()=>setForm(f=>({...f,plan:p.id}))}
                      style={{ flex:1, padding:'9px 0', borderRadius:8, border:`1px solid ${form.plan===p.id?p.color:S.border}`, background:form.plan===p.id?`${p.color}15`:'transparent', color:form.plan===p.id?p.color:S.t3, fontWeight:800, fontSize:11, cursor:'pointer' }}>
                      {p.name}<br/><span style={{ fontSize:9, fontWeight:400 }}>{p.price}/mo</span>
                    </button>
                  ))}
                </div>
              </div>
              <button style={{ width:'100%', padding:13, borderRadius:10, border:'none', background:address?S.gold:'#1C2138', color:address?'#000':S.t3, fontWeight:900, fontSize:13, cursor:address?'pointer':'not-allowed' }}>
                {address ? 'Submit Integration Request' : 'Connect Wallet to Apply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
