// StrategyVaultsPage.jsx
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const MOCK = [
  { id:0, name:'Yield Maximizer',  icon:'💰', risk:'Low',    target:'12–18% APY', color:'#00E5A0', strategy:'YIELD_MAXIMIZER',  totalAssets:'12400000000', sharePrice:'1124000000000000000', apy:'1520000000000000', fees:'124000000', description:'Routes USDC across WikiLending, Yield Slices, and LP positions. Auto-compounds every 6 hours.' },
  { id:1, name:'Delta Neutral',    icon:'⚖️', risk:'Low',    target:'8–12% APY',  color:'#5B7FFF', strategy:'DELTA_NEUTRAL',    totalAssets:'8200000000',  sharePrice:'1082000000000000000', apy:'1020000000000000', fees:'82000000',  description:'Holds equal long/short perp positions and earns the funding rate spread. Near-zero directional exposure.' },
  { id:2, name:'Momentum',         icon:'🚀', risk:'High',   target:'20–40% APY', color:'#FF8C42', strategy:'MOMENTUM',         totalAssets:'4800000000',  sharePrice:'1312000000000000000', apy:'3240000000000000', fees:'48000000',  description:'Trend-following strategy using WikiPerp positions. Higher risk, higher potential return.' },
  { id:3, name:'Market Making',    icon:'🏦', risk:'Medium', target:'10–15% APY', color:'#A855F7', strategy:'MARKET_MAKING',    totalAssets:'6100000000',  sharePrice:'1098000000000000000', apy:'1240000000000000', fees:'61000000',  description:'Provides liquidity to WikiOrderBook. Earns maker rebates with low directional risk.' },
];

const RISK_COLOR = { Low:'#00E5A0', Medium:'#FFB800', High:'#FF4060' };

export default function StrategyVaultsPage() {
  const { address } = useAccount();
  const [sel, setSel] = useState(0);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('deposit');

  const { data: vaults = MOCK } = useQuery({ queryKey:['strategy-vaults'], queryFn:()=>api('/api/strategy-vaults/vaults'), placeholderData:MOCK });
  const v = vaults[sel] || MOCK[0];
  const totalTVL = vaults.reduce((s,v)=>s+parseFloat(v.totalAssets||0)/1e9,0);

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏛️</div>
            <div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#EDF0FA' }}>Strategy Vaults</h1>
              <p style={{ margin:0, color:'#4A5270', fontSize:13 }}>Auto-compounding vaults. 0.5% management + 10% performance fee.</p>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            {l:'Total TVL',v:`$${totalTVL.toFixed(1)}M`,c:'#5B7FFF'},
            {l:'Vaults',v:vaults.length,c:'#00E5A0'},
            {l:'Protocol Revenue',v:vaults.reduce((s,v)=>s+(parseFloat(v.fees||0)/1e9),0).toFixed(2)+'M',c:'#FFB800'},
            {l:'Avg APY',v:((vaults.reduce((s,v)=>s+parseFloat(v.apy||0)/1e16,0)/vaults.length)||0).toFixed(1)+'%',c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:'#0E1120',border:'1px solid #1C2138',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:'#4A5270',fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:20,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
          {/* Vault grid */}
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {vaults.map((vault,i) => (
                <div key={i} onClick={()=>setSel(i)}
                  style={{ background:sel===i?`${vault.color}0C`:'#0E1120', border:`1px solid ${sel===i?vault.color:'#1C2138'}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all .15s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:22 }}>{vault.icon}</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:13, color:'#EDF0FA' }}>{vault.name}</div>
                        <span style={{ background:`${RISK_COLOR[vault.risk]}18`, color:RISK_COLOR[vault.risk], border:`1px solid ${RISK_COLOR[vault.risk]}30`, borderRadius:4, fontSize:9, fontWeight:800, padding:'1px 6px' }}>{vault.risk} Risk</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:'#00E5A0', fontWeight:900, fontSize:17 }}>{vault.target}</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                    {[
                      ['TVL', `$${(parseFloat(vault.totalAssets||0)/1e9).toFixed(1)}M`],
                      ['Share Price', `${(parseFloat(vault.sharePrice||0)/1e18).toFixed(4)}`],
                    ].map(([k,val])=>(
                      <div key={k} style={{background:'#0A0C16',borderRadius:6,padding:'7px 9px'}}>
                        <div style={{fontSize:9,color:'#4A5270',fontWeight:700,marginBottom:2}}>{k.toUpperCase()}</div>
                        <div style={{color:'#EDF0FA',fontWeight:700,fontSize:12,fontFamily:'monospace'}}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, color:'#4A5270', fontSize:11, lineHeight:1.5 }}>{vault.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20, position:'sticky', top:68, height:'fit-content' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <span style={{ fontSize:24 }}>{v.icon}</span>
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:'#EDF0FA' }}>{v.name}</div>
                <div style={{ fontSize:10, color:'#4A5270' }}>{v.target}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:9, marginBottom:14 }}>
              {['deposit','redeem'].map(m => (
                <button key={m} onClick={()=>setMode(m)}
                  style={{ flex:1, padding:'7px 0', borderRadius:7, border:'none', cursor:'pointer', fontWeight:800, fontSize:11, background:mode===m?v.color:'transparent', color:mode===m?m==='deposit'?'#000':'#fff':'#4A5270', transition:'all .15s' }}>
                  {m === 'deposit' ? '⬇ Deposit' : '⬆ Redeem'}
                </button>
              ))}
            </div>
            <div style={{ fontSize:9, color:'#4A5270', marginBottom:5, fontWeight:700 }}>AMOUNT (USDC)</div>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"
              style={{ width:'100%', background:'#0A0C16', border:'1px solid #1C2138', borderRadius:9, color:'#EDF0FA', fontSize:18, fontWeight:700, fontFamily:'monospace', padding:'12px 14px', outline:'none', boxSizing:'border-box', marginBottom:14 }} />
            {[
              ['Management Fee','0.5% / year'],
              ['Performance Fee','10% of profits'],
              ['Auto-compound','Every harvest'],
              ['Min deposit','$1 USDC'],
            ].map(([k,val])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #1C213840'}}>
                <span style={{color:'#4A5270',fontSize:11}}>{k}</span>
                <span style={{color:'#EDF0FA',fontSize:11,fontFamily:'monospace'}}>{val}</span>
              </div>
            ))}
            <button style={{ width:'100%', marginTop:14, padding:13, borderRadius:10, border:'none', background:address?v.color:'#1C2138', color:address?'#000':'#4A5270', fontWeight:900, fontSize:13, cursor:address?'pointer':'not-allowed' }}>
              {address ? (mode==='deposit'?'DEPOSIT':'REDEEM SHARES') : 'CONNECT WALLET'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
