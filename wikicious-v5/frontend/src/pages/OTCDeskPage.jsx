import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(0)}`; };
const S = { bg:'#0E1120', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060' };
const MOCK_STATS = { volume:'84200000000', fees:'84200000', quotes:284, revenue:'84200000', feeBps:10 };
const MOCK_QUOTES = [
  { id:283, trader:'0x7f3a…b2c4', amountIn:'500000000000', amountOut:'0', status:'PENDING',  filledAt:0 },
  { id:282, trader:'0x2b8c…d1e5', amountIn:'1200000000000',amountOut:'1198800000000', status:'FILLED', filledAt:1711000000 },
  { id:281, trader:'0x9d1e…4f7a', amountIn:'340000000000', amountOut:'339660000000', status:'FILLED', filledAt:1710990000 },
];

const TOKENS = [
  { sym:'USDC', addr:'0xaf88…831', decimals:6 },
  { sym:'WETH', addr:'0x82aF…ab1', decimals:18 },
  { sym:'WBTC', addr:'0x2f2a…f0f', decimals:8 },
  { sym:'ARB',  addr:'0x912C…548', decimals:18 },
];

export default function OTCDeskPage() {
  const { address } = useAccount();
  const [tokenIn,  setTokenIn]  = useState(0);
  const [tokenOut, setTokenOut] = useState(1);
  const [amount, setAmount]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['otc-stats'], queryFn:()=>api('/api/otc/stats'), placeholderData:MOCK_STATS });
  const { data: quotes = MOCK_QUOTES } = useQuery({ queryKey:['otc-quotes'], queryFn:()=>api('/api/otc/quotes'), placeholderData:MOCK_QUOTES });

  const fee = parseFloat(amount||0) * (stats.feeBps||10) / 10000;
  const receive = parseFloat(amount||0) - fee;

  return (
    <AppLayout>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#00E5A020', border:'1px solid #00E5A040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🤝</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>OTC Desk</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Large trades ($100K+) at guaranteed price. 0.1% fee. No market impact. Requires Gold or Diamond Trader Pass.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { l:'Total Volume',   v:fmtM(stats.volume),   c:S.a    },
            { l:'Fees Collected', v:fmtM(stats.fees),     c:S.g    },
            { l:'RFQ Count',      v:stats.quotes,         c:S.gold },
            { l:'Fee Rate',       v:`${(stats.feeBps||10)/100}%`, c:S.t2 },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* RFQ Form */}
          <div>
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:4 }}>Submit Request for Quote</div>
              <div style={{ color:S.t3, fontSize:12, marginBottom:20 }}>Our desk responds within 60 seconds with a firm price.</div>

              {/* Token pair */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'end', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>SELL TOKEN</div>
                  <select value={tokenIn} onChange={e => setTokenIn(Number(e.target.value))}
                    style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:13, padding:'9px 12px', outline:'none' }}>
                    {TOKENS.map((t,i) => <option key={i} value={i}>{t.sym}</option>)}
                  </select>
                </div>
                <div style={{ color:S.t3, fontSize:18, paddingBottom:10 }}>→</div>
                <div>
                  <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>BUY TOKEN</div>
                  <select value={tokenOut} onChange={e => setTokenOut(Number(e.target.value))}
                    style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:13, padding:'9px 12px', outline:'none' }}>
                    {TOKENS.map((t,i) => <option key={i} value={i}>{t.sym}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>AMOUNT ({TOKENS[tokenIn].sym})</div>
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="100000"
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:16, fontFamily:'monospace', padding:'10px 12px', outline:'none', boxSizing:'border-box' }} />
                {parseFloat(amount) > 0 && parseFloat(amount) < 100000 && (
                  <div style={{ color:S.r, fontSize:11, marginTop:4 }}>⚠️ Minimum $100,000 for OTC execution</div>
                )}
              </div>

              {/* Preview */}
              {parseFloat(amount) >= 100000 && (
                <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginBottom:14 }}>
                  {[
                    ['You send',    `${parseFloat(amount).toLocaleString()} ${TOKENS[tokenIn].sym}`],
                    ['OTC fee',     `$${fee.toFixed(2)} (${(stats.feeBps||10)/100}%)`],
                    ['You receive', `~${receive.toLocaleString()} ${TOKENS[tokenOut].sym}`],
                    ['Price certainty', '100% — no slippage'],
                    ['Settlement', '< 60 seconds'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}30` }}>
                      <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                      <span style={{ color: k==='You receive'||k==='Price certainty'?S.g:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {!submitted ? (
                <button onClick={() => address && parseFloat(amount) >= 100000 && setSubmitted(true)}
                  style={{ width:'100%', padding:13, borderRadius:10, border:'none', cursor:address&&parseFloat(amount)>=100000?'pointer':'not-allowed', fontWeight:900, fontSize:13,
                    background:address&&parseFloat(amount)>=100000?S.a:S.b, color:address&&parseFloat(amount)>=100000?'#fff':S.t3 }}>
                  {!address ? 'Connect Wallet' : parseFloat(amount) < 100000 ? 'Min $100,000 Required' : 'Submit RFQ →'}
                </button>
              ) : (
                <div style={{ background:'#00E5A010', border:'1px solid #00E5A030', borderRadius:8, padding:14, textAlign:'center' }}>
                  <div style={{ color:S.g, fontWeight:800, fontSize:14, marginBottom:4 }}>✅ RFQ Submitted!</div>
                  <div style={{ color:S.t2, fontSize:12 }}>Our desk will respond with a firm quote within 60 seconds.</div>
                </div>
              )}
            </div>

            {/* Why OTC */}
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:18, marginTop:14 }}>
              <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Why Use OTC?</div>
              {[
                { icon:'📊', title:'No Price Impact', desc:'Your $500K trade executes at the quoted price. The orderbook never sees it.' },
                { icon:'⚡', title:'60-Second Fill', desc:'Firm quote in seconds. Accept and settle immediately.' },
                { icon:'🔒', title:'Guaranteed Price', desc:'Quote is binding for 60 seconds. No last-look or re-quoting.' },
                { icon:'💰', title:'Lower Cost on Large Trades', desc:'0.1% vs potential 0.5%+ slippage on orderbook for $500K trades.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <div>
                    <div style={{ color:S.t1, fontWeight:700, fontSize:12 }}>{title}</div>
                    <div style={{ color:S.t3, fontSize:11, lineHeight:1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent fills */}
          <div>
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${S.b}`, fontWeight:700, color:S.t1, fontSize:13 }}>Recent RFQs</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#131829' }}>
                  {['ID','Trader','Amount','Status'].map(h => (
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {quotes.map((q,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${S.b}` }}>
                      <td style={{ padding:'10px 14px', color:S.t3, fontSize:11, fontFamily:'monospace' }}>#{q.id}</td>
                      <td style={{ padding:'10px 14px', color:S.a, fontSize:11, fontFamily:'monospace' }}>{q.trader}</td>
                      <td style={{ padding:'10px 14px', color:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{fmtM(q.amountIn)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:q.status==='FILLED'?'#00E5A015':'#FFB80015', color:q.status==='FILLED'?S.g:S.gold, border:`1px solid ${q.status==='FILLED'?'#00E5A030':'#FFB80030'}`, borderRadius:4, padding:'2px 7px', fontSize:9, fontWeight:800 }}>{q.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Access requirements */}
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:18 }}>
              <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Access Requirements</div>
              <div style={{ color:S.t3, fontSize:12, lineHeight:1.7, marginBottom:12 }}>OTC Desk requires a <strong style={{ color:S.gold }}>Gold</strong> or <strong style={{ color:S.cy }}>Diamond</strong> Trader Pass, or manual whitelisting by the team.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { tier:'🥇 Gold Pass',    req:'$2,000 one-time', c:S.gold },
                  { tier:'💎 Diamond Pass', req:'$5,000 one-time', c:S.cy },
                ].map(({ tier, req, c }) => (
                  <div key={tier} style={{ background:'#0A0C16', borderRadius:8, padding:12, textAlign:'center' }}>
                    <div style={{ color:c, fontWeight:800, fontSize:13 }}>{tier}</div>
                    <div style={{ color:S.t3, fontSize:10, marginTop:3 }}>{req}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => {}} style={{ width:'100%', marginTop:12, padding:10, borderRadius:9, border:`1px solid ${S.gold}`, background:'transparent', color:S.gold, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                Get a Trader Pass →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
