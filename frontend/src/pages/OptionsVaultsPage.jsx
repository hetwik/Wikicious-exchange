import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1000).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const fmtPct = v => `${(parseFloat(v||0)/1e16).toFixed(2)}%`;
const fmtPrice = v => (parseFloat(v||0)/1e18).toFixed(4);

const MOCK = [
  { id:0, name:'ETH Covered Call',    symbol:'wCC-ETH', vaultType:'COVERED_CALL',   totalAssets:'4200000000', sharePrice:'1042000000000000000', estimatedAPY:'1800000000000000', managementFeeBps:'200', performanceFeeBps:'2000', weeklyPremium:'84000000', active:true },
  { id:1, name:'BTC Cash-Secured Put',symbol:'wCSP-BTC',vaultType:'CASH_SECURED_PUT',totalAssets:'8800000000', sharePrice:'1038000000000000000', estimatedAPY:'1540000000000000', managementFeeBps:'200', performanceFeeBps:'2000', weeklyPremium:'134000000', active:true },
  { id:2, name:'Theta Decay Strategy',symbol:'wTHETA',  vaultType:'THETA_DECAY',    totalAssets:'3100000000', sharePrice:'1021000000000000000', estimatedAPY:'1220000000000000', managementFeeBps:'200', performanceFeeBps:'2000', weeklyPremium:'48000000',  active:true },
];

const TYPE_COLOR = { COVERED_CALL:'#5B7FFF', CASH_SECURED_PUT:'#00E5A0', THETA_DECAY:'#A855F7' };
const TYPE_ICON  = { COVERED_CALL:'📞', CASH_SECURED_PUT:'💵', THETA_DECAY:'⏰' };

function VaultCard({ v, onSelect, selected }) {
  const apy = fmtPct(v.estimatedAPY);
  const color = TYPE_COLOR[v.vaultType] || '#5B7FFF';
  return (
    <div onClick={() => onSelect(v)} style={{
      background: selected ? `${color}0D` : '#0E1120',
      border: `1px solid ${selected ? color : '#1C2138'}`,
      borderRadius: 14, padding: 20, cursor: 'pointer', transition: 'all 0.15s'
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
            {TYPE_ICON[v.vaultType]}
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:14, color:'#EDF0FA' }}>{v.name}</div>
            <div style={{ fontSize:10, color:'#4A5270', fontFamily:'monospace' }}>{v.symbol}</div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:'#00E5A0', fontWeight:900, fontSize:18 }}>{apy}</div>
          <div style={{ fontSize:9, color:'#4A5270' }}>EST. APY</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        {[
          ['TVL', fmtM(v.totalAssets)],
          ['Share Price', fmtPrice(v.sharePrice)],
          ['Weekly Premium', fmtM(v.weeklyPremium)],
          ['Perf Fee', `${parseInt(v.performanceFeeBps)/100}%`],
        ].map(([k,val]) => (
          <div key={k} style={{ background:'#0A0C16', borderRadius:7, padding:'8px 10px' }}>
            <div style={{ fontSize:9, color:'#4A5270', fontWeight:700, marginBottom:3 }}>{k.toUpperCase()}</div>
            <div style={{ color:'#EDF0FA', fontWeight:700, fontSize:13, fontFamily:'monospace' }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background:`${color}10`, border:`1px solid ${color}20`, borderRadius:7, padding:'8px 12px' }}>
        <span style={{ fontSize:10, color, fontWeight:700 }}>
          {v.vaultType === 'COVERED_CALL' ? '📞 Earn premium by writing OTM calls. Risk: upside capped.' :
           v.vaultType === 'CASH_SECURED_PUT' ? '💵 Earn premium by writing OTM puts. Risk: buying dip.' :
           '⏰ Delta-neutral mix. Lower yield, lower risk.'}
        </span>
      </div>
    </div>
  );
}

