import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const fmt = v => { const n=parseFloat(v||0); if(n>=1e9)return'$'+(n/1e9).toFixed(2)+'B'; if(n>=1e6)return'$'+(n/1e6).toFixed(2)+'M'; if(n>=1e3)return'$'+(n/1e3).toFixed(1)+'K'; return'$'+n.toFixed(2); };

const PLANS = [
  { id:'BASIC',      icon:'🥉', price:'$500',  priceNum:500,  execDay:'1,000/day',  keepers:1,  sla:'99.0%', color:'#8892B0', features:['1,000 executions/day','1 assigned keeper','Standard queue','Email support','On-chain liquidations'] },
  { id:'PRO',        icon:'🥈', price:'$1,500', priceNum:1500, execDay:'5,000/day',  keepers:3,  sla:'99.9%', color:'#5B7FFF', features:['5,000 executions/day','3 assigned keepers','Priority queue','24/7 support','Custom bots','Webhook alerts'], recommended:true },
  { id:'ENTERPRISE', icon:'🥇', price:'$5,000', priceNum:5000, execDay:'Unlimited',  keepers:10, sla:'99.99%',color:'#FFB800', features:['Unlimited executions','10 dedicated keepers','Private queue + SLA','Dedicated engineer','Custom strategy bots','White-glove onboarding'] },
];

const MOCK_CLIENTS = [
  { id:0, name:'AaveV4',      website:'aave.com',    tier:'ENTERPRISE', paidUntil:1780000000, totalExecutions:48200, totalPaid:'5000000000', active:true },
  { id:1, name:'RadiantFi',   website:'radiant.io',  tier:'PRO',        paidUntil:1778000000, totalExecutions:12400, totalPaid:'1500000000', active:true },
  { id:2, name:'PendleFi',    website:'pendle.io',   tier:'BASIC',      paidUntil:1776000000, totalExecutions:3800,  totalPaid:'500000000',  active:true },
];

const MOCK_STATS = { totalRevenue:'20000000000', mrr:'6500000000', keeperPool:'14000000000', totalClients:12 };

const TIER_COLOR = { BASIC:'#8892B0', PRO:'#5B7FFF', ENTERPRISE:'#FFB800' };

