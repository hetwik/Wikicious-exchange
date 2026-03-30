import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const TARGETS=[{label:'ETH/USDC LP',icon:'🔵',apy:'12.4%',tvl:'$8.2M',steps:['Wrap ETH','Swap half to USDC','Add to WikiSpot pool 0']},{label:'WIK/USDC LP',icon:'💎',apy:'28.4%',tvl:'$2.1M',steps:['Swap to USDC half','Swap to WIK half','Add to WikiSpot pool 3']},{label:'ETH/USDC Vault (autocompound)',icon:'⚡',apy:'18.2%',tvl:'$4.8M',steps:['Split ETH→USDC','Add LP position','Deposit to strategy vault']},{label:'BTC/USDC LP',icon:'₿',apy:'9.8%',tvl:'$12.4M',steps:['Swap ETH→WBTC','Swap ETH→USDC','Add liquidity']}];
export default function ZapPage(){
  const [tokenIn,setTokenIn]=useState('ETH');
  const [amount,setAmount]=useState(1);
  const [target,setTarget]=useState(0);
  const t=TARGETS[target];
  const fee=(amount*0.0009).toFixed(4);
  const receiveLP=(amount*0.9991*1800).toFixed(2);
  return <AppLayout><div style={{maxWidth:900,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#00E5A0,#5B7FFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>⚡</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Zap</h1><div style={{fontSize:11,color:S.t3}}>One token → complex LP position in a single click · 0.09% fee</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start'}}>
      <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:20}}>
        <div style={{marginBottom:14}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>FROM TOKEN</div>
          <div style={{display:'flex',gap:6}}>
            {['ETH','USDC','WIK','ARB'].map(t=><button key={t} onClick={()=>setTokenIn(t)} style={{flex:1,padding:'8px 0',borderRadius:7,border:`1px solid ${tokenIn===t?S.a:S.b}`,background:tokenIn===t?`${S.a}15`:'transparent',color:tokenIn===t?S.a:S.t3,fontWeight:700,fontSize:10,cursor:'pointer'}}>{t}</button>)}
          </div>
        </div>
        <div style={{marginBottom:14}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>AMOUNT</div><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:18,fontFamily:'monospace',fontWeight:900,padding:'10px 12px',outline:'none',boxSizing:'border-box'}}/></div>
        <div style={{marginBottom:18}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:8}}>ZAP INTO</div>
          {TARGETS.map((tgt,i)=><div key={tgt.label} onClick={()=>setTarget(i)} style={{display:'flex',justifyContent:'space-between',padding:'9px 10px',borderRadius:8,border:`1px solid ${target===i?S.g:S.b}`,background:target===i?`${S.g}10`:'transparent',cursor:'pointer',marginBottom:4,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:16}}>{tgt.icon}</span><div><div style={{fontWeight:700,fontSize:11,color:S.t1}}>{tgt.label}</div><div style={{fontSize:9,color:S.t3}}>APY: <span style={{color:S.g,fontWeight:700}}>{tgt.apy}</span></div></div></div>
            {target===i&&<span style={{fontSize:10,color:S.g}}>✓</span>}
          </div>)}
        </div>
        <div style={{background:'#0A0C16',borderRadius:8,padding:'10px 12px',marginBottom:14}}>
          {[['Zap Fee (0.09%)',`${fee} ${tokenIn}`],['You Receive',`~${receiveLP} LP tokens`],['Pool APY',t.apy],['Pool TVL',t.tvl]].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span style={{fontSize:10,color:S.t3}}>{k}</span><span style={{fontSize:10,fontFamily:'monospace',fontWeight:700,color:S.t1}}>{v}</span></div>)}
        </div>
        <button style={{width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:`linear-gradient(135deg,${S.g},${S.a})`,color:'#000',cursor:'pointer'}}>⚡ Zap {amount} {tokenIn} → {t.icon}</button>
      </div>
      <div>
        <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:20,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:12}}>What happens under the hood</div>
          {t.steps.map((step,i)=><div key={step} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:`1px solid ${S.b}20`}}>
            <div style={{width:24,height:24,borderRadius:6,background:`${S.a}18`,border:`1px solid ${S.a}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:S.a,flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:12,color:S.t2}}>{step}</div>
            <span style={{marginLeft:'auto',fontSize:10,color:S.g}}>atomic</span>
          </div>)}
          <div style={{marginTop:12,padding:'8px 10px',background:`${S.g}08`,borderRadius:7,fontSize:10,color:S.t3}}>All steps execute in a single transaction — if any step fails, the entire Zap reverts and you get your tokens back.</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[['Saved Gas','3 txs → 1',S.g],['Fee','0.09%',S.gold],['Slippage','≤0.5%',S.a]].map(([l,v,c])=><div key={l} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:9,padding:12,textAlign:'center'}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:16,fontWeight:900,color:c,marginTop:4}}>{v}</div></div>)}
        </div>
      </div>
    </div>
  </div></AppLayout>;
}