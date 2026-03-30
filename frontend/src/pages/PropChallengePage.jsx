import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const MOCK_STATS = { totalFees:'$284K', totalChallenges:284, totalPassed:71, totalFailed:213, passRate:2500, failRate:7500 };
// accountSize in USDC 6-decimal (e.g. 2000000000 = $2,000)
// flatFee in USDC 6-decimal (e.g. 19000000 = $19)
// passRefundBps: basis points of fee returned on pass (5000 = 50%)
// profitTargetBps: required profit % × 100 (800 = 8%)
// maxDDBps: max drawdown allowed (500 = 5%)
// profitSplitBps: trader's cut of funded account profits (8000 = 80%)
const MOCK_TIERS = [
  // ── Entry level ─────────────────────────────────────────────────────────
  { id:0, name:'MICRO',   label:'$2K',  accountSize:'2000000000',  flatFee:'19000000',  passRefundBps:5000, profitTargetBps:800, maxDDBps:500, durationDays:21, profitSplitBps:7500, instant:false, popular:false },
  { id:1, name:'MINI',    label:'$5K',  accountSize:'5000000000',  flatFee:'39000000',  passRefundBps:5000, profitTargetBps:800, maxDDBps:500, durationDays:21, profitSplitBps:7500, instant:false, popular:false },
  // ── Standard ────────────────────────────────────────────────────────────
  { id:2, name:'STARTER', label:'$10K', accountSize:'10000000000', flatFee:'99000000',  passRefundBps:5000, profitTargetBps:800, maxDDBps:500, durationDays:30, profitSplitBps:8000, instant:false, popular:false },
  { id:3, name:'TRADER',  label:'$25K', accountSize:'25000000000', flatFee:'199000000', passRefundBps:5000, profitTargetBps:800, maxDDBps:500, durationDays:30, profitSplitBps:8000, instant:false, popular:true  },
  // ── Advanced ────────────────────────────────────────────────────────────
  { id:4, name:'FUNDED',  label:'$50K', accountSize:'50000000000', flatFee:'299000000', passRefundBps:5000, profitTargetBps:800, maxDDBps:400, durationDays:45, profitSplitBps:8500, instant:false, popular:false },
  { id:5, name:'ELITE',   label:'$100K',accountSize:'100000000000',flatFee:'499000000', passRefundBps:5000, profitTargetBps:1000,maxDDBps:400, durationDays:60, profitSplitBps:8500, instant:false, popular:false },
  // ── Pro ─────────────────────────────────────────────────────────────────
  { id:6, name:'MASTER',  label:'$250K',accountSize:'250000000000',flatFee:'999000000', passRefundBps:5000, profitTargetBps:1000,maxDDBps:300, durationDays:60, profitSplitBps:9000, instant:false, popular:false },
  { id:7, name:'LEGEND',  label:'$1M',  accountSize:'1000000000000',flatFee:'2999000000',passRefundBps:5000,profitTargetBps:1000,maxDDBps:300, durationDays:90, profitSplitBps:9000, instant:false, popular:false },
  // ── Instant (skip challenge) ─────────────────────────────────────────────
  { id:8, name:'INSTANT', label:'Custom',accountSize:'0',           flatFee:'0',         passRefundBps:0,    profitTargetBps:0,   maxDDBps:0,   durationDays:0,  profitSplitBps:7000, instant:true  },
];

const TIER_COLOR = ['#4A5270','#5B7FFF','#5B7FFF','#00E5A0','#FFB800','#FFB800','#A855F7','#FF4060','#00D4FF'];
const TIER_ICON  = ['🌱','🌿','💼','📈','🏆','⚡','👑','💎','🚀'];