export default function KaasDashboardPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');
  const [regForm, setRegForm] = useState({ name:'', website:'', tier:'PRO' });

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['kaas-stats'], queryFn:()=>api('/api/kaas/stats'), placeholderData:MOCK_STATS });
  const { data: clients = MOCK_CLIENTS } = useQuery({ queryKey:['kaas-clients'], queryFn:()=>api('/api/kaas/clients'), placeholderData:MOCK_CLIENTS });

  const S = { bg:'#06080F', card:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800' };

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#5B7FFF20', border:'1px solid #5B7FFF40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🤖</div>
            <div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Keeper-as-a-Service</h1>
              <p style={{ margin:0, color:S.t3, fontSize:13 }}>External protocols pay to use Wikicious's keeper network. You earn 30% of every subscription.</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
          {[
            { l:'Total Revenue', v:fmt(parseFloat(stats.totalRevenue||0)/1e6*1000000), c:S.accent },
            { l:'Monthly Run Rate', v:fmt(parseFloat(stats.mrr||0)/1e6*1000000), c:S.green },
            { l:'Keeper Reward Pool', v:fmt(parseFloat(stats.keeperPool||0)/1e6*1000000), c:S.gold },
            { l:'Active Clients', v:stats.totalClients||0, c:'#A855F7' },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:7 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:22, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:4, background:S.card, padding:4, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:24, width:'fit-content' }}>
          {['overview','pricing','clients','register'].map(t => (
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, transition:'all .15s',
                background:activeTab===t?S.accent:'transparent', color:activeTab===t?'#fff':S.t3 }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
              {/* Revenue split */}
              <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:20 }}>
                <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:16 }}>Revenue Split Model</div>
                {[
                  { share:70, label:'Keeper Rewards', desc:'Distributed to WikiKeeperRegistry stakers', color:S.green },
                  { share:30, label:'Protocol Treasury', desc:'Flows to Wikicious revenue pool', color:S.accent },
                ].map(({ share,label,desc,color }) => (
                  <div key={label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ color:S.t1, fontWeight:700, fontSize:13 }}>{label}</span>
                      <span style={{ color, fontWeight:900, fontSize:16, fontFamily:'monospace' }}>{share}%</span>
                    </div>
                    <div style={{ height:6, background:'#0A0C16', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${share}%`, height:'100%', background:color, borderRadius:3 }} />
                    </div>
                    <div style={{ color:S.t3, fontSize:10, marginTop:3 }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:20 }}>
                <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:16 }}>How KaaS Works</div>
                {[
                  { n:'1', t:'Protocol Signs Up', d:'External DeFi protocol registers and pays monthly subscription', c:S.accent },
                  { n:'2', t:'Wikicious Assigns Keepers', d:'Our keeper network starts watching their contracts 24/7', c:S.green },
                  { n:'3', t:'Auto-Execute', d:'Keepers run liquidations, oracles, settlements automatically', c:'#A855F7' },
                  { n:'4', t:'You Earn', d:'30% of subscription directly to protocol treasury, 70% to keepers', c:S.gold },
                ].map(({ n,t,d,c }) => (
                  <div key={n} style={{ display:'flex', gap:12, marginBottom:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:`${c}20`, border:`1px solid ${c}40`, display:'flex', alignItems:'center', justifyContent:'center', color:c, fontWeight:900, fontSize:11, flexShrink:0 }}>{n}</div>
                    <div>
                      <div style={{ color:S.t1, fontWeight:700, fontSize:12 }}>{t}</div>
                      <div style={{ color:S.t3, fontSize:11 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent executions */}
            <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${S.border}`, fontWeight:700, fontSize:13, color:S.t1 }}>Recent Executions</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#131829' }}>
                  {['Client','Action','Target','Status','Time'].map(h => (
                    <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    { client:'AaveV4',   action:'Liquidation',   target:'0x7f3a…', ok:true,  ago:'12s' },
                    { client:'RadiantFi',action:'Oracle Update',  target:'0x2b8c…', ok:true,  ago:'45s' },
                    { client:'AaveV4',   action:'Liquidation',   target:'0x9d1e…', ok:true,  ago:'1m'  },
                    { client:'PendleFi', action:'Position Settle',target:'0x4a2f…', ok:false, ago:'3m'  },
                    { client:'RadiantFi',action:'Liquidation',   target:'0x8b3c…', ok:true,  ago:'5m'  },
                  ].map((r,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${S.border}` }}>
                      <td style={{ padding:'10px 16px', color:S.accent, fontSize:12, fontWeight:600 }}>{r.client}</td>
                      <td style={{ padding:'10px 16px', color:S.t1, fontSize:12 }}>{r.action}</td>
                      <td style={{ padding:'10px 16px', color:S.t3, fontSize:11, fontFamily:'monospace' }}>{r.target}</td>
                      <td style={{ padding:'10px 16px' }}>
                        <span style={{ background:r.ok?'#00E5A015':'#FF406015', color:r.ok?S.green:'#FF4060', border:`1px solid ${r.ok?'#00E5A030':'#FF406030'}`, borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>{r.ok?'SUCCESS':'FAILED'}</span>
                      </td>
                      <td style={{ padding:'10px 16px', color:S.t3, fontSize:11, fontFamily:'monospace' }}>{r.ago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRICING */}
        {activeTab === 'pricing' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ background:p.recommended?`${p.color}0C`:S.card, border:`1px solid ${p.recommended?p.color:S.border}`, borderRadius:16, padding:24, position:'relative' }}>
                {p.recommended && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:p.color, color:'#000', borderRadius:20, padding:'3px 14px', fontSize:10, fontWeight:800 }}>MOST POPULAR</div>}
                <div style={{ fontSize:28, marginBottom:10 }}>{p.icon}</div>
                <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:4 }}>{p.id}</div>
                <div style={{ fontSize:30, fontWeight:900, color:p.color, fontFamily:'monospace', marginBottom:4 }}>{p.price}<span style={{ fontSize:14, color:S.t3, fontWeight:400 }}>/mo</span></div>
                <div style={{ marginBottom:20 }}>
                  {[['Executions', p.execDay],['Keepers', p.keepers],['Uptime SLA', p.sla]].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.border}40` }}>
                      <span style={{ color:S.t3, fontSize:12 }}>{k}</span>
                      <span style={{ color:S.t1, fontSize:12, fontWeight:600, fontFamily:'monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:20 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                      <span style={{ color:p.color, fontSize:12 }}>✓</span>
                      <span style={{ color:S.t2, fontSize:12 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setActiveTab('register')}
                  style={{ width:'100%', padding:12, borderRadius:10, border:'none', background:p.recommended?p.color:'transparent', color:p.recommended?'#000':p.color, fontWeight:900, fontSize:13, cursor:'pointer', border:`1px solid ${p.color}` }}>
                  Get Started →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CLIENTS */}
        {activeTab === 'clients' && (
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${S.border}`, fontWeight:700, fontSize:13, color:S.t1 }}>Active Clients ({clients.length})</div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#131829' }}>
                {['Protocol','Tier','Executions','Paid','Active Until','Status'].map(h => (
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {clients.map((c,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${S.border}` }}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ fontWeight:700, color:S.t1, fontSize:13 }}>{c.name}</div>
                      <div style={{ color:S.t3, fontSize:10 }}>{c.website}</div>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ background:`${TIER_COLOR[c.tier]}15`, color:TIER_COLOR[c.tier], border:`1px solid ${TIER_COLOR[c.tier]}30`, borderRadius:5, padding:'3px 9px', fontSize:10, fontWeight:800 }}>{c.tier}</span>
                    </td>
                    <td style={{ padding:'11px 16px', color:S.t1, fontFamily:'monospace', fontSize:12 }}>{c.totalExecutions?.toLocaleString()}</td>
                    <td style={{ padding:'11px 16px', color:S.green, fontFamily:'monospace', fontSize:12 }}>${(parseFloat(c.totalPaid||0)/1e9).toFixed(1)}K</td>
                    <td style={{ padding:'11px 16px', color:S.t2, fontSize:11 }}>{new Date((c.paidUntil||0)*1000).toLocaleDateString()}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ background:c.active?'#00E5A015':'#FF406015', color:c.active?S.green:'#FF4060', border:`1px solid ${c.active?'#00E5A030':'#FF406030'}`, borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:800 }}>{c.active?'ACTIVE':'EXPIRED'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REGISTER */}
        {activeTab === 'register' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:28 }}>
              <div style={{ fontWeight:900, fontSize:18, color:S.t1, marginBottom:6 }}>Register Your Protocol</div>
              <div style={{ color:S.t3, fontSize:13, marginBottom:24 }}>Start using Wikicious's keeper network for your protocol in under 5 minutes.</div>
              {[['Protocol Name','name','e.g. AaveV4'],['Website','website','e.g. aave.com']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, color:S.t3, fontWeight:700, letterSpacing:'.08em', marginBottom:5 }}>{l.toUpperCase()}</div>
                  <input value={regForm[k]} onChange={e=>setRegForm(p=>({...p,[k]:e.target.value}))} placeholder={ph}
                    style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.border}`, borderRadius:9, color:S.t1, fontSize:14, padding:'10px 14px', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }} />
                </div>
              ))}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, color:S.t3, fontWeight:700, letterSpacing:'.08em', marginBottom:8 }}>SELECT PLAN</div>
                <div style={{ display:'flex', gap:8 }}>
                  {PLANS.map(p => (
                    <button key={p.id} onClick={()=>setRegForm(f=>({...f,tier:p.id}))}
                      style={{ flex:1, padding:'10px 0', borderRadius:9, border:`1px solid ${regForm.tier===p.id?p.color:S.border}`, background:regForm.tier===p.id?`${p.color}15`:'transparent', color:regForm.tier===p.id?p.color:S.t3, fontWeight:800, fontSize:11, cursor:'pointer' }}>
                      {p.icon} {p.id}<br/><span style={{ fontSize:9, fontWeight:400 }}>{p.price}/mo</span>
                    </button>
                  ))}
                </div>
              </div>
              <button style={{ width:'100%', padding:14, borderRadius:10, border:'none', background:address?S.accent:'#1C2138', color:address?'#fff':S.t3, fontWeight:900, fontSize:14, cursor:address?'pointer':'not-allowed' }}>
                {address ? `Register on ${PLANS.find(p=>p.id===regForm.tier)?.price}/mo Plan` : 'Connect Wallet to Register'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
