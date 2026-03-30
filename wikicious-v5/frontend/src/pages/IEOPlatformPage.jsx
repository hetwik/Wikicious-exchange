import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v=>{const n=parseFloat(v||0)/1e6;return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`;};
const S={bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const MOCK_STATS={totalRaised:'28400000000',totalProtocolFees:'852000000',projectCount:6};
const MOCK_PROJECTS=[
  {id:0,name:'ArbFi Protocol',symbol:'ARBFI',hardcap:'2000000000000',raised:'1840000000000',status:'ACTIVE',endTime:Date.now()/1000+86400*5,color:S.a},
  {id:1,name:'WikiBridge V5',symbol:'WBR2',hardcap:'5000000000000',raised:'5000000000000',status:'FINALIZED',endTime:0,color:S.g},
  {id:2,name:'DeepYield',symbol:'DYD',hardcap:'1000000000000',raised:'0',status:'APPROVED',endTime:Date.now()/1000+86400*14,color:S.gold},
];
const STATUS_C={PENDING:S.t3,APPROVED:S.a,ACTIVE:S.g,FINALIZED:S.gold,CANCELLED:S.r};

export default function IEOPlatformPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('live');
  const [form, setForm] = useState({name:'',symbol:'',hardcap:'',price:'',duration:'30'});
  const { data:stats=MOCK_STATS } = useQuery({queryKey:['ieo-stats'],queryFn:()=>api('/api/ieo/stats'),placeholderData:MOCK_STATS});
  const { data:projects=MOCK_PROJECTS } = useQuery({queryKey:['ieo-projects'],queryFn:()=>api('/api/ieo/projects'),placeholderData:MOCK_PROJECTS});

  return (
    <AppLayout>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#FFB80020',border:'1px solid #FFB80040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🚀</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>IEO Platform 2.0</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Primary token issuance on Arbitrum. 3% of raises + 2% token allocation + $5K listing fee + 50K WIK exclusivity bond.</p></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
          {[
            {l:'Total Raised',      v:fmtM(stats.totalRaised),       c:S.a},
            {l:'Protocol Revenue',  v:fmtM(stats.totalProtocolFees), c:S.g},
            {l:'Projects Listed',   v:stats.projectCount,            c:S.gold},
            {l:'Protocol Fee',      v:'3% of raise',                 c:S.p},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:19,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:10,marginBottom:18,width:'fit-content'}}>
          {['live','upcoming','apply'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:800,fontSize:12,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3,transition:'all .15s',textTransform:'capitalize'}}>
              {t==='live'?'🔴 Live Sales':t==='upcoming'?'📅 Upcoming':'📝 Apply to List'}
            </button>
          ))}
        </div>
        {tab!=='apply' ? (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {projects.filter(p=>tab==='live'?p.status==='ACTIVE':p.status==='APPROVED').map(p=>{
              const pct=Math.min(100,parseFloat(p.raised||0)/Math.max(1,parseFloat(p.hardcap||1))*100);
              const timeLeft=Math.max(0,p.endTime*1000-Date.now());
              const days=Math.floor(timeLeft/86400000);
              return (
                <div key={p.id} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:48,height:48,borderRadius:12,background:`${p.color||S.a}20`,border:`1px solid ${p.color||S.a}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:p.color||S.a}}>{p.symbol?.charAt(0)||'?'}</div>
                      <div><div style={{fontWeight:900,fontSize:17,color:S.t1}}>{p.name}</div><div style={{color:S.t3,fontSize:11,fontFamily:'monospace'}}>{p.symbol} · Arbitrum</div></div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span style={{background:`${STATUS_C[p.status]||S.t3}18`,color:STATUS_C[p.status]||S.t3,border:`1px solid ${STATUS_C[p.status]||S.t3}35`,borderRadius:5,padding:'3px 10px',fontSize:10,fontWeight:800}}>{p.status}</span>
                      {days>0&&<div style={{color:S.t3,fontSize:11,marginTop:4}}>{days}d remaining</div>}
                    </div>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:S.t3,marginBottom:5}}>
                      <span>Raised: {fmtM(p.raised)}</span><span>Hardcap: {fmtM(p.hardcap)}</span><span style={{color:S.g,fontWeight:700}}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{height:8,background:'#0A0C16',borderRadius:4,overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p.color||S.a},${S.g})`,borderRadius:4,transition:'width .5s'}}/>
                    </div>
                  </div>
                  <button style={{padding:'10px 24px',borderRadius:9,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:12,background:address?p.color||S.a:'#1C2138',color:address?'#000':S.t3}}>
                    {address?`Participate in ${p.symbol}`:'Connect Wallet'}
                  </button>
                </div>
              );
            })}
            {projects.filter(p=>tab==='live'?p.status==='ACTIVE':p.status==='APPROVED').length===0&&<div style={{textAlign:'center',padding:40,color:S.t3}}>No {tab} projects — check back soon</div>}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:20}}>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
              <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:14}}>List Your Token on Wikicious</div>
              {[['Project Name','name','e.g. ArbFi Protocol'],['Token Symbol','symbol','e.g. ARBFI'],['Hardcap (USDC)','hardcap','e.g. 2000000'],['Token Price (USDC)','price','e.g. 0.05'],['Sale Duration (days)','duration','30']].map(([l,k,ph])=>(
                <div key={k} style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:4}}>{l.toUpperCase()}</div>
                  <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                    style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,fontFamily:'monospace',padding:'9px 11px',outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <button style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?S.gold:'#1C2138',color:address?'#000':S.t3}}>
                {address?'Submit Application':'Connect Wallet'}
              </button>
            </div>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22,height:'fit-content'}}>
              <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:14}}>What You Get</div>
              {[
                {icon:'💰',t:'Largest Arbitrum audience',d:'Access to Wikicious\'s full trading community'},
                {icon:'💧',t:'Automatic liquidity',d:'WikiOrderBook seeded with your token post-raise'},
                {icon:'🔒',t:'WIK bond = credibility signal',d:'50K WIK bond proves project seriousness'},
                {icon:'📊',t:'Analytics dashboard',d:'Real-time investor tracking and reporting'},
                {icon:'🤝',t:'12-month DEX exclusivity',d:'Protocol committed to growing your liquidity'},
              ].map(({icon,t,d})=>(
                <div key={t} style={{display:'flex',gap:10,marginBottom:12}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <div><div style={{color:S.t1,fontWeight:700,fontSize:12}}>{t}</div><div style={{color:S.t3,fontSize:11}}>{d}</div></div>
                </div>
              ))}
              <div style={{background:'#FFB80010',border:'1px solid #FFB80030',borderRadius:8,padding:12,marginTop:14}}>
                <div style={{color:S.gold,fontSize:12,fontWeight:700,marginBottom:6}}>Fees</div>
                {[['Listing fee','$5,000 USDC (one-time)'],['Protocol cut','3% of raise proceeds'],['Token allocation','2% of total supply'],['WIK bond','50,000 WIK (returned after 12mo)']].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                    <span style={{color:S.t3,fontSize:11}}>{k}</span><span style={{color:S.t1,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
