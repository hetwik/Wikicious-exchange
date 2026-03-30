import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const TIERS=[['SAFE','#00E5A0'],['CAUTION','#FFB800'],['DANGER','#FF8C42'],['CRITICAL','#FF4060']];
const TOKENS=[{sym:'USDC',addr:'0xaf88…',score:2,tier:0,honeypot:false,locked:true,lockExp:'2027',proxy:false,ownerConc:0},{sym:'WIK',addr:'0x172B…',score:18,tier:0,honeypot:false,locked:true,lockExp:'2026',proxy:false,ownerConc:12},{sym:'LINK',addr:'0x514d…',score:15,tier:0,honeypot:false,locked:true,lockExp:'∞',proxy:false,ownerConc:8},{sym:'SHIB2',addr:'0x4f2a…',score:72,tier:2,honeypot:false,locked:false,lockExp:'expired',proxy:true,ownerConc:48},{sym:'MEMERUG',addr:'0x9b3c…',score:94,tier:3,honeypot:true,locked:false,lockExp:'none',proxy:true,ownerConc:87}];
export default function AIGuardrailsPage(){
  const [filter,setFilter]=useState(-1);
  const [insuranceAmount,setInsuranceAmount]=useState(1000);
  const shown=filter===-1?TOKENS:TOKENS.filter(t=>t.tier===filter);
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#FF4060,#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🛡</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>AI Guardrails</h1><div style={{fontSize:11,color:S.t3}}>Real-time honeypot scanning · Swap insurance · WikiAIGuardrails on-chain</div></div>
      <div style={{marginLeft:'auto',padding:'8px 14px',background:'#00E5A010',border:'1px solid #00E5A030',borderRadius:8}}><div style={{fontSize:9,color:S.t3}}>INSURANCE FUND</div><div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:S.g}}>$4.8M</div></div>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:16}}>
      <button onClick={()=>setFilter(-1)} style={{padding:'6px 14px',borderRadius:7,border:`1px solid ${filter===-1?S.a:S.b}`,background:filter===-1?`${S.a}15`:'transparent',color:filter===-1?S.a:S.t3,fontSize:10,fontWeight:700,cursor:'pointer'}}>All ({TOKENS.length})</button>
      {TIERS.map(([label,color],i)=><button key={label} onClick={()=>setFilter(i)} style={{padding:'6px 14px',borderRadius:7,border:`1px solid ${filter===i?color:S.b}`,background:filter===i?color+'15':'transparent',color:filter===i?color:S.t3,fontSize:10,fontWeight:700,cursor:'pointer'}}>{label}</button>)}
    </div>
    <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,overflow:'hidden',marginBottom:20}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 0.8fr 0.6fr 0.8fr 0.8fr 0.7fr 0.8fr',padding:'8px 16px',background:S.s2}}>
        {['Token','Risk Score','Tier','Honeypot','LP Locked','Proxy','Owner Conc'].map(h=><div key={h} style={{fontSize:8,color:S.t3,fontWeight:700}}>{h}</div>)}
      </div>
      {shown.map(tk=><div key={tk.sym} style={{display:'grid',gridTemplateColumns:'1fr 0.8fr 0.6fr 0.8fr 0.8fr 0.7fr 0.8fr',padding:'12px 16px',borderBottom:`1px solid ${S.b}20`,alignItems:'center'}}>
        <div style={{fontWeight:800,fontSize:13,color:S.t1}}>{tk.sym} <span style={{fontSize:9,color:S.t3,fontFamily:'monospace'}}>{tk.addr}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{height:6,width:`${Math.min(100,tk.score)}%`,maxWidth:60,background:TIERS[tk.tier][1],borderRadius:3}}/><span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:TIERS[tk.tier][1]}}>{tk.score}/100</span></div>
        <span style={{padding:'2px 8px',borderRadius:5,background:TIERS[tk.tier][1]+'15',color:TIERS[tk.tier][1],fontSize:9,fontWeight:800,border:`1px solid ${TIERS[tk.tier][1]}30`}}>{TIERS[tk.tier][0]}</span>
        <span style={{fontSize:11,fontWeight:700,color:tk.honeypot?S.r:S.g}}>{tk.honeypot?'⚠️ YES':'✅ No'}</span>
        <span style={{fontSize:11,color:tk.locked?S.g:S.r}}>{tk.locked?`✅ Until ${tk.lockExp}`:`❌ ${tk.lockExp}`}</span>
        <span style={{fontSize:11,color:tk.proxy?S.gold:S.g}}>{tk.proxy?'⚠️ Yes':'✅ No'}</span>
        <span style={{fontSize:11,fontFamily:'monospace',color:tk.ownerConc>50?S.r:tk.ownerConc>20?S.gold:S.g}}>{tk.ownerConc}%</span>
      </div>)}
    </div>
    <div style={{background:S.s1,border:`1px solid ${S.g}30`,borderRadius:13,padding:20}}>
      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:4}}>Swap Insurance — $0.05 per trade</div>
          <div style={{fontSize:11,color:S.t2,marginBottom:12}}>If a rug-pull or exploit drains a pool within 24h of your swap, file a claim and receive up to 100% of your swapped amount from the Insurance Fund.</div>
          {[['Coverage window','24h after swap'],['Max payout','100% of input amount'],['Premium','$0.05 USDC flat'],['Fund size','$4.8M USDC'],['Claims paid','124 · $280K total']].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${S.b}20`}}><span style={{fontSize:11,color:S.t3}}>{k}</span><span style={{fontSize:11,fontFamily:'monospace',color:S.t1,fontWeight:700}}>{v}</span></div>)}
        </div>
        <div style={{width:240,background:'#0A0C16',borderRadius:11,padding:16}}>
          <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:6}}>SWAP AMOUNT (USDC)</div>
          <input type="number" value={insuranceAmount} onChange={e=>setInsuranceAmount(Number(e.target.value))} style={{width:'100%',background:S.s2,border:`1px solid ${S.b}`,borderRadius:7,color:S.t1,fontSize:16,padding:'8px 10px',outline:'none',boxSizing:'border-box',marginBottom:12}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:11,color:S.t3}}>Premium</span><span style={{fontFamily:'monospace',fontWeight:700,color:S.gold}}>$0.05</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><span style={{fontSize:11,color:S.t3}}>Coverage</span><span style={{fontFamily:'monospace',fontWeight:700,color:S.g}}>${insuranceAmount.toLocaleString()}</span></div>
          <button style={{width:'100%',padding:11,borderRadius:9,border:'none',fontWeight:800,fontSize:12,background:S.g,color:'#000',cursor:'pointer'}}>Add Insurance (+$0.05)</button>
        </div>
      </div>
    </div>
  </div></AppLayout>;
}