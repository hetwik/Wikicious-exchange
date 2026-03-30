import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

const MOCK_POOLS=[
  {id:0,name:'Ondo OUSG',   symbol:'wOUSG',  totalDeposited:'12400000000',sharePrice:'1042000000000000000',totalFees:'62000000',lastHarvest:1711000000,active:true,projectedAPY:400,color:'#5B7FFF',icon:'🏛️',desc:'Tokenised US Government Bond Fund via Ondo Finance. Backed by short-duration T-bills.'},
  {id:1,name:'OpenEden T-Bill',symbol:'wTBILL',totalDeposited:'8200000000',sharePrice:'1038000000000000000',totalFees:'41000000',lastHarvest:1711000000,active:true,projectedAPY:420,color:'#00E5A0',icon:'💵',desc:'Fully reserved T-bill token by OpenEden. Monthly audit, Arbitrum native.'},
];
const MOCK_STATS={tvl:'20600000000',protocolRevenue:'103000000',pools:2};

export default function RWAMarketPage() {
  const { address } = useAccount();
  const [sel, setSel] = useState(0);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('deposit');
  const { data:pools=MOCK_POOLS } = useQuery({queryKey:['rwa-pools'],queryFn:()=>api('/api/rwa/pools'),placeholderData:MOCK_POOLS});
  const { data:stats=MOCK_STATS } = useQuery({queryKey:['rwa-stats'],queryFn:()=>api('/api/rwa/stats'),placeholderData:MOCK_STATS});
  const p = pools[sel]||MOCK_POOLS[0];
  const sp = (parseFloat(p.sharePrice||0)/1e18).toFixed(4);
  const depositorAPY = (p.projectedAPY||400)/100;
  const protocolAPY = depositorAPY * 0.25; // rough: protocol keeps 1% of 5% total yield
  const income1M = 500000 * protocolAPY / 100;

  return (
    <AppLayout>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#5B7FFF20',border:'1px solid #5B7FFF40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🏦</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>RWA Yield Markets</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Earn T-bill yield on-chain. ~5% APY from US Treasuries. Protocol earns 1% management spread.</p></div>
        </div>
        <div style={{background:'#5B7FFF0D',border:'1px solid #5B7FFF30',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
          <span style={{color:S.t1,fontSize:12,lineHeight:1.7}}>
            🏦 <strong style={{color:S.a}}>How it works:</strong> You deposit USDC → protocol wraps into tokenised T-bills (OUSG/TBILL) → earns ~5% from TradFi → 
            passes <strong style={{color:S.g}}>4% to depositors</strong> + keeps <strong style={{color:S.gold}}>1% as protocol revenue</strong>. 
            At $50M TVL: <strong style={{color:S.g}}>$500K/year</strong> near-zero risk income.
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
          {[
            {l:'Total TVL',         v:`$${(parseFloat(stats.tvl||0)/1e9).toFixed(1)}M`, c:S.a},
            {l:'Protocol Revenue',  v:`$${(parseFloat(stats.protocolRevenue||0)/1e9).toFixed(1)}K`, c:S.g},
            {l:'Depositor APY',     v:`~${depositorAPY.toFixed(1)}%`,  c:S.gold},
            {l:'Protocol Spread',   v:'~1% of yield',                   c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:19,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:20}}>
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
              {pools.map((pool,i)=>(
                <div key={i} onClick={()=>setSel(i)} style={{background:sel===i?`${pool.color}0C`:S.bg,border:`1px solid ${sel===i?pool.color:S.b}`,borderRadius:13,padding:20,cursor:'pointer',transition:'all .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${pool.color}18`,border:`1px solid ${pool.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{pool.icon}</div>
                      <div>
                        <div style={{fontWeight:900,fontSize:15,color:S.t1}}>{pool.name}</div>
                        <div style={{color:S.t3,fontSize:11}}>{pool.symbol} · Real World Asset</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:S.g,fontWeight:900,fontSize:20,fontFamily:'monospace'}}>{(pool.projectedAPY||400)/100}% APY</div>
                      <div style={{color:S.t3,fontSize:10}}>to depositors</div>
                    </div>
                  </div>
                  <div style={{color:S.t3,fontSize:12,lineHeight:1.6,marginBottom:12}}>{pool.desc}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    {[['TVL',`$${(parseFloat(pool.totalDeposited||0)/1e9).toFixed(1)}M`],['Share Price',(parseFloat(pool.sharePrice||0)/1e18).toFixed(4)],['Fees Earned',`$${(parseFloat(pool.totalFees||0)/1e9).toFixed(1)}K`]].map(([k,v])=>(
                      <div key={k} style={{background:'#0A0C16',borderRadius:7,padding:'8px 10px'}}>
                        <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:2}}>{k.toUpperCase()}</div>
                        <div style={{color:S.t1,fontSize:12,fontWeight:700,fontFamily:'monospace'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:13,padding:20}}>
              <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:12}}>Protocol Revenue Projections</div>
              {[['$10M TVL at 1% spread','$100K/year',S.t2],['$25M TVL at 1% spread','$250K/year',S.gold],['$50M TVL at 1% spread','$500K/year',S.g],['$100M TVL at 1% spread','$1M/year',S.a]].map(([s,v,c])=>(
                <div key={s} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${S.b}40`}}>
                  <span style={{color:S.t2,fontSize:12}}>{s}</span>
                  <span style={{color:c,fontSize:12,fontFamily:'monospace',fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:20,position:'sticky',top:68,height:'fit-content'}}>
            <div style={{fontWeight:900,fontSize:15,color:S.t1,marginBottom:3}}>{p.name}</div>
            <div style={{color:S.g,fontWeight:700,fontSize:14,marginBottom:14}}>{(p.projectedAPY||400)/100}% APY · {p.symbol}</div>
            <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:9,marginBottom:14}}>
              {['deposit','redeem'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'7px 0',borderRadius:7,border:'none',cursor:'pointer',fontWeight:800,fontSize:11,background:mode===m?p.color:'transparent',color:mode===m?'#000':S.t3}}>
                  {m==='deposit'?'⬇ Deposit':'⬆ Redeem'}
                </button>
              ))}
            </div>
            <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>AMOUNT (USDC)</div>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="100.00"
              style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:16,fontFamily:'monospace',padding:'10px 12px',outline:'none',boxSizing:'border-box',marginBottom:12}}/>
            {amount && parseFloat(amount)>=100 && (
              <div style={{background:'#0A0C16',borderRadius:8,padding:10,marginBottom:12}}>
                {[['Shares received',(parseFloat(amount||0)/(parseFloat(p.sharePrice||0)/1e18)).toFixed(4)],['Annual yield',`$${(parseFloat(amount||0)*depositorAPY/100).toFixed(2)}`],['Min deposit','$100 USDC']].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                    <span style={{color:S.t3,fontSize:11}}>{k}</span><span style={{color:S.t1,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {[['Underlying','US Treasury Bills'],['Custodian','Ondo/OpenEden'],['Audit','Monthly'],['Redemption','T+1 business day'],['Management fee','0.5%/year']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${S.b}30`}}>
                <span style={{color:S.t3,fontSize:11}}>{k}</span><span style={{color:S.t1,fontSize:11,fontFamily:'monospace'}}>{v}</span>
              </div>
            ))}
            <button style={{width:'100%',marginTop:14,padding:13,borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?p.color:'#1C2138',color:address?'#000':S.t3}}>
              {address?(mode==='deposit'?`DEPOSIT — ${(p.projectedAPY||400)/100}% APY`:'REDEEM'):'CONNECT WALLET'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
