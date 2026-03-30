import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const POOLS=[{name:'USDC/USDT Institutional',fee:'0.01%',minTrade:'$10,000',tvl:'$48M',lpFee:'0.008%',protocol:'0.002%'},{name:'WBTC/USDC Institutional',fee:'0.05%',minTrade:'$50,000',tvl:'$28M',lpFee:'0.04%',protocol:'0.01%'},{name:'WETH/USDC Institutional',fee:'0.05%',minTrade:'$25,000',tvl:'$36M',lpFee:'0.04%',protocol:'0.01%'}];
const SUBS=[{tier:'BASIC',monthly:'$5,000',features:['1 verified entity','3 pools access','Standard execution','Compliance docs']},{tier:'PRO',monthly:'$15,000',features:['3 entities','All pools','Priority execution','OTC desk access','Dedicated support']},{tier:'ENTERPRISE',monthly:'$50,000/yr',features:['Unlimited entities','Custom pools','White-glove onboarding','Custom fee negotiation','Direct API','SLA guarantee']}];
export default function InstitutionalPage(){
  const [tab,setTab]=useState('pools');
  const [form,setForm]=useState({name:'',jurisdiction:'',email:''});
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#FFB800,#5B7FFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🏦</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Institutional Pools</h1><div style={{fontSize:11,color:S.t3}}>KYB-gated · Compliance-ready · Min $100K LP · Priority execution · WikiInstitutionalPool.sol</div></div>
      <div style={{marginLeft:'auto',padding:'8px 14px',background:`${S.gold}10`,border:`1px solid ${S.gold}30`,borderRadius:9}}><div style={{fontSize:9,color:S.t3}}>INSTITUTIONAL TVL</div><div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:S.gold}}>$112M</div></div>
    </div>
    <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:10,marginBottom:20,width:'fit-content'}}>
      {[['pools','🏊 Pools'],['subscribe','💎 Subscribe'],['kyb','🪪 KYB Onboarding']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.gold:'transparent',color:tab===t?'#000':S.t3}}>{l}</button>)}
    </div>
    {tab==='pools'&&<div>
      {POOLS.map(p=><div key={p.name} style={{background:S.s1,border:`1px solid ${S.gold}30`,borderRadius:13,padding:18,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
          <div><div style={{fontWeight:900,fontSize:15,color:S.t1}}>{p.name}</div><div style={{fontSize:10,color:S.t3}}>Min trade: {p.minTrade} · TVL: {p.tvl}</div></div>
          <button style={{padding:'9px 18px',borderRadius:9,border:'none',background:S.gold,color:'#000',fontWeight:800,fontSize:11,cursor:'pointer'}}>Trade Now</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[['Swap Fee',p.fee,S.g],['LP Fee',p.lpFee,S.a],['Protocol Fee',p.protocol,S.gold]].map(([l,v,c])=><div key={l} style={{background:'#0A0C16',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:16,fontWeight:900,fontFamily:'monospace',color:c,marginTop:3}}>{v}</div></div>)}
        </div>
      </div>)}
    </div>}
    {tab==='subscribe'&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
      {SUBS.map((s,i)=><div key={s.tier} style={{background:S.s1,border:`2px solid ${i===1?S.gold:S.b}`,borderRadius:14,padding:20,position:'relative'}}>
        {i===1&&<div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:S.gold,color:'#000',fontSize:8,fontWeight:900,padding:'2px 12px',borderRadius:10}}>MOST POPULAR</div>}
        <div style={{fontWeight:900,fontSize:18,color:i===1?S.gold:S.t1,marginBottom:4}}>{s.tier}</div>
        <div style={{fontSize:24,fontWeight:900,fontFamily:'monospace',color:S.t1,marginBottom:16}}>{s.monthly}</div>
        {s.features.map(f=><div key={f} style={{display:'flex',gap:8,padding:'5px 0',fontSize:11,color:S.t2}}><span style={{color:S.g}}>✓</span>{f}</div>)}
        <button style={{width:'100%',marginTop:16,padding:12,borderRadius:9,border:'none',fontWeight:800,fontSize:12,background:i===1?S.gold:`${S.a}20`,color:i===1?'#000':S.a,cursor:'pointer'}}>Select {s.tier}</button>
      </div>)}
    </div>}
    {tab==='kyb'&&<div style={{maxWidth:560,background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:24}}>
      <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:4}}>Institution KYB Registration</div>
      <div style={{fontSize:11,color:S.t3,marginBottom:18}}>Verification takes 1–3 business days. Required: company registration, beneficial ownership, compliance officer contact.</div>
      {['Institution Name','Jurisdiction','Compliance Contact Email','Registration Number'].map(l=><div key={l} style={{marginBottom:12}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>{l.toUpperCase()}</div><input style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,padding:'10px 12px',outline:'none',boxSizing:'border-box'}}/></div>)}
      <button style={{width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:S.gold,color:'#000',cursor:'pointer'}}>Submit KYB Application</button>
    </div>}
  </div></AppLayout>;
}