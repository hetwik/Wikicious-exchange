import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const PROPS=[
  {id:'#142',type:'AI',title:'Increase BTC/USDT fee to 0.08% (vol spike)',rationale:'30-day realized vol rose to 4.2% vs 2.1% baseline. Dynamic fee model recommends 0.08% to compensate LPs.',trigger:'VOLATILITY_SPIKE',status:'Active',veto:0,timeLeft:'18h',age:'2h ago'},
  {id:'#141',type:'AI',title:'Rebalance rewards: +5% to ETH pool',rationale:'ETH/USDC pool utilisation at 28% vs 62% target. Increasing rewards will attract LPs.',trigger:'UTILISATION_LOW',status:'Executed',veto:0,timeLeft:'—',age:'1d ago'},
  {id:'#140',type:'HUMAN',title:'Add PEPE/USDC trading pair',rationale:'Community voted to add meme coin market. $2M TVL commitment from community.',trigger:'',status:'Passed',veto:0,timeLeft:'—',age:'3d ago'},
  {id:'#139',type:'AI',title:'Activate circuit breaker on SHIB2',rationale:'SHIB2 flagged as CRITICAL (score 94) by AI Guardrails. Recommend pausing liquidity.',trigger:'TVL_DROP',status:'Vetoed',veto:1,timeLeft:'—',age:'4d ago'},
];
const METRICS=[['TVL','$284M',S.a],['24h Volume','$48M',S.gold],['Avg Fee','0.061%',S.g],['LP Utilisation','64%',S.p]];
export default function AgenticDAOPage(){
  const [tab,setTab]=useState('proposals');
  const [myVeWIK]=useState(12840);
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#5B7FFF,#00E5A0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🤖</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Agentic DAO</h1><div style={{fontSize:11,color:S.t3}}>AI-driven governance · Human proposals · Automated fee optimization · 24h veto window</div></div>
      <div style={{marginLeft:'auto',textAlign:'right'}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>YOUR VEEWIK</div><div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',color:S.p}}>{myVeWIK.toLocaleString()}</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
      {METRICS.map(([l,v,c])=><div key={l} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:11,padding:14}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>PROTOCOL {l.toUpperCase()}</div><div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',color:c,marginTop:3}}>{v}</div></div>)}
    </div>
    <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:10,marginBottom:20,width:'fit-content'}}>
      {[['proposals','📋 Proposals'],['metrics','📊 AI Metrics'],['create','✍ Propose']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3}}>{l}</button>)}
    </div>
    {tab==='proposals'&&<div>{PROPS.map(p=><div key={p.id} style={{background:S.s1,border:`1px solid ${p.type==='AI'?S.a:S.b}`,borderRadius:13,padding:18,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{padding:'2px 8px',borderRadius:5,background:p.type==='AI'?`${S.a}15`:`${S.g}15`,color:p.type==='AI'?S.a:S.g,border:`1px solid ${p.type==='AI'?S.a:S.g}30`,fontSize:9,fontWeight:800}}>{p.type==='AI'?'🤖 AI AGENT':'👤 HUMAN'}</span>
          <span style={{fontSize:9,color:S.t3}}>{p.id} · {p.age}</span>
          {p.trigger&&<span style={{padding:'2px 8px',borderRadius:5,background:`${S.gold}15`,color:S.gold,fontSize:8,fontWeight:700}}>{p.trigger}</span>}
        </div>
        <span style={{padding:'3px 10px',borderRadius:6,background:p.status==='Active'?`${S.gold}15`:p.status==='Executed'||p.status==='Passed'?`${S.g}15`:`${S.r}15`,color:p.status==='Active'?S.gold:p.status==='Executed'||p.status==='Passed'?S.g:S.r,fontSize:9,fontWeight:700}}>{p.status}</span>
      </div>
      <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:4}}>{p.title}</div>
      <div style={{fontSize:11,color:S.t3,marginBottom:10,lineHeight:1.6}}>{p.rationale}</div>
      {p.status==='Active'&&<div style={{display:'flex',gap:8}}>
        <button style={{padding:'8px 16px',borderRadius:7,border:'none',background:S.g,color:'#000',fontWeight:800,fontSize:11,cursor:'pointer'}}>✅ Support</button>
        {p.type==='AI'&&<button style={{padding:'8px 16px',borderRadius:7,border:`1px solid ${S.r}30`,background:`${S.r}10`,color:S.r,fontWeight:800,fontSize:11,cursor:'pointer'}}>🚫 Veto (24h window: {p.timeLeft})</button>}
      </div>}
    </div>)}</div>}
    {tab==='metrics'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {[['Fee Revenue Trend (7d)','Stable at $184K/day. BTC high-vol period boosted fees by 24%.'],['LP Utilisation','64% avg. 3 pools below 40% threshold — AI has proposed rewards rebalancing.'],['TVL Change','$284M current. -3.2% this week. AI monitoring for TVL_DROP trigger.'],['AI Proposals Success Rate','82% of AI proposals executed without veto. 3 vetoed in last 30 days.']].map(([title,desc])=><div key={title} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:12,padding:18}}><div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:8}}>{title}</div><div style={{fontSize:12,color:S.t3,lineHeight:1.7}}>{desc}</div></div>)}
    </div>}
    {tab==='create'&&<div style={{maxWidth:540,background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:24}}>
      <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:16}}>Submit Human Proposal</div>
      <div style={{background:`${S.gold}10`,border:`1px solid ${S.gold}30`,borderRadius:8,padding:'10px 12px',marginBottom:18,fontSize:11,color:S.gold}}>Min 50,000 veWIK required · Your balance: {myVeWIK.toLocaleString()} ({myVeWIK<50000?'❌ Insufficient':'✅ Eligible'})</div>
      {['Title','Description','Target Contract (optional)'].map(l=><div key={l} style={{marginBottom:14}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>{l.toUpperCase()}</div>{l==='Description'?<textarea rows={4} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:11,padding:'10px 12px',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>:<input style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,padding:'10px 12px',outline:'none',boxSizing:'border-box'}}/>}</div>)}
      <button style={{width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:myVeWIK>=50000?S.a:'#1C2138',color:myVeWIK>=50000?'#fff':S.t3,cursor:myVeWIK>=50000?'pointer':'not-allowed'}}>Submit Proposal</button>
    </div>}
  </div></AppLayout>;
}