import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const MOCK = { liquidBalance:'1260000000', deployedValue:'2940000000', pendingYield:'8400000', totalYieldHarvested:'142000000', deployRatio:7000, currentAPY:'800000000000000' };

export default function InsuranceYieldPage() {
  const { data:s=MOCK } = useQuery({ queryKey:['insurance-yield'], queryFn:()=>api('/api/insurance-yield/stats'), placeholderData:MOCK });
  const S = { bg:'#0E1120', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060' };
  const apy = (parseFloat(s.currentAPY||0)/1e16).toFixed(2);
  const totalFund = parseFloat(s.liquidBalance||0)/1e6 + parseFloat(s.deployedValue||0)/1e6;
  const ratio = s.deployRatio ? s.deployRatio/100 : 70;
  return (
    <AppLayout>
      <div style={{maxWidth:1000,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#00E5A020',border:'1px solid #00E5A040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🏛️</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Insurance Fund Yield</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Deploy idle insurance USDC into WikiLending. Pure yield on capital that was earning 0%.</p></div>
        </div>
        <div style={{background:'#00E5A00D',border:'1px solid #00E5A030',borderRadius:12,padding:'14px 18px',marginBottom:22,display:'flex',gap:14}}>
          <span style={{fontSize:20}}>💡</span>
          <span style={{color:S.t1,fontSize:13,lineHeight:1.7}}>
            The insurance fund normally sits idle. By deploying 70% into WikiLending USDC market (capped at 30 days max), 
            the protocol earns ~{apy}% APY with <strong style={{color:S.g}}>zero additional risk</strong> — USDC is redeemable in under 1 block if needed for a liquidation shortfall.
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          {[
            {l:'Total Fund Size',    v:`$${totalFund.toFixed(2)}M`, c:S.a},
            {l:'Deployed (Earning)', v:fmtM(s.deployedValue),      c:S.g},
            {l:'Liquid Reserve',     v:fmtM(s.liquidBalance),       c:S.gold},
            {l:'Lifetime Yield',     v:fmtM(s.totalYieldHarvested), c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'15px 17px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:20,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
            <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:16}}>Deployment Ratio</div>
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{color:S.g,fontSize:12,fontWeight:700}}>Deployed ({ratio}%)</span>
                <span style={{color:S.gold,fontSize:12,fontWeight:700}}>Reserve ({(100-ratio).toFixed(0)}%)</span>
              </div>
              <div style={{height:12,background:'#0A0C16',borderRadius:6,overflow:'hidden',display:'flex'}}>
                <div style={{width:`${ratio}%`,background:'linear-gradient(90deg,#5B7FFF,#00E5A0)',borderRadius:'6px 0 0 6px',transition:'width .5s'}}/>
                <div style={{flex:1,background:'#FFB80040'}}/>
              </div>
            </div>
            {[
              ['Current APY',    `${apy}%`],
              ['Pending Yield',  fmtM(s.pendingYield)],
              ['Max Deploy',     '70% of fund'],
              ['Min Liquid',     '30% always available'],
              ['Redeem Time',    '< 1 block'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${S.b}40`}}>
                <span style={{color:S.t3,fontSize:12}}>{k}</span>
                <span style={{color:S.t1,fontSize:12,fontFamily:'monospace',fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
            <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:14}}>Projected Annual Revenue</div>
            {[
              ['$500K fund at 8%',  '$28,000/year',  S.t2],
              ['$1M fund at 8%',    '$56,000/year',  S.gold],
              ['$5M fund at 8%',    '$280,000/year', S.g],
              ['$10M fund at 8%',   '$560,000/year', S.a],
            ].map(([s,v,c])=>(
              <div key={s} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${S.b}40`}}>
                <span style={{color:S.t2,fontSize:12}}>{s}</span>
                <span style={{color:c,fontSize:13,fontFamily:'monospace',fontWeight:700}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:16,padding:12,background:'#5B7FFF0D',border:'1px solid #5B7FFF30',borderRadius:8}}>
              <div style={{color:S.a,fontSize:12,lineHeight:1.7}}>✅ Zero additional smart contract risk<br/>✅ USDC withdrawable instantly<br/>✅ Yield accrues to protocol treasury daily</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
