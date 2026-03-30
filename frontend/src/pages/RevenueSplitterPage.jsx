import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const SOURCES=[['WikiPerp','$242,496','40%'],['Forex/Metals','$90,936','15%'],['Liquidations','$60,624','10%'],['Bridge (LZ)','$48,499','8%'],['Lending Spread','$42,437','7%'],['IEO Platform','$30,312','5%'],['Spot Trading','$24,250','4%'],['Paymaster Markup','$18,187','3%'],['Zap Fees','$12,125','2%'],['36 more streams','$36,374','6%']];
const ALLOCATIONS=[{label:'veWIK Stakers',pct:40,color:S.a,amount:'$242,496',desc:'Distributed to governance stakers pro-rata to veWIK balance'},{label:'Protocol POL',pct:30,color:S.g,amount:'$181,872',desc:'Buys WIK/USDC LP permanently — protocol-owned liquidity forever'},{label:'Treasury / Dev',pct:20,color:S.gold,amount:'$121,248',desc:'Pays for audits, server costs, marketing, team salaries'},{label:'Safety Module',pct:10,color:S.r,amount:'$60,624',desc:'Insurance fund — covers exploits, compensates users'}];
export default function RevenueSplitterPage(){
  const [tab,setTab]=useState('live');
  const total=606240;
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#FFB800,#FF4060)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>💰</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Revenue Splitter</h1><div style={{fontSize:11,color:S.t3}}>WikiRevenueSplitter.sol · 40/30/20/10 automated on-chain distribution · 46 revenue streams</div></div>
      <div style={{marginLeft:'auto',textAlign:'right'}}><div style={{fontSize:8,color:S.t3}}>MONTHLY REVENUE</div><div style={{fontSize:24,fontWeight:900,fontFamily:'monospace',color:S.g}}>${total.toLocaleString()}</div></div>
    </div>
    <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:10,marginBottom:20,width:'fit-content'}}>
      {[['live','🔴 Live Flow'],['sources','📊 Sources'],['history','📅 History']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3}}>{l}</button>)}
    </div>
    {tab==='live'&&<div>
      <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:24,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:16}}>Current Allocation (40/30/20/10)</div>
        {ALLOCATIONS.map(a=><div key={a.label} style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontWeight:700,fontSize:12,color:S.t1}}>{a.label} — {a.pct}%</span><span style={{fontFamily:'monospace',fontSize:13,fontWeight:900,color:a.color}}>{a.amount}/mo</span></div>
          <div style={{height:8,background:'#0A0C16',borderRadius:4,overflow:'hidden'}}><div style={{width:`${a.pct}%`,height:'100%',background:a.color,borderRadius:4}}/></div>
          <div style={{fontSize:9,color:S.t3,marginTop:3}}>{a.desc}</div>
        </div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {ALLOCATIONS.map(a=><div key={a.label} style={{background:S.s1,border:`1px solid ${a.color}30`,borderRadius:11,padding:14,textAlign:'center'}}><div style={{fontSize:9,color:S.t3,fontWeight:700}}>{a.label.toUpperCase()}</div><div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',color:a.color,margin:'6px 0 2px'}}>{a.amount}</div><div style={{fontSize:8,color:S.t3}}>per month</div></div>)}
      </div>
    </div>}
    {tab==='sources'&&<div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',padding:'8px 16px',background:S.s2}}>{['Revenue Source','Monthly','Share'].map(h=><div key={h} style={{fontSize:8,color:S.t3,fontWeight:700}}>{h}</div>)}</div>
      {SOURCES.map(([name,amt,pct])=><div key={name} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',padding:'11px 16px',borderBottom:`1px solid ${S.b}15`,alignItems:'center'}}>
        <div style={{fontWeight:700,fontSize:12,color:S.t1}}>{name}</div>
        <div style={{fontFamily:'monospace',fontSize:12,fontWeight:900,color:S.g}}>{amt}</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:`${parseInt(pct)*3}px`,height:4,background:S.a,borderRadius:2}}/><span style={{fontSize:10,color:S.t3}}>{pct}</span></div>
      </div>)}
    </div>}
    {tab==='history'&&<div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18}}>
      {['Mar 2026','Feb 2026','Jan 2026'].map((m,i)=><div key={m} style={{display:'flex',justifyContent:'space-between',padding:'11px 0',borderBottom:`1px solid ${S.b}20`,alignItems:'center'}}>
        <div style={{fontWeight:700,fontSize:13,color:S.t1}}>{m}</div>
        <div style={{fontFamily:'monospace',fontSize:14,fontWeight:900,color:S.g}}>${(606240*(0.97**i)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,minWidth:300}}>
          {['Stakers','POL','Treasury','Safety'].map((l,j)=><div key={l}><div style={{fontSize:7,color:S.t3}}>{l}</div><div style={{fontSize:10,fontFamily:'monospace',color:[S.a,S.g,S.gold,S.r][j],fontWeight:700}}>${Math.round(606240*(0.97**i)*[0.4,0.3,0.2,0.1][j]).toLocaleString()}</div></div>)}
        </div>
      </div>)}
    </div>}
  </div></AppLayout>;
}