export default function OptionsVaultsPage() {
  const { address } = useAccount();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('deposit');
  const [amount, setAmount] = useState('');

  const { data: vaults = MOCK } = useQuery({ queryKey:['options-vaults'], queryFn:()=>api('/api/options-vaults/vaults'), placeholderData:MOCK, refetchInterval:30000 });
  const active = selected ?? vaults[0];

  const totalTVL = vaults.reduce((s,v) => s + parseFloat(v.totalAssets||0)/1e6, 0);
  const totalPremium = vaults.reduce((s,v) => s + parseFloat(v.weeklyPremium||0)/1e6, 0);

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#5B7FFF20', border:'1px solid #5B7FFF40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📊</div>
            <div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#EDF0FA' }}>Options Vaults</h1>
              <p style={{ margin:0, color:'#4A5270', fontSize:13 }}>Auto-run covered calls & cash-secured puts. Earn weekly option premium.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
          {[
            { l:'Total TVL', v:`$${totalTVL.toFixed(1)}M`, c:'#5B7FFF' },
            { l:'Weekly Premium', v:`$${totalPremium.toFixed(0)}K`, c:'#00E5A0' },
            { l:'Active Vaults', v:vaults.length, c:'#A855F7' },
            { l:'Protocol Fee', v:'2% Mgmt + 20% Perf', c:'#FFB800' },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:'#0E1120', border:`1px solid #1C2138`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:9, color:'#4A5270', fontWeight:700, letterSpacing:'.1em', marginBottom:7 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 2-col layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#8892B0', letterSpacing:'.08em', marginBottom:12 }}>AVAILABLE VAULTS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {vaults.map(v => <VaultCard key={v.id} v={v} selected={active?.id===v.id} onSelect={setSelected} />)}
            </div>

            {/* How it works */}
            <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20, marginTop:20 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#EDF0FA', marginBottom:14 }}>How Options Vaults Work</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { n:'1. Deposit', d:'You deposit USDC (or ETH). Your funds are pooled with other depositors.', c:'#5B7FFF' },
                  { n:'2. Write Options', d:'Every Friday the vault writes out-of-the-money options and receives premium.', c:'#00E5A0' },
                  { n:'3. Earn Premium', d:'Premium collected (minus fees) is added to your share value automatically.', c:'#A855F7' },
                  { n:'4. Withdraw Anytime', d:'Queue a withdrawal before Friday. Assets released after epoch settlement.', c:'#FFB800' },
                ].map(({ n,d,c }) => (
                  <div key={n} style={{ background:'#0A0C16', borderRadius:8, padding:12 }}>
                    <div style={{ color:c, fontWeight:800, fontSize:12, marginBottom:4 }}>{n}</div>
                    <div style={{ color:'#4A5270', fontSize:11, lineHeight:1.6 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action panel */}
          {active && (
            <div style={{ background:'#0E1120', border:'1px solid #1C2138', borderRadius:14, padding:20, position:'sticky', top:68 }}>
              <div style={{ fontWeight:900, fontSize:16, color:'#EDF0FA', marginBottom:4 }}>{active.name}</div>
              <div style={{ fontSize:11, color:'#4A5270', marginBottom:16 }}>{active.symbol} · Epoch #{parseInt(active.epochNumber||1)}</div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:9, border:'1px solid #1C2138', marginBottom:16 }}>
                {['deposit','withdraw'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontWeight:800, fontSize:11, background:tab===t?'#5B7FFF':'transparent', color:tab===t?'#fff':'#4A5270' }}>
                    {t === 'deposit' ? '⬇ Deposit' : '⬆ Withdraw'}
                  </button>
                ))}
              </div>

              <div>
                <div style={{ fontSize:9, fontWeight:700, color:'#4A5270', marginBottom:6 }}>AMOUNT (USDC)</div>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  style={{ width:'100%', background:'#0A0C16', border:'1px solid #1C2138', borderRadius:9, color:'#EDF0FA', fontSize:18, fontWeight:700, fontFamily:'monospace', padding:'12px 14px', outline:'none', boxSizing:'border-box' }} />
              </div>

              {amount && parseFloat(amount) > 0 && (
                <div style={{ background:'#0A0C16', borderRadius:8, padding:12, marginTop:12, border:'1px solid #1C2138' }}>
                  {tab === 'deposit' ? <>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><span style={{ color:'#4A5270', fontSize:11 }}>Shares received</span><span style={{ color:'#EDF0FA', fontFamily:'monospace', fontSize:11 }}>{(parseFloat(amount) / parseFloat(active.sharePrice||1e18) * 1e18).toFixed(4)}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#4A5270', fontSize:11 }}>Applied next epoch</span><span style={{ color:'#FFB800', fontSize:11 }}>Friday</span></div>
                  </> : <>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><span style={{ color:'#4A5270', fontSize:11 }}>Assets received</span><span style={{ color:'#EDF0FA', fontFamily:'monospace', fontSize:11 }}>{amount} USDC</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#4A5270', fontSize:11 }}>Settlement window</span><span style={{ color:'#FFB800', fontSize:11 }}>Friday ~18:00 UTC</span></div>
                  </>}
                </div>
              )}

              <button style={{ width:'100%', marginTop:16, padding:14, borderRadius:10, border:'none', background:address?'linear-gradient(135deg,#5B7FFF,#A855F7)':'#1C2138', color:address?'#fff':'#4A5270', fontWeight:900, fontSize:13, cursor:address?'pointer':'not-allowed' }}>
                {address ? (tab === 'deposit' ? 'DEPOSIT TO VAULT' : 'QUEUE WITHDRAWAL') : 'CONNECT WALLET'}
              </button>

              {/* Key metrics */}
              <div style={{ marginTop:16 }}>
                {[
                  ['Management Fee', `${parseInt(active.managementFeeBps||200)/100}% / year`],
                  ['Performance Fee', `${parseInt(active.performanceFeeBps||2000)/100}% of profits`],
                  ['Share Price', fmtPrice(active.sharePrice)],
                  ['Est. APY', fmtPct(active.estimatedAPY)],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #1C213840' }}>
                    <span style={{ color:'#4A5270', fontSize:11 }}>{k}</span>
                    <span style={{ color:'#EDF0FA', fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
