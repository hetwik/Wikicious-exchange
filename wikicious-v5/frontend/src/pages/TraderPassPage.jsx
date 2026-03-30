import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);
const S = { bg:'#0E1120', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060', cy:'#00D4FF' };

const MOCK_TIERS = [
  { id:0, name:'Bronze',  price:'500000000',  discountBps:2500, farmBoostBps:10000, maxSupply:5000, minted:1840, otcAccess:false, priorityLiq:false, color:'#CD7F32', icon:'🥉' },
  { id:1, name:'Silver',  price:'1000000000', discountBps:4000, farmBoostBps:20000, maxSupply:3000, minted:842,  otcAccess:false, priorityLiq:false, color:'#C0C0C0', icon:'🥈' },
  { id:2, name:'Gold',    price:'2000000000', discountBps:6000, farmBoostBps:30000, maxSupply:1500, minted:284,  otcAccess:false, priorityLiq:true,  color:'#FFB800', icon:'🥇' },
  { id:3, name:'Diamond', price:'5000000000', discountBps:7500, farmBoostBps:50000, maxSupply:500,  minted:48,   otcAccess:true,  priorityLiq:true,  color:'#00D4FF', icon:'💎' },
];

const MOCK_STATS = { totalSupply:3014, totalRevenue:'5482000000000' };

function TierCard({ tier, selected, onSelect, userHas }) {
  const pct = tier.minted / tier.maxSupply * 100;
  const remaining = tier.maxSupply - tier.minted;
  return (
    <div onClick={() => onSelect(tier)} style={{
      background: selected ? `${tier.color}0C` : S.bg,
      border: `1px solid ${selected ? tier.color : S.b}`,
      borderRadius: 16, padding: 22, cursor: 'pointer', transition: 'all .15s', position: 'relative'
    }}>
      {userHas && <div style={{ position:'absolute', top:-10, right:14, background:S.g, color:'#000', borderRadius:20, padding:'2px 12px', fontSize:9, fontWeight:900 }}>OWNED</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:32, marginBottom:4 }}>{tier.icon}</div>
          <div style={{ fontWeight:900, fontSize:18, color:S.t1 }}>{tier.name}</div>
          <div style={{ color:tier.color, fontWeight:900, fontSize:22, fontFamily:'monospace', marginTop:2 }}>
            ${(parseFloat(tier.price)/1e6).toFixed(0)}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:tier.color, fontSize:28, fontWeight:900 }}>{tier.discountBps/100}%</div>
          <div style={{ color:S.t3, fontSize:11 }}>fee discount</div>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        {[
          ['Trading Discount', `${tier.discountBps/100}% off all fees`],
          ['Farm Boost', `${tier.farmBoostBps/10000}× reward multiplier`],
          ['OTC Access', tier.otcAccess ? '✓ Included' : '✗ Not included'],
          ['Priority Liquidation', tier.priorityLiq ? '✓ Included' : '✗ Not included'],
        ].map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}40` }}>
            <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
            <span style={{ color: v.startsWith('✓') ? S.g : v.startsWith('✗') ? S.t3 : S.t1, fontSize:11, fontWeight:v.startsWith('✓')?700:400 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:6 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:S.t3, marginBottom:4 }}>
          <span>{tier.minted.toLocaleString()} / {tier.maxSupply.toLocaleString()} minted</span>
          <span style={{ color: remaining < 100 ? S.r : S.t3 }}>{remaining.toLocaleString()} remaining</span>
        </div>
        <div style={{ height:4, background:'#0A0C16', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:tier.color, borderRadius:2, transition:'width .5s' }} />
        </div>
      </div>
    </div>
  );
}

export default function TraderPassPage() {
  const { address } = useAccount();
  const [selected, setSelected] = useState(MOCK_TIERS[1]);
  const [upgradeMode, setUpgradeMode] = useState(false);

  const { data: stats = MOCK_STATS } = useQuery({ queryKey:['trader-pass-stats'], queryFn:()=>api('/api/trader-pass/stats'), placeholderData:MOCK_STATS });
  const { data: userPass } = useQuery({ queryKey:['trader-pass-user', address], queryFn:()=>api(`/api/trader-pass/user/${address}`), enabled:!!address });

  const hasPass = userPass?.hasPass;
  const monthlyTrades = 100; // example
  const monthlyFee = monthlyTrades * 1000 * 0.0006; // $1000 per trade * 0.06%
  const savings = monthlyFee * (selected.discountBps / 10000);
  const payback = savings > 0 ? (parseFloat(selected.price)/1e6 / savings).toFixed(1) : '∞';

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#FFB80020', border:'1px solid #FFB80040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🎫</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Trader Pass NFT</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>One-time purchase. Lifetime fee discounts up to 75%. Transferable ERC-721.</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { l:'Passes Sold',    v:stats.totalSupply?.toLocaleString() || '3,014',   c:S.a },
            { l:'Revenue',        v:`$${(parseFloat(stats.totalRevenue||0)/1e9).toFixed(1)}M`, c:S.g },
            { l:'Floor Price',    v:'$500 USDC',         c:S.gold },
            { l:'Max Supply',     v:'10,000',            c:S.t2 },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
          {/* Tier grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {MOCK_TIERS.map(tier => (
              <TierCard key={tier.id} tier={tier} selected={selected.id === tier.id} onSelect={setSelected} userHas={false} />
            ))}
          </div>

          {/* Purchase panel */}
          <div>
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:14, padding:20, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <span style={{ fontSize:28 }}>{selected.icon}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:16, color:S.t1 }}>{selected.name} Pass</div>
                  <div style={{ color:selected.color, fontWeight:700, fontSize:13 }}>{selected.discountBps/100}% lifetime discount</div>
                </div>
              </div>

              {/* ROI calculator */}
              <div style={{ background:'#0A0C16', borderRadius:10, padding:14, marginBottom:16 }}>
                <div style={{ color:S.t2, fontSize:11, fontWeight:700, marginBottom:10 }}>ROI CALCULATOR (100 trades/mo @ $1K avg)</div>
                {[
                  ['Monthly fee without pass', `$${monthlyFee.toFixed(2)}`],
                  ['Monthly savings with pass', `$${savings.toFixed(2)}`],
                  ['Pass payback period', `${payback} months`],
                  ['Year 1 net savings', `$${(savings * 12 - parseFloat(selected.price)/1e6).toFixed(0)}`],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}30` }}>
                    <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                    <span style={{ color:k.includes('savings')||k.includes('payback')||k.includes('Year') ? S.g : S.t1, fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Pass benefits */}
              <div style={{ marginBottom:16 }}>
                {[
                  { icon:'💱', label:`${selected.discountBps/100}% off every trade`, color:S.a },
                  { icon:'🌾', label:`${selected.farmBoostBps/10000}× farm reward boost`, color:S.g },
                  { icon:'🔄', label:'Transferable — resell on secondary', color:S.gold },
                  ...(selected.otcAccess ? [{ icon:'🤝', label:'OTC Desk access ($100K+ trades)', color:S.cy }] : []),
                  ...(selected.priorityLiq ? [{ icon:'🛡️', label:'Priority in liquidation queue', color:'#A855F7' }] : []),
                ].map(({ icon, label, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <span style={{ color, fontSize:12, fontWeight:600 }}>{label}</span>
                  </div>
                ))}
              </div>

              <button style={{ width:'100%', padding:14, borderRadius:10, border:'none', cursor:address?'pointer':'not-allowed', fontWeight:900, fontSize:13,
                background:address ? selected.color : S.b, color:address ? '#000' : S.t3 }}>
                {address ? `Mint ${selected.name} Pass — $${(parseFloat(selected.price)/1e6).toFixed(0)}` : 'Connect Wallet'}
              </button>
            </div>

            {/* Upgrade path */}
            <div style={{ background:S.bg, border:`1px solid ${S.b}`, borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:700, fontSize:12, color:S.t1, marginBottom:10 }}>Upgrade Path</div>
              {MOCK_TIERS.map((t,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}40` }}>
                  <span style={{ color:t.color, fontSize:11, fontWeight:700 }}>{t.icon} {t.name}</span>
                  <span style={{ color:S.t2, fontSize:11, fontFamily:'monospace' }}>${(parseFloat(t.price)/1e6).toFixed(0)} one-time</span>
                </div>
              ))}
              <div style={{ color:S.t3, fontSize:10, marginTop:8, lineHeight:1.6 }}>Upgrades pay only the difference. Bronze→Gold = $1,500 additional.</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
