import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

const MOCK = [
  {id:0,name:'DeFi Index',   symbol:'WDEFI', lastPrice:'0',active:true,components:[{symbol:'UNIUSDT',weightBps:2500},{symbol:'AAVEUSDT',weightBps:2000},{symbol:'LINKUSDT',weightBps:2000},{symbol:'GMXUSDT',weightBps:1500},{symbol:'ARBUSDT',weightBps:2000}]},
  {id:1,name:'Layer 2 Index',symbol:'WL2',   lastPrice:'0',active:true,components:[{symbol:'ARBUSDT',weightBps:4000},{symbol:'OPUSDT',weightBps:3000},{symbol:'MATICUSDT',weightBps:3000}]},
  {id:2,name:'Top 5 Crypto', symbol:'WTOP5', lastPrice:'0',active:true,components:[{symbol:'BTCUSDT',weightBps:4000},{symbol:'ETHUSDT',weightBps:3000},{symbol:'BNBUSDT',weightBps:1500},{symbol:'SOLUSDT',weightBps:1000},{symbol:'ARBUSDT',weightBps:500}]},
];
const PRICES = {BTCUSDT:67240,ETHUSDT:3480,ARBUSDT:1.18,OPUSDT:2.84,MATICUSDT:0.92,UNIUSDT:8.42,AAVEUSDT:98.4,LINKUSDT:14.2,GMXUSDT:28.6,BNBUSDT:412,SOLUSDT:148};

function computePrice(comps) {
  return comps.reduce((s,c)=>s+(PRICES[c.symbol]||0)*c.weightBps/10000,0);
}

export default function IndexPerpsPage() {
  const { address } = useAccount();
  const [sel, setSel] = useState(0);
  const [side, setSide] = useState(true);
  const [size, setSize] = useState('');
  const [lev, setLev] = useState(5);
  const { data:indices=MOCK } = useQuery({queryKey:['index-perps'],queryFn:()=>api('/api/index-perps/indices'),placeholderData:MOCK});
  const idx = indices[sel]||MOCK[0];
  const price = computePrice(idx.components||[]);

  return (
    <AppLayout>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#5B7FFF20',border:'1px solid #5B7FFF40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📦</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Index Perpetuals</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Trade diversified baskets with a single position. DeFi, Layer 2, and Top 5 crypto indices.</p></div>
        </div>
        <div style={{background:'#5B7FFF0D',border:'1px solid #5B7FFF30',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
          <span style={{color:S.t1,fontSize:12}}>📊 Index perps attract <strong style={{color:S.g}}>2–3× larger positions</strong> than single-asset perps — macro traders want basket exposure, not token picking. Same 0.06% fee, higher average position size = more revenue per market.</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:20}}>
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
              {indices.map((ix,i)=>(
                <div key={i} onClick={()=>setSel(i)} style={{background:sel===i?'#5B7FFF0C':S.bg,border:`1px solid ${sel===i?'#5B7FFF':S.b}`,borderRadius:13,padding:20,cursor:'pointer',transition:'all .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:16,color:S.t1}}>{ix.name}</div>
                      <div style={{color:S.t3,fontSize:11,fontFamily:'monospace'}}>{ix.symbol} · {ix.components?.length} components</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:S.a,fontSize:22,fontWeight:900,fontFamily:'monospace'}}>${computePrice(ix.components||[]).toFixed(2)}</div>
                      <div style={{color:S.t3,fontSize:10}}>index price</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {(ix.components||[]).map(c=>(
                      <div key={c.symbol} style={{background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:6,padding:'4px 10px',fontSize:10,color:S.t2,fontFamily:'monospace'}}>
                        {c.symbol.replace('USDT','')} <span style={{color:S.gold}}>{c.weightBps/100}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:13,padding:20}}>
              <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:12}}>Why Trade Index Perps?</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {icon:'🎯',t:'Macro exposure',d:'One position, diversified basket. No need to pick individual tokens.'},
                  {icon:'💱',t:'Lower correlation risk',d:'Index moves smoother than individual assets — less violent liquidation risk.'},
                  {icon:'📉',t:'Reduced manipulation',d:'Hard to manipulate a weighted basket. Fairer pricing for all traders.'},
                  {icon:'⚡',t:'Same fee structure',d:'0.06% taker, free maker — identical to single-asset markets.'},
                ].map(({icon,t,d})=>(
                  <div key={t} style={{background:'#0A0C16',borderRadius:9,padding:12}}>
                    <div style={{fontSize:18,marginBottom:5}}>{icon}</div>
                    <div style={{color:S.t1,fontWeight:700,fontSize:12,marginBottom:3}}>{t}</div>
                    <div style={{color:S.t3,fontSize:11,lineHeight:1.5}}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:20,position:'sticky',top:68,height:'fit-content'}}>
            <div style={{fontWeight:900,fontSize:15,color:S.t1,marginBottom:3}}>{idx.name}</div>
            <div style={{color:S.a,fontWeight:900,fontSize:22,fontFamily:'monospace',marginBottom:14}}>${price.toFixed(2)}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:14}}>
              <button onClick={()=>setSide(true)} style={{padding:12,borderRadius:8,border:'none',cursor:'pointer',fontWeight:900,fontSize:13,background:side?'#00E5A0':'#0A0C16',color:side?'#000':S.t3}}>LONG ↑</button>
              <button onClick={()=>setSide(false)} style={{padding:12,borderRadius:8,border:'none',cursor:'pointer',fontWeight:900,fontSize:13,background:!side?'#FF4060':'#0A0C16',color:!side?'#fff':S.t3}}>SHORT ↓</button>
            </div>
            <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>SIZE (USDC)</div>
            <input value={size} onChange={e=>setSize(e.target.value)} type="number" placeholder="0.00"
              style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:15,fontFamily:'monospace',padding:'9px 12px',outline:'none',boxSizing:'border-box',marginBottom:12}}/>
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:S.t3,marginBottom:4}}><span>Leverage</span><span style={{color:S.a,fontWeight:700}}>{lev}×</span></div>
              <input type="range" min="1" max="50" value={lev} onChange={e=>setLev(Number(e.target.value))} style={{width:'100%',accentColor:'#5B7FFF'}}/>
            </div>
            {size && <div style={{background:'#0A0C16',borderRadius:8,padding:10,marginBottom:12}}>
              {[['Position size',`$${(parseFloat(size||0)*lev).toLocaleString()}`],['Fee (0.06%)',`$${(parseFloat(size||0)*lev*0.0006).toFixed(2)}`]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                  <span style={{color:S.t3,fontSize:11}}>{k}</span><span style={{color:S.t1,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>}
            <button style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?side?'#00E5A0':'#FF4060':'#1C2138',color:address?side?'#000':'#fff':S.t3}}>
              {address?`${side?'LONG':'SHORT'} ${idx.symbol}`:'CONNECT WALLET'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
