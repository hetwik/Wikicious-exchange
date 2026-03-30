import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = { bg:'#0E1120', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', p:'#A855F7' };
const MOCK_STATS = { totalAccounts:284, totalRevenue:'142000000', maintenanceFeeBps:5 };
const MOCK_ACCT = { active:true, totalCollateral:'10000000000', unrealizedPnL:'840000000', maintenanceMargin:'2400000000', healthFactor:44750, freeCollateral:'6040000000', positionCount:3, isLiquidatable:false };

function HealthBar({ hf }) {
  const pct = Math.min(100, (hf / 100 / 5) * 100);
  const color = hf > 20000 ? S.g : hf > 12000 ? S.gold : S.r;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:S.t3 }}>Health Factor</span>
        <span style={{ fontSize:13, color, fontWeight:900, fontFamily:'monospace' }}>{(hf/10000).toFixed(2)}×</span>
      </div>
      <div style={{ height:6, background:'#0A0C16', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .5s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:S.t3, marginTop:3 }}>
        <span style={{ color:S.r }}>Liq. 1.0×</span>
        <span style={{ color:S.gold }}>Warn 1.1×</span>
        <span style={{ color:S.g }}>Safe 2.0×+</span>
      </div>
    </div>
  );
}

export default function PortfolioMarginPage() {
  const { address } = useAccount();
  const [deposit, setDeposit] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['pm-stats'], queryFn:()=>api('/api/portfolio-margin/stats'), placeholderData:MOCK_STATS });
  const { data: account = null } = useQuery({ queryKey:['pm-account', address], queryFn:()=>api(`/api/portfolio-margin/account/${address}`), enabled:!!address });

  const acct = account?.active ? account : null;

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#A855F720', border:'1px solid #A855F740', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⚖️</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Portfolio Margin</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Use your entire account as collateral. Open more positions with less capital. 0.005%/day maintenance fee.</p>
          </div>
        </div>

        {/* Protocol stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { l:'PM Accounts',    v:stats.totalAccounts,      c:S.a },
            { l:'Protocol Revenue', v:fmtM(stats.totalRevenue), c:S.g },
            { l:'Daily Fee',      v:'0.005% of portfolio',    c:S.gold },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Isolated vs Portfolio comparison */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          {[
            { title:'Isolated Margin (Current)', color:S.t3, items:[
              'Each position needs its own collateral',
              '$10K USDC → max 1 position at 10× = $100K notional',
              'Position A loss cannot affect Position B',
              'Lower capital efficiency',
              'Safe for beginners',
            ]},
            { title:'Portfolio Margin (New)', color:S.g, items:[
              'One account collateralises all positions',
              '$10K USDC → multiple positions, total notional limited by net margin',
              'Long BTC + Short BTC net out → lower combined margin requirement',
              '2–3× higher capital efficiency',
              'Pays 0.005%/day maintenance fee',
            ]},
          ].map(({ title, color, items }) => (
            <div key={title} style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:20 }}>
              <div style={{ color, fontWeight:800, fontSize:14, marginBottom:14 }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ color, fontSize:12, marginTop:1 }}>{color===S.g?'✓':'•'}</span>
                  <span style={{ color:S.t2, fontSize:12, lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
          {/* Account dashboard */}
          <div>
            {acct ? (
              <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:22 }}>
                <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:18 }}>Your PM Account</div>
                <HealthBar hf={acct.healthFactor} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:18 }}>
                  {[
                    { l:'Total Collateral', v:fmtM(acct.totalCollateral), c:S.a },
                    { l:'Unrealized PnL',   v:fmtM(acct.unrealizedPnL),   c:parseFloat(acct.unrealizedPnL)>=0?S.g:S.r },
                    { l:'Maintenance Margin', v:fmtM(acct.maintenanceMargin), c:S.gold },
                    { l:'Free Collateral', v:fmtM(acct.freeCollateral),  c:S.g },
                    { l:'Open Positions',  v:acct.positionCount,          c:S.t1 },
                    { l:'Liquidatable',    v:acct.isLiquidatable ? '⚠️ Yes' : '✅ No', c:acct.isLiquidatable?S.r:S.g },
                  ].map(({ l,v,c }) => (
                    <div key={l} style={{ background:'#0A0C16', borderRadius:8, padding:'10px 14px' }}>
                      <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>{l.toUpperCase()}</div>
                      <div style={{ color:c, fontSize:14, fontWeight:700, fontFamily:'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:28, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>⚖️</div>
                <div style={{ color:S.t1, fontWeight:700, fontSize:16, marginBottom:8 }}>{address ? 'No PM Account' : 'Connect Wallet'}</div>
                <div style={{ color:S.t3, fontSize:13 }}>{address ? 'Create a portfolio margin account to get started.' : 'Connect your wallet to view your PM account.'}</div>
              </div>
            )}

            {/* Netting example */}
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:20, marginTop:14 }}>
              <div style={{ fontWeight:700, fontSize:13, color:S.t1, marginBottom:14 }}>Netting Example — $10K Collateral</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { scenario:'Isolated Margin', positions:['Long BTC 10×: $50K','Long ETH 5×: $25K'], margin:'$10K needed each\n→ Max 1 position', cap:S.r },
                  { scenario:'Portfolio Margin', positions:['Long BTC 10×: $50K','Short ETH 5×: $25K'], margin:'Net margin = $7.5K\n→ Both positions open', cap:S.g },
                ].map(({ scenario, positions, margin, cap }) => (
                  <div key={scenario} style={{ background:'#0A0C16', borderRadius:8, padding:14 }}>
                    <div style={{ color:cap, fontWeight:700, fontSize:12, marginBottom:8 }}>{scenario}</div>
                    {positions.map(p => <div key={p} style={{ color:S.t2, fontSize:11, marginBottom:4 }}>• {p}</div>)}
                    <div style={{ color:cap, fontSize:11, fontWeight:600, marginTop:8, whiteSpace:'pre' }}>{margin}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create / Add collateral panel */}
          <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:20, height:'fit-content', position:'sticky', top:68 }}>
            <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:4 }}>{acct ? 'Manage Account' : 'Create PM Account'}</div>
            <div style={{ color:S.t3, fontSize:12, marginBottom:18 }}>{acct ? 'Add or withdraw collateral.' : 'Minimum $1,000 USDC to open.'}</div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:5 }}>USDC AMOUNT</div>
              <input value={deposit} onChange={e => setDeposit(e.target.value)} type="number" placeholder="1000"
                style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:8, color:S.t1, fontSize:16, fontFamily:'monospace', padding:'10px 12px', outline:'none', boxSizing:'border-box' }} />
            </div>

            {/* Fee preview */}
            {deposit && parseFloat(deposit) >= 1000 && (
              <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginBottom:14 }}>
                {[
                  ['Daily maintenance fee', `$${(parseFloat(deposit)*0.00005).toFixed(4)}`],
                  ['Monthly fee', `$${(parseFloat(deposit)*0.00005*30).toFixed(2)}`],
                  ['Annual fee (1.825%)', `$${(parseFloat(deposit)*0.01825).toFixed(2)}`],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                    <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                    <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <button style={{ width:'100%', padding:13, borderRadius:10, border:'none', cursor:address?'pointer':'not-allowed', fontWeight:900, fontSize:13,
              background:address?S.p:'#1C2138', color:'#fff' }}>
              {!address ? 'Connect Wallet' : acct ? 'Add Collateral' : 'Create PM Account'}
            </button>

            <div style={{ marginTop:14, padding:12, background:'#FFB80010', border:'1px solid #FFB80030', borderRadius:8 }}>
              <div style={{ color:S.gold, fontSize:11, fontWeight:700, marginBottom:4 }}>⚠️ Risk Warning</div>
              <div style={{ color:S.t3, fontSize:11, lineHeight:1.6 }}>Portfolio margin enables higher leverage. A single losing position can affect your entire account. Use with caution.</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
