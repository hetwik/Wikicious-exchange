import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useApi';
const S = { bg:'#030810', bg2:'#0B1525', bg3:'#091220', b1:'#0E1E35', t1:'#E8F4FF', t2:'#4E6E90', G:'#00F0A8', B:'#0075FF', A:'#FFB020', V:'#7C4FFF' };

export default function PropPoolYieldPage() {
  const { data: stats } = useQuery({ queryKey:['propPoolYield'], queryFn: () => api.get('/api/prop/pool/yield').then(r=>r.data), refetchInterval:30000 });
  const s = stats || { totalDeployed:0, deployedToAave:0, deployedToLending:0, estimatedAPY:0, totalYieldGenerated:0, propPoolTVL:0, idleCapacity:0, utilizationPct:0 };

  return (
    <div style={{ padding:16, background:S.bg, minHeight:'100vh' }}>
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:900, color:S.G, marginBottom:4 }}>💰 Prop Pool Idle Yield</div>
      <div style={{ fontSize:12, color:S.t2, marginBottom:14 }}>While traders are completing evaluations (90 days), idle prop pool capital earns yield automatically. Zero risk to funded accounts — always liquid.</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[['PROP POOL TVL',`$${(s.propPoolTVL/1e6).toFixed(2)}M`,S.A],
          ['DEPLOYED TO YIELD',`$${(s.totalDeployed/1e6).toFixed(2)}M`,S.G],
          ['BLENDED APY',`${(s.estimatedAPY/100).toFixed(1)}%`,S.G],
          ['YIELD GENERATED',`$${(s.totalYieldGenerated/1e6).toFixed(2)}M`,S.V]
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:S.bg2, border:`1px solid ${S.b1}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:8, color:S.t2, fontWeight:700, marginBottom:4 }}>{l}</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:18, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:S.bg2, border:`1px solid ${S.b1}`, borderRadius:14, padding:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:S.t1, marginBottom:12 }}>Allocation Strategy</div>
          {[['Aave V3 (USDC)',s.deployedToAave,'40% of deployed','~6% APY · Instant withdrawal',S.V],
            ['WikiLending (USDC)',s.deployedToLending,'60% of deployed','~6.8% APY · Instant withdrawal',S.B],
          ].map(([n,amt,pct,desc,c])=>(
            <div key={n} style={{ marginBottom:10, padding:12, background:S.bg3, borderRadius:11, border:`1px solid ${c}20` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:c }}>{n}</div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, color:S.G }}>${(amt/1e6||0).toFixed(2)}M</div>
              </div>
              <div style={{ fontSize:10, color:S.t2 }}>{pct} · {desc}</div>
            </div>
          ))}
          <div style={{ padding:'10px 12px', background:`${S.G}08`, border:`1px solid ${S.G}20`, borderRadius:10, fontSize:11, color:S.t2, lineHeight:1.6 }}>
            🛡 Safety: Max 60% of pool deployed. 40% always instant-liquid for trader funding. Auto-recall if pool utilization exceeds 70%.
          </div>
        </div>

        <div style={{ background:S.bg2, border:`1px solid ${S.b1}`, borderRadius:14, padding:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:S.t1, marginBottom:12 }}>Revenue Flow</div>
          {[['Challenge fees','70% → pool directly','Every challenge sold',S.A],
            ['Idle yield (Aave + Lending)','Auto-harvested → pool','Every 24 hours',S.G],
            ['Funded trader profit split','10-20% → pool','After each profitable trade',S.B],
            ['Failed challenge fees','100% → pool','When trader fails eval',S.V],
          ].map(([src,dest,freq,c])=>(
            <div key={src} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:`1px solid ${S.b1}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:S.t1 }}>{src}</div>
                <div style={{ fontSize:10, color:c }}>{dest}</div>
                <div style={{ fontSize:9, color:S.t2 }}>{freq}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, padding:'10px 12px', background:S.bg3, borderRadius:10, fontSize:11, color:S.t2 }}>
            💡 All yield flows to WikiPropPool → distributed to pool LPs proportional to WPL shares.
          </div>
        </div>
      </div>
    </div>
  );
}
