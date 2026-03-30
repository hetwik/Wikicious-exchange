import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const MOCK_MARKETS = [
  { id:0, question:'Will BTC exceed $100K before July 2025?', category:'PRICE', deadline:1751328000, resolutionTime:1751414400, yesPool:'284000000', noPool:'416000000', yesPct:41, noPct:59, outcome:'OPEN', claimOpen:false },
  { id:1, question:'Will ETH flip BTC market cap by 2026?', category:'MACRO', deadline:1767225600, resolutionTime:1767312000, yesPool:'128000000', noPool:'372000000', yesPct:26, noPct:74, outcome:'OPEN', claimOpen:false },
  { id:2, question:'Will Arbitrum TVL exceed $10B in 2025?', category:'PROTOCOL', deadline:1756598400, resolutionTime:1756684800, yesPool:'196000000', noPool:'104000000', yesPct:65, noPct:35, outcome:'OPEN', claimOpen:false },
  { id:3, question:'Will the Fed cut rates 3+ times in 2025?', category:'MACRO', deadline:1751328000, resolutionTime:1767225600, yesPool:'340000000', noPool:'260000000', yesPct:57, noPct:43, outcome:'OPEN', claimOpen:false },
  { id:4, question:'Will BTC ETF AUM hit $100B before EOY 2025?', category:'PRICE', deadline:1767139200, resolutionTime:1767225600, yesPool:'450000000', noPool:'150000000', yesPct:75, noPct:25, outcome:'OPEN', claimOpen:false },
];

const CATEGORY_COLOR = { PRICE:'#5B7FFF', PROTOCOL:'#00E5A0', MACRO:'#FFB800', SPORTS:'#FF8C42', MISC:'#A855F7' };

function CountDown({ deadline }) {
  const diff = Math.max(0, deadline * 1000 - Date.now());
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  return <span style={{ color:'#FFB800', fontSize:10, fontFamily:'monospace' }}>{d}d {h}h left</span>;
}

function OddsBar({ yes, no }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:4 }}>
        <span style={{ color:'#00E5A0', fontWeight:700 }}>YES {yes}%</span>
        <span style={{ color:'#FF4060', fontWeight:700 }}>NO {no}%</span>
      </div>
      <div style={{ height:6, background:'#0A0C16', borderRadius:3, overflow:'hidden', display:'flex' }}>
        <div style={{ width:`${yes}%`, background:'#00E5A0', transition:'width .5s' }} />
        <div style={{ width:`${no}%`, background:'#FF4060', transition:'width .5s' }} />
      </div>
    </div>
  );
}

