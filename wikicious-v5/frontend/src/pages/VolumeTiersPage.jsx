import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const MOCK_TIERS = [
  {id:0,name:'Standard',minVolume:'0',          discountBps:0,  color:'#4A5270',users:'Most traders'},
  {id:1,name:'Advanced',minVolume:'100000000000', discountBps:10, color:'#5B7FFF',users:'Active traders'},
  {id:2,name:'Pro',     minVolume:'1000000000000',discountBps:20, color:'#00E5A0',users:'High frequency'},
  {id:3,name:'Elite',   minVolume:'10000000000000',discountBps:30,color:'#FFB800',users:'Institutional'},
  {id:4,name:'VIP',     minVolume:'50000000000000',discountBps:40,color:'#A855F7',users:'Market makers'},
];
const MOCK_USER = {tier:1,tierName:'Advanced',volume30d:'284000000000',discountBps:10,nextTierVolume:'1000000000000',volumeToNextTier:'716000000000'};

export default function VolumeTiersPage() {
  const { address } = useAccount();
  const [simVol, setSimVol] = useState(1);
  const { data:tiers=MOCK_TIERS } = useQuery({queryKey:['volume-tiers'],queryFn:()=>api('/api/volume-tiers/tiers'),placeholderData:MOCK_TIERS});
  const { data:user=null } = useQuery({queryKey:['volume-user',address],queryFn:()=>api(`/api/volume-tiers/user/${address}`),enabled:!!address});
  const u = user || MOCK_USER;
  const BASE_FEE = 0.0006;
  const disc = simVol >= 50 ? 0.40 : simVol >= 10 ? 0.30 : simVol >= 1 ? 0.20 : simVol >= 0.1 ? 0.10 : 0;
  const effFee = BASE_FEE * (1 - disc);
  const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270'};
  return (
    <AppLayout>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#FFB80020',border:'1px solid #FFB80040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📊</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Volume Fee Tiers</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>Trade more, pay less. 30-day rolling volume determines your fee tier. Resets never — tier follows volume.</p></div>
        </div>
        {address && (
          <div style={{background:'#5B7FFF0D',border:'1px solid #5B7FFF30',borderRadius:12,padding:'14px 20px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:900,fontSize:15,color:S.t1}}>Your Tier: <span style={{color:MOCK_TIERS[u.tier||0]?.color}}>⭐ {u.tierName}</span></div>
              <div style={{color:S.t3,fontSize:12,marginTop:3}}>30-day volume: ${(parseFloat(u.volume30d||0)/1e9).toFixed(2)}M</div>
            </div>
            {u.tier < 4 && <div style={{textAlign:'right'}}>
              <div style={{color:S.t3,fontSize:11}}>${(parseFloat(u.volumeToNextTier||0)/1e9).toFixed(2)}M more to next tier</div>
              <div style={{width:160,height:5,background:'#1C2138',borderRadius:3,marginTop:6,overflow:'hidden'}}>
                <div style={{height:'100%',background:'#5B7FFF',width:`${Math.min(100,(parseFloat(u.volume30d||0)/parseFloat(u.nextTierVolume||1)*100))}%`,borderRadius:3}}/>
              </div>
            </div>}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
          {tiers.map(t=>(
            <div key={t.id} style={{background:u.tier===t.id?`${t.color}0C`:S.bg,border:`1px solid ${u.tier===t.id?t.color:S.b}`,borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{color:t.color,fontWeight:900,fontSize:16,marginBottom:4}}>{t.name}</div>
              <div style={{color:S.t3,fontSize:10,marginBottom:12}}>${parseFloat(t.minVolume||0)/1e9>=1?(parseFloat(t.minVolume)/1e9).toFixed(0)+'M':parseFloat(t.minVolume||0)/1e6>=1?(parseFloat(t.minVolume)/1e6).toFixed(0)+'K':'<$100K'} / 30d</div>
              <div style={{color:t.discountBps>0?'#00E5A0':S.t3,fontWeight:900,fontSize:t.discountBps>0?22:16,fontFamily:'monospace'}}>
                {t.discountBps>0?`-${t.discountBps/100}%`:'No discount'}
              </div>
              <div style={{color:S.t3,fontSize:10,marginTop:4}}>Effective: {((0.0006*(1-t.discountBps/10000))*100).toFixed(4)}%</div>
            </div>
          ))}
        </div>
        <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
          <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:16}}>Fee Calculator</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>MONTHLY TRADING VOLUME</div>
            <div style={{fontSize:28,fontWeight:900,fontFamily:'monospace',color:S.t1,marginBottom:8}}>${simVol}M</div>
            <input type="range" min="0.01" max="100" step="0.01" value={simVol} onChange={e=>setSimVol(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#5B7FFF'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[
              {l:'Your Tier',    v:disc>=0.4?'VIP':disc>=0.3?'Elite':disc>=0.2?'Pro':disc>=0.1?'Advanced':'Standard',c:'#FFB800'},
              {l:'Discount',     v:`${(disc*100).toFixed(0)}%`,c:'#00E5A0'},
              {l:'Effective Fee',v:`${(effFee*100).toFixed(4)}%`,c:'#5B7FFF'},
              {l:'Monthly Savings vs Flat',v:`$${(simVol*1e6*disc*0.0006).toFixed(0)}`,c:'#00E5A0'},
            ].map(({l,v,c})=>(
              <div key={l} style={{background:'#0A0C16',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>{l.toUpperCase()}</div>
                <div style={{color:c,fontSize:16,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
