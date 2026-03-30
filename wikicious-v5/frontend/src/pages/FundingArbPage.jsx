import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

const MOCK = {totalAUM:'8400000000',sharePrice:'1042000000000000000',totalProtocolFees:'84000000',currentFundingRate:'4200000000000000',isLongFunding:false,currentMarket:'BTCUSDT',activeLeverage:'2',managementFeeBps:50,performanceFeeBps:1000};

export default function FundingArbPage() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('deposit');
  const { data:s=MOCK } = useQuery({queryKey:['funding-arb'],queryFn:()=>api('/api/funding-arb/stats'),placeholderData:MOCK});
  const { data:user } = useQuery({queryKey:['funding-arb-user',address],queryFn:()=>api(`/api/funding-arb/user/${address}`),enabled:!!address});
  const aum = parseFloat(s.totalAUM||0)/1e6;
  const sp = (parseFloat(s.sharePrice||0)/1e18).toFixed(4);
  const fr = (parseFloat(s.currentFundingRate||0)/1e16).toFixed(4);
  const projAnnual = parseFloat(fr) * 3 * 365;

  return (
    <AppLayout>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#A855F720',border:'1px solid #A855F740',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚖️</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Funding Rate Arb Vault</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Delta-neutral strategy collecting funding payments. 0.5% management + 10% performance fee.</p></div>
        </div>
        <div style={{background:'#A855F70D',border:'1px solid #A855F730',borderRadius:10,padding:'12px 16px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
          <span style={{fontSize:18}}>🎯</span>
          <span style={{color:S.t1,fontSize:12,lineHeight:1.7}}>
            <strong style={{color:'#A855F7'}}>Strategy:</strong> When funding is positive (longs pay shorts), vault holds SHORT perps + LONG spot (delta neutral).
            When funding is negative, flips sides. Net result: collects funding payments with near-zero directional risk.
            Historical avg: <strong style={{color:S.g}}>10–20% APY</strong> from funding alone.
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
          {[
            {l:'Total AUM',          v:`$${aum.toFixed(2)}M`, c:S.a},
            {l:'Share Price',         v:sp,                   c:S.g},
            {l:'Current Funding',     v:`${fr}% / 8h`,        c:parseFloat(fr)>0?S.g:S.r},
            {l:'Protocol Fees',       v:fmtM(s.totalProtocolFees), c:S.gold},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:19,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:18}}>
          <div>
            {[
              {l:'Active Market',    v:s.currentMarket||'BTCUSDT'},
              {l:'Position Side',    v:s.isLongFunding?'SHORT Perp + LONG Spot':'LONG Perp + SHORT Spot'},
              {l:'Leverage',         v:`${s.activeLeverage||2}×`},
              {l:'Proj. Annual Yield',v:`~${projAnnual.toFixed(1)}%`},
              {l:'Management Fee',   v:`${(s.managementFeeBps||50)/100}% / year`},
              {l:'Performance Fee',  v:`${(s.performanceFeeBps||1000)/100}% of profits`},
              {l:'Min Harvest Gap',  v:'4 hours'},
              {l:'Strategy Type',    v:'Delta-Neutral Funding Arb'},
            ].reduce((rows,[k,v],i)=>i%2===0?[...rows,[[k,v]]]:([...rows.slice(0,-1),[...rows[rows.length-1],[k,v]]]),[]).map((row,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                {row.map(([k,v])=>(
                  <div key={k} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:9,padding:'11px 14px'}}>
                    <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:4}}>{k.toUpperCase()}</div>
                    <div style={{color:S.t1,fontSize:13,fontWeight:700,fontFamily:'monospace'}}>{v}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:20,height:'fit-content',position:'sticky',top:68}}>
            <div style={{fontWeight:900,fontSize:15,color:S.t1,marginBottom:14}}>Funding Arb Vault</div>
            <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:9,marginBottom:14}}>
              {['deposit','redeem'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'7px 0',borderRadius:7,border:'none',cursor:'pointer',fontWeight:800,fontSize:11,background:mode===m?'#A855F7':'transparent',color:mode===m?'#fff':S.t3,transition:'all .15s'}}>
                  {m==='deposit'?'⬇ Deposit':'⬆ Redeem'}
                </button>
              ))}
            </div>
            <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>AMOUNT (USDC)</div>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00"
              style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:16,fontFamily:'monospace',padding:'10px 12px',outline:'none',boxSizing:'border-box',marginBottom:14}}/>
            {user && <div style={{background:'#0A0C16',borderRadius:8,padding:10,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                <span style={{color:S.t3,fontSize:11}}>Your position</span>
                <span style={{color:S.g,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{fmtM(user.value)}</span>
              </div>
            </div>}
            <button style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?'#A855F7':'#1C2138',color:'#fff'}}>
              {address?(mode==='deposit'?'DEPOSIT':'REDEEM SHARES'):'CONNECT WALLET'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