export default function PredictionMarketsPage() {
  const { address } = useAccount();
  const [sel, setSel] = useState(null);
  const [betYes, setBetYes] = useState(true);
  const [amount, setAmount] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');

  const { data: markets = MOCK_MARKETS } = useQuery({ queryKey:['prediction-markets'], queryFn:()=>api('/api/predictions/markets'), placeholderData:MOCK_MARKETS });
  const { data: stats } = useQuery({ queryKey:['prediction-stats'], queryFn:()=>api('/api/predictions/stats') });

  const filtered = catFilter === 'ALL' ? markets : markets.filter(m => m.category === catFilter);
  const active = sel ?? markets[0];

  const totalPool = active ? (parseFloat(active.yesPool||0) + parseFloat(active.noPool||0)) / 1e6 : 0;
  const userPayout = amount && totalPool > 0 ? (parseFloat(amount) / (betYes ? parseFloat(active.yesPool||0)/1e6 : parseFloat(active.noPool||0)/1e6) * totalPool * 0.985).toFixed(2) : '0';

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔮</div>
            <div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#EDF0FA' }}>Prediction Markets</h1>
              <p style={{ margin:0, color:'#4A5270', fontSize:13 }}>Bet YES or NO on crypto events. 1.5% fee on winnings.</p>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            {l:'Total Volume',v:stats?`$${(parseFloat(stats.volume||0)/1e9).toFixed(1)}M`:'$2.4M',c:'#5B7FFF'},
            {l:'Protocol Fees',v:stats?`$${(parseFloat(stats.fees||0)/1e6).toFixed(0)}K`:'$36K',c:'#00E5A0'},
            {l:'Open Markets',v:markets.filter(m=>m.outcome==='OPEN').length,c:'#FFB800'},
            {l:'Resolved',v:markets.filter(m=>m.outcome!=='OPEN').length,c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:'#0E1120',border:'1px solid #1C2138',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:'#4A5270',fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:20,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display:'flex', gap:6, marginBottom:18 }}>
          {['ALL','PRICE','PROTOCOL','MACRO','SPORTS'].map(c => (
            <button key={c} onClick={()=>setCatFilter(c)}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid', fontSize:11, fontWeight:700, cursor:'pointer',
                borderColor:catFilter===c?CATEGORY_COLOR[c]||'#5B7FFF':'#1C2138',
                background:catFilter===c?`${CATEGORY_COLOR[c]||'#5B7FFF'}15`:'transparent',
                color:catFilter===c?CATEGORY_COLOR[c]||'#5B7FFF':'#4A5270' }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
          {/* Market list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(m => (
              <div key={m.id} onClick={()=>setSel(m)}
                style={{ background:sel?.id===m.id?'#5B7FFF0C':'#0E1120', border:`1px solid ${sel?.id===m.id?'#5B7FFF':'#1C2138'}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all .15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ background:`${CATEGORY_COLOR[m.category]||'#5B7FFF'}18`, color:CATEGORY_COLOR[m.category]||'#5B7FFF', border:`1px solid ${CATEGORY_COLOR[m.category]||'#5B7FFF'}30`, borderRadius:4, fontSize:9, fontWeight:800, padding:'2px 8px' }}>{m.category}</span>
                  <CountDown deadline={m.deadline} />
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:'#EDF0FA', marginBottom:14, lineHeight:1.5 }}>{m.question}</div>
                <OddsBar yes={m.yesPct} no={m.noPct} />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
                  <span style={{ color:'#4A5270', fontSize:10 }}>Total pool: ${((parseFloat(m.yesPool||0)+parseFloat(m.noPool||0))/1e6).toFixed(0)}K</span>
                  <span style={{ background:'#00E5A010', color:'#00E5A0', border:'1px solid #00E5A030', borderRadius:4, fontSize:9, fontWeight:800, padding:'2px 8px' }}>OPEN</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bet panel */}
          {active && (
            <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20, position:'sticky', top:68, height:'fit-content' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#EDF0FA', lineHeight:1.5, marginBottom:16 }}>{active.question}</div>

              {/* YES/NO toggle */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
                <button onClick={()=>setBetYes(true)} style={{ padding:'12px 0', borderRadius:9, border:'none', cursor:'pointer', fontWeight:900, fontSize:13, background:betYes?'#00E5A0':'#0A0C16', color:betYes?'#000':'#4A5270', transition:'all .15s' }}>
                  YES {active.yesPct}%
                </button>
                <button onClick={()=>setBetYes(false)} style={{ padding:'12px 0', borderRadius:9, border:'none', cursor:'pointer', fontWeight:900, fontSize:13, background:!betYes?'#FF4060':'#0A0C16', color:!betYes?'#fff':'#4A5270', transition:'all .15s' }}>
                  NO {active.noPct}%
                </button>
              </div>

              <div style={{ fontSize:9, color:'#4A5270', marginBottom:5, fontWeight:700 }}>YOUR BET (USDC)</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"
                style={{ width:'100%', background:'#0A0C16', border:'1px solid #1C2138', borderRadius:9, color:'#EDF0FA', fontSize:18, fontWeight:700, fontFamily:'monospace', padding:'12px 14px', outline:'none', boxSizing:'border-box', marginBottom:12 }} />

              {amount && parseFloat(amount) > 0 && (
                <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginBottom:12, border:'1px solid #1C2138' }}>
                  {[
                    ['Potential payout', `$${userPayout}`],
                    ['Protocol fee', '1.5% of winnings'],
                    ['Implied odds', `${betYes ? active.yesPct : active.noPct}%`],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                      <span style={{color:'#4A5270',fontSize:11}}>{k}</span>
                      <span style={{color:'#EDF0FA',fontSize:11,fontFamily:'monospace',fontWeight:600}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <button style={{ width:'100%', padding:13, borderRadius:10, border:'none', cursor:address?'pointer':'not-allowed', fontWeight:900, fontSize:13,
                background:address?(betYes?'#00E5A0':'#FF4060'):'#1C2138', color:address?(betYes?'#000':'#fff'):'#4A5270' }}>
                {address ? `BET ${betYes?'YES':'NO'}${amount?' — $'+amount:''}` : 'CONNECT WALLET'}
              </button>

              <div style={{ marginTop:14, padding:10, background:'#FFB80010', border:'1px solid #FFB80030', borderRadius:7 }}>
                <div style={{ color:'#FFB800', fontSize:10, fontWeight:700, marginBottom:3 }}>⏰ Resolution</div>
                <div style={{ color:'#4A5270', fontSize:10 }}>{new Date(active.resolutionTime*1000).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
