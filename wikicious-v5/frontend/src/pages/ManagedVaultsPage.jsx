import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
const VAULTS=[{name:'ETH/USDC Auto-Range',sym:'ETH/USDC',range:'$3,200–$3,800',inRange:true,apy:'14.8%',tvl:'$8.4M',mgmtFee:'2%',perfFee:'10%',lastRebal:'2h ago',rebalCount:142},{name:'BTC/USDC Auto-Range',sym:'BTC/USDC',range:'$62,000–$72,000',inRange:true,apy:'9.2%',tvl:'$12.8M',mgmtFee:'2%',perfFee:'10%',lastRebal:'4h ago',rebalCount:84},{name:'WIK/USDC Auto-Range',sym:'WIK/USDC',range:'$0.24–$0.34',inRange:false,apy:'28.4%',tvl:'$1.2M',mgmtFee:'2%',perfFee:'10%',lastRebal:'1h ago',rebalCount:218},{name:'ARB/USDC Auto-Range',sym:'ARB/USDC',range:'$1.05–$1.35',inRange:true,apy:'18.2%',tvl:'$3.2M',mgmtFee:'2%',perfFee:'10%',lastRebal:'30m ago',rebalCount:96}];
export default function ManagedVaultsPage(){
  const [selected,setSelected]=useState(null);
  const [depositA,setDepositA]=useState(1);
  const [depositB,setDepositB]=useState(3482);
  return <AppLayout><div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#00D4FF,#5B7FFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🤖</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Managed Liquidity Vaults</h1><div style={{fontSize:11,color:S.t3}}>AI auto-rebalancing concentrated liquidity · 2% mgmt fee · 10% performance fee · set it and forget it</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16}}>
      {VAULTS.map((v,i)=><div key={v.name} onClick={()=>setSelected(i===selected?null:i)} style={{background:selected===i?`${S.a}08`:S.s1,border:`2px solid ${selected===i?S.a:v.inRange?S.b:S.r+'60'}`,borderRadius:13,padding:18,cursor:'pointer'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div><div style={{fontWeight:900,fontSize:14,color:S.t1}}>{v.name}</div><div style={{fontSize:10,color:S.t3}}>Range: <span style={{fontFamily:'monospace',color:v.inRange?S.g:S.r}}>{v.range}</span></div></div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',color:S.g}}>{v.apy}</div>
            <div style={{fontSize:9,color:v.inRange?S.g:S.r,fontWeight:700}}>{v.inRange?'✅ In Range':'⚠️ Rebalancing'}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
          {[['TVL',v.tvl,S.a],['Mgmt',v.mgmtFee,S.t1],['Perf',v.perfFee,S.t1],['Rebal #',v.rebalCount,S.gold]].map(([l,val,c])=><div key={l}><div style={{fontSize:7,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:11,fontWeight:700,fontFamily:'monospace',color:c}}>{val}</div></div>)}
        </div>
        {selected===i&&<div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${S.b}`}}>
          <div style={{fontWeight:700,fontSize:12,color:S.t1,marginBottom:10}}>Deposit to Vault</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div><div style={{fontSize:8,color:S.t3,fontWeight:700,marginBottom:4}}>ETH AMOUNT</div><input type="number" value={depositA} onChange={e=>setDepositA(Number(e.target.value))} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:7,color:S.t1,fontSize:13,padding:'8px',outline:'none',boxSizing:'border-box'}}/></div>
            <div><div style={{fontSize:8,color:S.t3,fontWeight:700,marginBottom:4}}>USDC AMOUNT</div><input type="number" value={depositB} onChange={e=>setDepositB(Number(e.target.value))} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:7,color:S.t1,fontSize:13,padding:'8px',outline:'none',boxSizing:'border-box'}}/></div>
          </div>
          <button onClick={e=>{e.stopPropagation()}} style={{width:'100%',padding:10,borderRadius:8,border:'none',fontWeight:800,fontSize:12,background:S.a,color:'#fff',cursor:'pointer'}}>Deposit → Receive MLV Shares</button>
        </div>}
      </div>)}
    </div>
    <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:20}}>
      <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:10}}>Fee Structure</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[['Management Fee','2% per year','Accrued per-block on total AUM'],['Performance Fee','10% of yield','Taken on trading fees earned by vault'],['Rebalance Fee','0.05%','Charged each time vault moves range']].map(([name,pct,desc])=><div key={name} style={{background:'#0A0C16',borderRadius:9,padding:14}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:4}}>{name.toUpperCase()}</div><div style={{fontSize:20,fontWeight:900,color:S.gold}}>{pct}</div><div style={{fontSize:10,color:S.t3,marginTop:4}}>{desc}</div></div>)}
      </div>
    </div>
  </div></AppLayout>;
}