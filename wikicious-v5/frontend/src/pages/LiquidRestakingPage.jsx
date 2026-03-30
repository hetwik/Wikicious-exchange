import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
export default function LiquidRestakingPage(){
  const [depositAmt,setDepositAmt]=useState(1);
  const [token,setToken]=useState('stETH');
  const wLRT=depositAmt*1.0042;
  return <AppLayout><div style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#A855F7,#5B7FFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🔄</div>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Liquid Restaking</h1><div style={{fontSize:11,color:S.t3}}>EigenLayer integration · Earn AVS rewards on top of staking yield · 10% restaking commission</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
      {[['Total Restaked','$48.2M',S.p],['Base APY','4.8% (stETH)',S.g],['EigenLayer APY','+2.4% bonus',S.gold],['Commission','10%',S.a]].map(([l,v,c])=><div key={l} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:11,padding:14}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:c,marginTop:4}}>{v}</div></div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16}}>
      <div>
        <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:20,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:12}}>How Restaking Works</div>
          {[['Deposit stETH/rETH/wstETH','Your liquid staking tokens are accepted. No ETH lockup.'],['Auto-staked on EigenLayer','Protocol delegates to EigenLayer AVS operators for maximum yield.'],['Receive wLRT tokens','1:1 backed liquid receipt. Use as collateral in WikiLending.'],['Earn combined yield','Base LST yield (4.8%) + EigenLayer AVS rewards (2.4%) + WikiFees.'],['10% commission to protocol','Your 90%, our 10%. Flows through WikiRevenueSplitter.']].map(([title,desc],i)=><div key={title} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
            <div style={{width:24,height:24,borderRadius:7,background:`${S.p}18`,border:`1px solid ${S.p}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:S.p,flexShrink:0}}>{i+1}</div>
            <div><div style={{fontWeight:700,fontSize:12,color:S.t1,marginBottom:2}}>{title}</div><div style={{fontSize:11,color:S.t3}}>{desc}</div></div>
          </div>)}
        </div>
        <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:20}}>
          <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:12}}>Your wLRT Position</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[['wLRT Balance','0.00',S.p],['Pending Rewards','0.00 ETH',S.g],['USD Value','$0.00',S.t1]].map(([l,v,c])=><div key={l} style={{background:'#0A0C16',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:8,color:S.t3,fontWeight:700}}>{l}</div><div style={{fontSize:16,fontWeight:900,fontFamily:'monospace',color:c,marginTop:3}}>{v}</div></div>)}
          </div>
        </div>
      </div>
      <div style={{background:S.s1,border:`2px solid ${S.p}40`,borderRadius:13,padding:20}}>
        <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:16}}>Deposit & Restake</div>
        <div style={{marginBottom:12}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:6}}>SELECT TOKEN</div>
          {['stETH','rETH','wstETH'].map(t=><button key={t} onClick={()=>setToken(t)} style={{marginRight:6,marginBottom:6,padding:'6px 12px',borderRadius:7,border:`1px solid ${token===t?S.p:S.b}`,background:token===t?`${S.p}15`:'transparent',color:token===t?S.p:S.t3,fontSize:11,fontWeight:700,cursor:'pointer'}}>{t}</button>)}
        </div>
        <div style={{marginBottom:12}}><div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>AMOUNT</div><input type="number" value={depositAmt} onChange={e=>setDepositAmt(Number(e.target.value))} style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:16,fontFamily:'monospace',fontWeight:900,padding:'10px 12px',outline:'none',boxSizing:'border-box'}}/></div>
        {[['You receive',`${wLRT.toFixed(4)} wLRT`],['Total APY',`${(4.8+2.4).toFixed(1)}%`],['Your cut','90% of rewards'],['Commission','10% to protocol']].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${S.b}20`}}><span style={{fontSize:10,color:S.t3}}>{k}</span><span style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:S.t1}}>{v}</span></div>)}
        <button style={{width:'100%',marginTop:14,padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:`linear-gradient(135deg,${S.p},${S.a})`,color:'#fff',cursor:'pointer'}}>Deposit {depositAmt} {token} → wLRT</button>
      </div>
    </div>
  </div></AppLayout>;
}