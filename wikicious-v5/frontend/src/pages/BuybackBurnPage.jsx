// BuybackBurnPage.jsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const MOCK = { totalUSDCSpent:'284000000', totalWIKBurned:'142000000000000000000000000', buybackCount:42, pendingUSDC:'28400000', canExecute:true, nextBuybackTime:0, paused:false };

export default function BuybackBurnPage() {
  const { data: stats = MOCK } = useQuery({ queryKey:['buyback-stats'], queryFn:()=>api('/api/buyback/stats'), placeholderData:MOCK });
  const wikBurnedM = parseFloat(stats.totalWIKBurned||0)/1e24;
  const S = { bg:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800', red:'#FF4060' };

  return (
    <AppLayout>
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#FF406020', border:'1px solid #FF406040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔥</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>WIK Buyback & Burn</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>20% of all protocol fees automatically buys WIK on Uniswap and burns it permanently.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { l:'Total USDC Spent',  v:fmtM(stats.totalUSDCSpent),    c:S.accent },
            { l:'WIK Burned',        v:`${wikBurnedM.toFixed(1)}M WIK`, c:S.red },
            { l:'Buyback Executions',v:stats.buybackCount,             c:S.gold },
            { l:'Pending USDC',      v:fmtM(stats.pendingUSDC),        c:S.green },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:7 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Flywheel diagram */}
        <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, padding:28, marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:20, textAlign:'center' }}>The Deflationary Flywheel</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, flexWrap:'wrap' }}>
            {[
              { icon:'💰', label:'Protocol Fees', sub:'20% allocated', color:S.accent },
              { sep:'→' },
              { icon:'🔄', label:'Buy WIK', sub:'Via Uniswap V3', color:S.gold },
              { sep:'→' },
              { icon:'🔥', label:'Burn WIK', sub:'Sent to 0xdead', color:S.red },
              { sep:'→' },
              { icon:'📈', label:'WIK Price Rises', sub:'Less supply', color:S.green },
              { sep:'→' },
              { icon:'⚡', label:'More Staking TVL', sub:'Higher staking APY', color:'#A855F7' },
              { sep:'→' },
              { icon:'🔁', label:'More Protocol Use', sub:'Flywheel compounds', color:S.accent },
            ].map((item, i) => 'sep' in item ? (
              <div key={i} style={{ color:S.t3, fontSize:18, padding:'0 8px' }}>{item.sep}</div>
            ) : (
              <div key={i} style={{ textAlign:'center', padding:'12px 16px' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:`${item.color}18`, border:`1px solid ${item.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 8px' }}>{item.icon}</div>
                <div style={{ color:item.color, fontWeight:700, fontSize:12 }}>{item.label}</div>
                <div style={{ color:S.t3, fontSize:10 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:14 }}>Buyback Status</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { l:'Status', v:stats.paused ? '⏸ Paused' : '✅ Active', c:stats.paused ? S.gold : S.green },
              { l:'Can Execute', v:stats.canExecute ? 'Yes' : 'Cooling down', c:stats.canExecute ? S.green : S.gold },
              { l:'Allocation', v:'20% of all fees', c:S.accent },
              { l:'Slippage Guard', v:'2% max', c:S.t1 },
              { l:'Max per Buyback', v:'$10,000 USDC', c:S.t1 },
              { l:'Cooldown', v:'6 hours', c:S.t1 },
            ].map(({ l,v,c }) => (
              <div key={l} style={{ background:'#0A0C16', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>{l.toUpperCase()}</div>
                <div style={{ color:c, fontSize:13, fontWeight:700, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