export default function PropChallengePage() {
  const { address } = useAccount();
  const [selectedTier, setSelectedTier] = useState(1);
  const [instantSize, setInstantSize] = useState('10000');

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['prop-challenge-stats'], queryFn:()=>api('/api/prop-challenge/stats'), placeholderData:MOCK_STATS });
  const { data: tiers = MOCK_TIERS } = useQuery({ queryKey:['prop-challenge-tiers'], queryFn:()=>api('/api/prop-challenge/tiers'), placeholderData:MOCK_TIERS });

  const sel = tiers[selectedTier] || MOCK_TIERS[1];
  const fee = sel.instant ? parseFloat(instantSize||0)*0.03 : parseFloat(sel.flatFee||0)/1e6;
  const acc = sel.instant ? parseFloat(instantSize||0) : parseFloat(sel.accountSize||0)/1e6;
  const refund = fee * (sel.passRefundBps||5000)/10000;
  const netFee = fee - refund;

  const S = { bg:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800', red:'#FF4060' };

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏆</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Prop Trading Challenges</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Pay a flat fee, prove your edge, get funded from $2K to $1M. 75% of challengers fail = protocol keeps the fee.</p>
          </div>
        </div>

        {/* Protocol stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { l:'Total Fee Revenue',    v:stats.totalFees,                              c:S.accent },
            { l:'Total Challenges',     v:stats.totalChallenges,                        c:S.t1 },
            { l:'Passed',               v:`${stats.totalPassed} (${(stats.passRate||2500)/100}%)`, c:S.green },
            { l:'Failed (Revenue)',     v:`${stats.totalFailed} (${(stats.failRate||7500)/100}%)`, c:S.gold },
            { l:'Avg Fee',              v:`$${(parseFloat(stats.totalFees?.replace(/[$,K]/g,'')||0)*1000/Math.max(1,stats.totalChallenges)).toFixed(0)}`, c:S.t1 },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:18, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
          {/* Tier cards */}
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {tiers.filter(t=>!t.instant).map((t,i) => {
                const acctUSD = parseFloat(t.accountSize||0)/1e6;
                const feeUSD  = parseFloat(t.flatFee||0)/1e6;
                const acctLabel = acctUSD >= 1000 ? `$${(acctUSD/1000).toFixed(0)}M` : acctUSD >= 1 ? `$${acctUSD.toFixed(0)}K` : t.label;
                return (
                <div key={i} onClick={()=>setSelectedTier(i)}
                  style={{ position:'relative', background:selectedTier===i?`${TIER_COLOR[i]}0C`:S.bg, border:`2px solid ${selectedTier===i?TIER_COLOR[i]:S.border}`, borderRadius:12, padding:18, cursor:'pointer', transition:'all .15s' }}>
                  {t.popular && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:TIER_COLOR[i], color:'#000', fontSize:8, fontWeight:900, padding:'2px 12px', borderRadius:10, whiteSpace:'nowrap' }}>⭐ MOST POPULAR</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:22 }}>{TIER_ICON[i] || '💼'}</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:S.t1 }}>{t.name}</div>
                        <div style={{ color:TIER_COLOR[i], fontSize:12, fontWeight:700 }}>{t.label} account</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:TIER_COLOR[i], fontWeight:900, fontSize:20, fontFamily:'monospace' }}>${feeUSD < 1 ? feeUSD.toFixed(0) : feeUSD >= 1000 ? `${(feeUSD/1000).toFixed(1)}K` : feeUSD.toFixed(0)}</div>
                      <div style={{ color:S.t3, fontSize:10 }}>challenge fee</div>
                    </div>
                  </div>
                  {[
                    ['Profit Target', `${(t.profitTargetBps||800)/100}%`],
                    ['Max Drawdown',  `${(t.maxDDBps||500)/100}%`],
                    ['Duration',      `${t.durationDays} days`],
                    ['Profit Split',  `${(t.profitSplitBps||8000)/100}% yours`],
                    ['Pass Refund',   `${(t.passRefundBps||5000)/100}% of fee`],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #1C213430' }}>
                      <span style={{ color:S.t3, fontSize:10 }}>{k}</span>
                      <span style={{ color:k==='Profit Split'?TIER_COLOR[i]:S.t1, fontSize:10, fontFamily:'monospace', fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                );
              })}
            </div>

            {/* Instant funding */}
            <div onClick={()=>setSelectedTier(4)}
              style={{ background:selectedTier===4?'#A855F70C':S.bg, border:`1px solid ${selectedTier===4?'#A855F7':S.border}`, borderRadius:12, padding:18, cursor:'pointer', transition:'all .15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:28 }}>⚡</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:S.t1 }}>INSTANT Funding</div>
                  <div style={{ color:S.t3, fontSize:12 }}>Skip the evaluation. Pay 3% of account size and start trading immediately.</div>
                </div>
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ color:'#A855F7', fontWeight:900, fontSize:16 }}>3% flat fee</div>
                  <div style={{ color:S.t3, fontSize:10 }}>no evaluation needed</div>
                </div>
              </div>
            </div>

            {/* Revenue model */}
            <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:12, padding:18, marginTop:14 }}>
              <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:12 }}>Why This Works (Revenue Math)</div>
              {[
                ['1,000 challenges/month', ''],
                ['75% fail (750 × avg $200 fee)', '+$150,000/mo'],
                ['25% pass → funded accounts', '+$50K/mo profit splits'],
                ['Pass refunds paid out (750×$100)', '-$75,000/mo'],
                ['Net monthly revenue', '~$125,000+/mo'],
              ].map(([k,v],i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1C213430' }}>
                  <span style={{ color:i===4?S.green:S.t2, fontSize:12, fontWeight:i===4?700:400 }}>{k}</span>
                  <span style={{ color:i===4?S.green:v.startsWith('-')?S.red:S.accent, fontSize:12, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase panel */}
          <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, padding:20, position:'sticky', top:68, height:'fit-content' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <span style={{ fontSize:24 }}>{TIER_ICON[selectedTier]}</span>
              <div>
                <div style={{ fontWeight:900, fontSize:16, color:S.t1 }}>{sel.name} Challenge</div>
                <div style={{ color:S.t3, fontSize:11 }}>{sel.instant ? 'Instant funded account' : `$${(acc/1000).toFixed(0)}K virtual account`}</div>
              </div>
            </div>

            {sel.instant && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>ACCOUNT SIZE (USD)</div>
                <input value={instantSize} onChange={e=>setInstantSize(e.target.value)} type="number" placeholder="10000"
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.border}`, borderRadius:8, color:S.t1, fontSize:16, padding:'9px 12px', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }} />
              </div>
            )}

            <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginBottom:14 }}>
              {[
                ['Challenge Fee',    `$${fee.toFixed(0)}`],
                ['Pass Refund',      sel.instant ? 'None' : `$${refund.toFixed(0)} (if you pass)`],
                ['Net Cost (fail)',  `$${fee.toFixed(0)}`],
                ['Net Cost (pass)',  sel.instant ? `$${fee.toFixed(0)}` : `$${netFee.toFixed(0)}`],
                ['Account Size',     sel.instant ? `$${parseFloat(instantSize||0).toLocaleString()}` : `$${(acc).toFixed(0)}`],
                ['Profit Split',     '80% you / 20% protocol'],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1C213430' }}>
                  <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                  <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>

            {!sel.instant && (
              <div style={{ background:'#5B7FFF0D', border:'1px solid #5B7FFF25', borderRadius:8, padding:10, marginBottom:12 }}>
                <div style={{ color:S.accent, fontSize:11, lineHeight:1.6 }}>
                  📈 Hit {(sel.profitTargetBps||800)/100}% profit in {sel.durationDays} days → get {sel.label} funded account + {(sel.profitSplitBps||8000)/100}% profit split + ${refund.toFixed(0)} fee refund.
                </div>
              </div>
            )}

            <button style={{ width:'100%', padding:14, borderRadius:10, border:'none', cursor:address?'pointer':'not-allowed', fontWeight:900, fontSize:13,
              background:address?TIER_COLOR[selectedTier]||'#5B7FFF':'#1C2138', color:address?'#000':'#4A5270' }}>
              {address ? `Start Challenge — $${fee.toFixed(0)} USDC` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
