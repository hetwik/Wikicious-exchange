import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

const MOCK = {lpHeld:'28400000000000000000000',usdcDeployed:'2840000000',wikDeployed:'14200000000000000000000000',feesEarned:'284000000',pendingFunding:'28400000',currentUSDCValue:'3124000000',currentWIKValue:'15820000000000000000000000'};

export default function POLPage() {
  const { data:s=MOCK } = useQuery({queryKey:['pol'],queryFn:()=>api('/api/pol/stats'),placeholderData:MOCK});
  const usdcVal = parseFloat(s.currentUSDCValue||0)/1e6;
  const totalVal = usdcVal * 2; // rough: USDC + WIK
  const yield_pct = parseFloat(s.feesEarned||0) / Math.max(1,parseFloat(s.usdcDeployed||1)) * 100;
  return (
    <AppLayout>
      <div style={{maxWidth:1000,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#FFB80020',border:'1px solid #FFB80040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🏊</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Protocol-Owned Liquidity</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Treasury USDC permanently deployed as WIK/USDC LP. Protocol earns LP fees forever — no mercenary liquidity risk.</p></div>
        </div>
        <div style={{background:'#FFB8000D',border:'1px solid #FFB80030',borderRadius:10,padding:'12px 16px',marginBottom:20,display:'flex',gap:12}}>
          <span style={{fontSize:18}}>💡</span>
          <span style={{color:S.t1,fontSize:12,lineHeight:1.7}}>
            POL solves DeFi's biggest problem: external LPs leave when incentives dry up. Protocol-owned liquidity never leaves.
            Every swap on the WIK/USDC pair earns 0.3% that flows back to the protocol treasury — compounding forever.
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          {[
            {l:'LP Position Value', v:`$${totalVal.toFixed(2)}M`, c:S.a},
            {l:'USDC in Pool',      v:fmtM(s.currentUSDCValue),  c:S.g},
            {l:'LP Fees Earned',    v:fmtM(s.feesEarned),        c:S.gold},
            {l:'Pending Funding',   v:fmtM(s.pendingFunding),    c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:19,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
            <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:14}}>The POL Flywheel</div>
            {[
              {n:'1',t:'Fees fund POL',d:'10% of protocol fees deployed as WIK/USDC LP',c:S.a},
              {n:'2',t:'LP earns swap fees',d:'Every WIK trade generates 0.3% LP fee income',c:S.g},
              {n:'3',t:'Deeper liquidity',d:'More POL → tighter spreads → more WIK trading volume',c:S.gold},
              {n:'4',t:'WIK price stability',d:'Permanent liquidity prevents price manipulation',c:'#A855F7'},
              {n:'5',t:'Compounding POL',d:'LP fees re-deployed as more POL weekly',c:S.g},
            ].map(({n,t,d,c})=>(
              <div key={n} style={{display:'flex',gap:10,marginBottom:12}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:`${c}20`,border:`1px solid ${c}40`,display:'flex',alignItems:'center',justifyContent:'center',color:c,fontWeight:900,fontSize:10,flexShrink:0}}>{n}</div>
                <div><div style={{color:S.t1,fontWeight:700,fontSize:12}}>{t}</div><div style={{color:S.t3,fontSize:11}}>{d}</div></div>
              </div>
            ))}
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
            <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:14}}>Revenue Projections</div>
            {[
              ['$1M POL at $10M/mo volume','$360/month'],
              ['$5M POL at $50M/mo volume','$9,000/month'],
              ['$10M POL at $100M/mo volume','$36,000/month'],
              ['$50M POL at $500M/mo volume','$450,000/month'],
            ].map(([s,v])=>(
              <div key={s} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${S.b}40`}}>
                <span style={{color:S.t2,fontSize:11}}>{s}</span>
                <span style={{color:S.g,fontSize:12,fontFamily:'monospace',fontWeight:700}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:14,padding:10,background:'#00E5A010',border:'1px solid #00E5A030',borderRadius:7}}>
              <div style={{color:S.g,fontSize:11,lineHeight:1.7}}>✅ Earns even when protocol fees are low<br/>✅ LP position grows via compounding<br/>✅ Never susceptible to LP withdrawal</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
