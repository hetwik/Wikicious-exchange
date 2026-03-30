import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v => { const n=parseFloat(v||0)/1e6; return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`; };
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

const MOCK_MARKETS=[
  {id:0,creator:'0x7f3a…b2c4',symbol:'DOGEUSDT',name:'Dogecoin',bondPaid:'10000000000',createdAt:1710000000,volume30d:'2840000000000',totalVolume:'8420000000000',totalFees:'5052000000',maxLeverage:25,takerFeeBps:8,status:'ACTIVE'},
  {id:1,creator:'0x2b8c…d1e5',symbol:'PEPEUSDT',name:'PEPE',bondPaid:'10000000000',createdAt:1708000000,volume30d:'184000000000',totalVolume:'540000000000',totalFees:'324000000',maxLeverage:20,takerFeeBps:10,status:'SLASHED'},
];
const MOCK_STATS={bondRevenue:'20000000000',feeRevenue:'5376000000',slashRevenue:'5000000000',bondAmount:'10000000000'};

export default function PermissionlessMarketsPage() {
  const { address } = useAccount();
  const [form, setForm] = useState({symbol:'',name:'',maxLev:'25',fee:'8'});
  const { data:markets=MOCK_MARKETS } = useQuery({queryKey:['perm-markets'],queryFn:()=>api('/api/permissionless/markets'),placeholderData:MOCK_MARKETS});
  const { data:stats=MOCK_STATS } = useQuery({queryKey:['perm-stats'],queryFn:()=>api('/api/permissionless/stats'),placeholderData:MOCK_STATS});
  const STATUS_COLOR={ACTIVE:'#00E5A0',SLASHED:'#FFB800',CLOSED:'#4A5270',PENDING:'#5B7FFF'};

  return (
    <AppLayout>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#A855F720',border:'1px solid #A855F740',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🔓</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Permissionless Markets</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>List any perpetual market with a $10K USDC bond. Protocol earns 20% of all trading fees from creator markets.</p></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
          {[
            {l:'Bond Revenue',    v:`$${(parseFloat(stats.bondRevenue||0)/1e9).toFixed(1)}K`,     c:S.a},
            {l:'Fee Revenue',     v:`$${(parseFloat(stats.feeRevenue||0)/1e9).toFixed(1)}K`,      c:S.g},
            {l:'Slash Revenue',   v:`$${(parseFloat(stats.slashRevenue||0)/1e9).toFixed(1)}K`,    c:S.gold},
            {l:'Bond per Listing',v:'$10,000 USDC',                                               c:'#A855F7'},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:19,fontWeight:900,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:S.t2,marginBottom:12,letterSpacing:'.08em'}}>ACTIVE CREATOR MARKETS</div>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:13,overflow:'hidden',marginBottom:18}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#131829'}}>
                  {['Market','Creator','Volume 30d','Total Fees','Status','Bond'].map(h=>(
                    <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:S.t3,textTransform:'uppercase',letterSpacing:'.08em'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {markets.map(m=>(
                    <tr key={m.id} style={{borderBottom:`1px solid ${S.b}`}}>
                      <td style={{padding:'11px 14px'}}><div style={{color:S.a,fontWeight:700,fontSize:13}}>{m.symbol}</div><div style={{color:S.t3,fontSize:10}}>{m.name}</div></td>
                      <td style={{padding:'11px 14px',color:S.t2,fontSize:11,fontFamily:'monospace'}}>{m.creator}</td>
                      <td style={{padding:'11px 14px',color:S.g,fontSize:12,fontFamily:'monospace'}}>${(parseFloat(m.volume30d||0)/1e9).toFixed(1)}M</td>
                      <td style={{padding:'11px 14px',color:S.gold,fontSize:12,fontFamily:'monospace'}}>${(parseFloat(m.totalFees||0)/1e9).toFixed(1)}K</td>
                      <td style={{padding:'11px 14px'}}><span style={{background:`${STATUS_COLOR[m.status]||'#4A5270'}18`,color:STATUS_COLOR[m.status]||S.t3,border:`1px solid ${STATUS_COLOR[m.status]||'#4A5270'}35`,borderRadius:4,padding:'2px 8px',fontSize:9,fontWeight:800}}>{m.status}</span></td>
                      <td style={{padding:'11px 14px',color:S.t3,fontSize:11,fontFamily:'monospace'}}>${(parseFloat(m.bondPaid||0)/1e9).toFixed(1)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:13,padding:20}}>
              <div style={{fontWeight:800,fontSize:14,color:S.t1,marginBottom:12}}>How It Works</div>
              {[
                {n:'1',t:'Post $10K bond',d:'Pay USDC bond to create your market. Bond returned after 90 days.'},
                {n:'2',t:'Market goes live',d:'Traders can immediately open positions with your oracle feed.'},
                {n:'3',t:'Volume check',d:'After 30 days: if volume < $500K, 50% of bond is slashed.'},
                {n:'4',t:'Earn forever',d:'80% of all trading fees go to creator. Protocol keeps 20%.'},
              ].map(({n,t,d,c})=>(
                <div key={n} style={{display:'flex',gap:10,marginBottom:10}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:'#A855F720',border:'1px solid #A855F740',display:'flex',alignItems:'center',justifyContent:'center',color:'#A855F7',fontWeight:900,fontSize:10,flexShrink:0}}>{n}</div>
                  <div><div style={{color:S.t1,fontWeight:700,fontSize:12}}>{t}</div><div style={{color:S.t3,fontSize:11}}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:20,height:'fit-content',position:'sticky',top:68}}>
            <div style={{fontWeight:900,fontSize:15,color:S.t1,marginBottom:4}}>List New Market</div>
            <div style={{color:S.t3,fontSize:12,marginBottom:16}}>Post $10K USDC bond and launch your perpetual market.</div>
            {[['Market Symbol','symbol','e.g. DOGEUSDT'],['Display Name','name','e.g. Dogecoin']].map(([l,k,ph])=>(
              <div key={k} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.08em',marginBottom:4}}>{l.toUpperCase()}</div>
                <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                  style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,fontFamily:'monospace',padding:'8px 11px',outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[['Max Leverage','maxLev','25'],['Taker Fee (bps)','fee','8']].map(([l,k,ph])=>(
                <div key={k}>
                  <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:4}}>{l.toUpperCase()}</div>
                  <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} type="number" placeholder={ph}
                    style={{width:'100%',background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,fontFamily:'monospace',padding:'8px 11px',outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>
            <div style={{background:'#A855F710',border:'1px solid #A855F730',borderRadius:8,padding:10,marginBottom:14}}>
              {[['Bond required','$10,000 USDC'],['Protocol fee','20% of all trades'],['Creator share','80% of all trades'],['Bond return','After 90 days'],['Slash risk','50% if volume < $500K/30d']].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                  <span style={{color:S.t3,fontSize:11}}>{k}</span><span style={{color:S.t1,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?'#A855F7':'#1C2138',color:'#fff'}}>
              {address?'List Market — $10K Bond':'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
