// LiqInsurancePage.jsx
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const S = { bg:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800', red:'#FF4060' };
const MOCK_STATS = { totalPremiums:'48200000', totalClaims:'12400000', reserve:'84000000', revenue:'35800000', activePolicies:142, lossRatio:2571, reserveRatio:6800 };
const LEVELS = [
  { id:0, name:'Basic',    coverage:'10%', premiumBps:20, color:'#8892B0', desc:'10% of collateral returned if liquidated. Best for peace of mind.' },
  { id:1, name:'Standard', coverage:'25%', premiumBps:40, color:S.accent,  desc:'25% returned. Good balance of cost vs protection.' },
  { id:2, name:'Premium',  coverage:'50%', premiumBps:80, color:S.green,   desc:'50% of collateral protected. Maximum coverage.', recommended:true },
];

export default function LiqInsurancePage() {
  const { address } = useAccount();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [posSize, setPosSize] = useState('1000');
  const [collateral, setCollateral] = useState('100');

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['liq-ins-stats'], queryFn:()=>api('/api/liq-insurance/stats'), placeholderData:MOCK_STATS });

  const lvl = LEVELS[selectedLevel];
  const premium = parseFloat(posSize||0) * lvl.premiumBps / 10000;
  const coverage = parseFloat(collateral||0) * parseInt(lvl.coverage) / 100;
  const lossRatio = (stats.lossRatio||2571)/100;

  return (
    <AppLayout>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#5B7FFF20', border:'1px solid #5B7FFF40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🛡️</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Liquidation Insurance</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Pay a small premium. If you get liquidated, get up to 50% of collateral back. Protocol keeps premium on survival.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { l:'Total Premiums',     v:`$${(parseFloat(stats.totalPremiums||0)/1e6).toFixed(1)}K`, c:S.accent },
            { l:'Claims Paid',        v:`$${(parseFloat(stats.totalClaims||0)/1e6).toFixed(1)}K`,   c:S.red },
            { l:'Protocol Revenue',   v:`$${(parseFloat(stats.revenue||0)/1e6).toFixed(1)}K`,       c:S.green },
            { l:'Active Policies',    v:stats.activePolicies,                                        c:S.gold },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              {LEVELS.map(l => (
                <div key={l.id} onClick={()=>setSelectedLevel(l.id)}
                  style={{ background:selectedLevel===l.id?`${l.color}0C`:S.bg, border:`1px solid ${selectedLevel===l.id?l.color:S.border}`, borderRadius:12, padding:18, cursor:'pointer', transition:'all .15s', position:'relative' }}>
                  {l.recommended && <div style={{ position:'absolute', top:-10, right:16, background:l.color, color:'#000', borderRadius:20, padding:'2px 12px', fontSize:9, fontWeight:900 }}>BEST VALUE</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:4 }}>{l.name} Coverage</div>
                      <div style={{ color:S.t3, fontSize:12 }}>{l.desc}</div>
                    </div>
                    <div style={{ textAlign:'right', marginLeft:20 }}>
                      <div style={{ color:l.color, fontWeight:900, fontSize:22 }}>{l.coverage}</div>
                      <div style={{ color:S.t3, fontSize:10 }}>collateral back</div>
                      <div style={{ color:S.gold, fontWeight:700, fontSize:12, marginTop:4 }}>{l.premiumBps/100}% premium</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:12, padding:18 }}>
              <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Actuarial Stats</div>
              {[
                ['Loss Ratio', `${lossRatio.toFixed(1)}%`, lossRatio < 50 ? S.green : S.gold, 'Claims / Premiums'],
                ['Reserve Ratio', `${(stats.reserveRatio||6800)/100}%`, S.green, 'Reserve / Active Coverage'],
                ['Net Margin', `${(100-lossRatio).toFixed(1)}%`, S.accent, 'Protocol profit on premiums'],
              ].map(([l,v,c,sub]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #1C213430' }}>
                  <div>
                    <div style={{ color:S.t1, fontSize:12, fontWeight:600 }}>{l}</div>
                    <div style={{ color:S.t3, fontSize:10 }}>{sub}</div>
                  </div>
                  <div style={{ color:c, fontFamily:'monospace', fontWeight:700, fontSize:14 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Buy panel */}
          <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, padding:20, position:'sticky', top:68, height:'fit-content' }}>
            <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:14 }}>Buy {lvl.name} Cover</div>
            {[
              ['Position Size (USDC notional)', posSize, setPosSize],
              ['Your Collateral (USDC)', collateral, setCollateral],
            ].map(([l,v,set]) => (
              <div key={l} style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>{l.toUpperCase()}</div>
                <input value={v} onChange={e=>set(e.target.value)} type="number"
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.border}`, borderRadius:8, color:S.t1, fontSize:15, padding:'9px 12px', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }} />
              </div>
            ))}
            <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginBottom:14 }}>
              {[
                ['Premium (one-time)', `$${premium.toFixed(2)} USDC`],
                ['Max Payout', `$${coverage.toFixed(2)} USDC`],
                ['Coverage', lvl.coverage + ' of collateral'],
                ['Duration', '7 days'],
                ['ROI if liquidated', `${((coverage/Math.max(0.01,premium))*100).toFixed(0)}%`],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1C213430' }}>
                  <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                  <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ width:'100%', padding:13, borderRadius:10, border:'none', cursor:address?'pointer':'not-allowed', fontWeight:900, fontSize:13,
              background:address?lvl.color:'#1C2138', color:address?'#000':'#4A5270' }}>
              {address ? `Buy ${lvl.name} Cover — $${premium.toFixed(2)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
