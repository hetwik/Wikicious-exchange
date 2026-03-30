import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const MOCK_SCHEDULE = {
  perp: { makerFeeBps:0, takerFeeBps:6, makerRebateBps:-2 },
  spot: { takerFeeBps:7, makerRebateBps:-3 },
  passDiscounts: { BRONZE:'25% off', SILVER:'40% off', GOLD:'60% off', DIAMOND:'75% off' },
  volume30d: [
    { tier:'<$100K',   takerBps:6, makerBps:-2 },
    { tier:'$100K–1M', takerBps:5, makerBps:-2 },
    { tier:'$1M–10M',  takerBps:4, makerBps:-1 },
    { tier:'>$10M',    takerBps:3, makerBps:0  },
  ],
};

const S = { bg:'#0E1120', border:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', accent:'#5B7FFF', green:'#00E5A0', gold:'#FFB800', red:'#FF4060' };

function FeeCell({ bps, isRebate }) {
  const negative = bps < 0;
  const color = negative ? S.green : bps === 0 ? S.green : S.t1;
  const label = negative ? `+${Math.abs(bps)/100}% rebate` : bps === 0 ? 'FREE' : `${bps/100}%`;
  return (
    <td style={{ padding:'11px 16px', fontFamily:'monospace', fontSize:12, fontWeight:700, color }}>
      {label}
    </td>
  );
}

export default function MakerRebatePage() {
  const [volume, setVolume] = useState(1);

  const { data: schedule = MOCK_SCHEDULE } = useQuery({ queryKey:['fee-schedule'], queryFn:()=>api('/api/fee-schedule/current'), placeholderData:MOCK_SCHEDULE });

  const vol = volume * 1e6;
  const takerFee = vol * 0.0006;
  const makerRebate = vol * 0.0002;
  const netRevenue = takerFee * 0.6 - makerRebate * 0.4; // assume 60% takers, 40% makers

  return (
    <AppLayout>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#00E5A020', border:'1px solid #00E5A040', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>💱</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:S.t1 }}>Fee Schedule & Maker Rebates</h1>
            <p style={{ margin:0, color:S.t3, fontSize:13 }}>Negative maker fees attract HFT liquidity → tighter spreads → more volume → more total revenue.</p>
          </div>
        </div>

        {/* Key insight banner */}
        <div style={{ background:'#00E5A00D', border:'1px solid #00E5A030', borderRadius:12, padding:'16px 20px', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <span style={{ fontSize:22, marginTop:2 }}>💡</span>
            <div>
              <div style={{ color:S.green, fontWeight:800, fontSize:14, marginBottom:6 }}>The Maker Rebate Flywheel</div>
              <div style={{ color:S.t2, fontSize:13, lineHeight:1.7 }}>
                Paying market makers 0.02% to provide liquidity attracts HFT firms who post tight bid-ask spreads. 
                Tighter spreads attract retail traders who get better prices. More retail volume increases taker fee revenue. 
                <strong style={{ color:S.green }}> Net result: 3–5× volume increase</strong> even with lower per-trade rates. 
                Binance, Hyperliquid, and every top exchange runs this model.
              </div>
            </div>
          </div>
        </div>

        {/* Before / After comparison */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          {[
            { label:'BEFORE (Current)', items:[['Maker fee','0.02%','red'],['Taker fee','0.05%',''],['Market makers','Casual',''],['Spread','Wider','red'],['Daily volume','Baseline',''],['Fee revenue','Baseline','red']], color:'#FF4060' },
            { label:'AFTER (Optimised)', items:[['Maker rebate','0.02% paid TO makers','green'],['Taker fee','0.06%','green'],['Market makers','Professional HFTs','green'],['Spread','Tightest possible','green'],['Daily volume','3–5× baseline','green'],['Fee revenue','2–3× baseline','green']], color:S.green },
          ].map(({ label, items, color }) => (
            <div key={label} style={{ background:S.bg, border:`1px solid ${color}30`, borderRadius:14, padding:20 }}>
              <div style={{ color, fontWeight:900, fontSize:13, letterSpacing:'.08em', marginBottom:14 }}>{label}</div>
              {items.map(([k,v,c]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #1C213440' }}>
                  <span style={{ color:S.t3, fontSize:12 }}>{k}</span>
                  <span style={{ color: c==='green'?S.green:c==='red'?S.red:S.t1, fontSize:12, fontWeight:700, fontFamily:'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Fee tables */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
          {/* Perp fees */}
          <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${S.border}`, fontWeight:700, color:S.t1, fontSize:13 }}>Perpetuals Fee Schedule</div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#131829' }}>
                {['Volume Tier','Taker Fee','Maker Rebate'].map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {schedule.volume30d.map((row,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${S.border}` }}>
                    <td style={{ padding:'11px 16px', color:S.t1, fontSize:12, fontWeight:600 }}>{row.tier}</td>
                    <FeeCell bps={row.takerBps} />
                    <FeeCell bps={row.makerBps} isRebate />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trader pass discounts */}
          <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${S.border}`, fontWeight:700, color:S.t1, fontSize:13 }}>Trader Pass Discounts</div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#131829' }}>
                {['Pass Tier','Discount','Effective Taker'].map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:9, fontWeight:700, color:S.t3, textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { name:'No Pass',  icon:'—',  discount:0,    color:S.t3 },
                  { name:'Bronze',   icon:'🥉', discount:25,   color:'#CD7F32' },
                  { name:'Silver',   icon:'🥈', discount:40,   color:'#C0C0C0' },
                  { name:'Gold',     icon:'🥇', discount:60,   color:S.gold },
                  { name:'Diamond',  icon:'💎', discount:75,   color:'#00D4FF' },
                ].map((r,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${S.border}` }}>
                    <td style={{ padding:'11px 16px', color:r.color, fontWeight:700, fontSize:12 }}>{r.icon} {r.name}</td>
                    <td style={{ padding:'11px 16px', color:S.green, fontFamily:'monospace', fontSize:12, fontWeight:700 }}>{r.discount > 0 ? `-${r.discount}%` : '—'}</td>
                    <td style={{ padding:'11px 16px', color:S.t1, fontFamily:'monospace', fontSize:12 }}>{r.discount > 0 ? `${(0.06 * (1 - r.discount/100)).toFixed(4)}%` : '0.0600%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue simulator */}
        <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:14, padding:24 }}>
          <div style={{ fontWeight:800, fontSize:15, color:S.t1, marginBottom:6 }}>Revenue Impact Calculator</div>
          <div style={{ color:S.t3, fontSize:12, marginBottom:20 }}>See how maker rebates affect your net fee revenue at different volume levels.</div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>MONTHLY TRADING VOLUME</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:'monospace', color:S.t1, marginBottom:8 }}>
              ${volume}M
            </div>
            <input type="range" min="1" max="500" value={volume} onChange={e=>setVolume(Number(e.target.value))}
              style={{ width:'100%', accentColor:S.accent }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:S.t3, marginTop:3 }}>
              <span>$1M</span><span>$250M</span><span>$500M</span>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { l:'Taker Fee Revenue',   v:`$${(takerFee/1000).toFixed(1)}K`,      c:S.accent, sub:'60% of volume at 0.06%' },
              { l:'Maker Rebate Cost',   v:`-$${(makerRebate/1000).toFixed(1)}K`,  c:S.red,    sub:'40% of volume at 0.02%' },
              { l:'Net Fee Revenue',     v:`$${(netRevenue/1000).toFixed(1)}K`,     c:S.green,  sub:'After rebate payments' },
              { l:'vs Old Model',        v:`+${((netRevenue / (vol * 0.0005) - 1)*100).toFixed(0)}%`, c:S.gold, sub:'Estimated uplift from volume increase' },
            ].map(({ l,v,c,sub }) => (
              <div key={l} style={{ background:'#0A0C16', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, letterSpacing:'.1em', marginBottom:6 }}>{l.toUpperCase()}</div>
                <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{v}</div>
                <div style={{ color:S.t3, fontSize:10, marginTop:3 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
