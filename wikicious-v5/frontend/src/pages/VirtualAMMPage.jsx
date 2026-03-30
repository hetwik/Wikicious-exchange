import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const MARKETS=[['BTC/USDT','$67,284','+2.14%','$124M',true],['ETH/USDT','$3,482','+1.84%','$84M',true],['SOL/USDT','$148','+4.2%','$28M',true],['DOGE/USDT','$0.101','+8.4%','$14M',true],['PEPE/USDT','$0.0000037','+22%','$8M',true]];
export default function VirtualAMMPage(){
  const [side,setSide]=useState('long');
  const [lev,setLev]=useState(100);
  const [mkt,setMkt]=useState(0);
  const [col,setCol]=useState(500);
  const LEV_TIERS=[{max:100,color:S.g,label:'Standard'},{max:500,color:S.gold,label:'Expert — needs Gold Pass'},{max:1000,color:S.r,label:'Ultra — needs Diamond Pass'}];
  const tier=lev<=100?0:lev<=500?1:2;
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#FF4060,#A855F7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>⚡</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Virtual AMM — 1000× Leverage</h1><div style={{fontSize:11,color:S.t3}}>vAMM — no physical liquidity pool · oracle-anchored · insurance fund backed</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:12}}>
      <div>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          {MARKETS.map(([sym,price,ch,vol,up],i)=><div key={sym} onClick={()=>setMkt(i)} style={{padding:'8px 14px',borderRadius:9,border:`2px solid ${mkt===i?S.a:S.b}`,background:mkt===i?`${S.a}10`:S.s1,cursor:'pointer'}}>
            <div style={{fontWeight:800,fontSize:12,color:S.t1}}>{sym}</div>
            <div style={{fontFamily:'monospace',fontSize:11,color:up?S.g:S.r,fontWeight:700}}>{price} <span style={{fontSize:9}}>{ch}</span></div>
          </div>)}
        </div>
        <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:12}}>Leverage: <span style={{color:LEV_TIERS[tier].color,fontFamily:'monospace'}}>{lev}×</span> <span style={{fontSize:10,color:LEV_TIERS[tier].color,fontWeight:700}}>— {LEV_TIERS[tier].label}</span></div>
          <input type="range" min={1} max={1000} value={lev} onChange={e=>setLev(Number(e.target.value))} style={{width:'100%',accentColor:LEV_TIERS[tier].color}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:S.t3,marginTop:4}}><span>1×</span><span style={{color:S.g}}>100×</span><span style={{color:S.gold}}>500×</span><span style={{color:S.r}}>1000×</span></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[['Mark Price','$67,284',S.t1],['Insurance Fund','$2.4M',S.g],['OI Long','$84M',S.g],['OI Short','$62M',S.r]].map(([l,v,c])=><div key={l} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:9,padding:12}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:15,fontWeight:900,fontFamily:'monospace',color:c,marginTop:3}}>{v}</div></div>)}
        </div>
      </div>
      <div style={{background:S.s1,border:`2px solid ${LEV_TIERS[tier].color}40`,borderRadius:13,padding:18}}>
        <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:8,marginBottom:14}}>
          {['long','short'].map(s=><button key={s} onClick={()=>setSide(s)} style={{flex:1,padding:'8px 0',borderRadius:6,border:'none',fontWeight:800,fontSize:11,background:side===s?(s==='long'?S.g:S.r):'transparent',color:side===s?(s==='long'?'#000':'#fff'):S.t3,cursor:'pointer'}}>{s==='long'?'▲ Long':'▼ Short'}</button>)}
        </div>
        <div style={{marginBottom:12}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>COLLATERAL (USDC)</div><input type="number" value={col} onChange={e=>setCol(Number(e.target.value))} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:15,fontFamily:'monospace',padding:'10px 12px',outline:'none',boxSizing:'border-box'}}/></div>
        {[['Leverage',`${lev}×`],['Position Size',`$${(col*lev).toLocaleString()}`],['Entry Price','$67,284 (vAMM)'],['Liq. Price',`$${(side==='long'?67284*(1-1/lev):67284*(1+1/lev)).toFixed(0)}`],['Fee (0.06%)','$'+((col*lev)*0.0006).toFixed(2)],['Required','USDC collateral']].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${S.b}20`}}><span style={{fontSize:10,color:S.t3}}>{k}</span><span style={{fontSize:10,fontFamily:'monospace',fontWeight:700,color:S.t1}}>{v}</span></div>)}
        {lev>100&&<div style={{margin:'10px 0',padding:'8px 10px',background:`${LEV_TIERS[tier].color}10`,border:`1px solid ${LEV_TIERS[tier].color}30`,borderRadius:7,fontSize:9,color:LEV_TIERS[tier].color}}>⚠️ {LEV_TIERS[tier].label} required for {lev}× leverage</div>}
        <button style={{width:'100%',marginTop:12,padding:13,borderRadius:9,border:'none',fontWeight:900,fontSize:13,background:side==='long'?S.g:S.r,color:side==='long'?'#000':'#fff',cursor:'pointer'}}>{side==='long'?'▲ Open Long':'▼ Open Short'} {lev}×</button>
      </div>
    </div>
  </div></AppLayout>;
}