import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';
const api = p => axios.get(`${API_URL}${p}`).then(r=>r.data);
const fmtM = v=>{const n=parseFloat(v||0)/1e6;return n>=1000?`$${(n/1e3).toFixed(1)}B`:n>=1?`$${n.toFixed(2)}M`:`$${n.toFixed(2)}`;};
const fmtK = v=>{const n=parseFloat(v||0)/1e3;return n>=1000?`${(n/1e3).toFixed(1)}M`:n>=1?`${n.toFixed(1)}K`:`${parseFloat(v||0).toFixed(0)}`;};
const S={bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};
export default function TraderSubscriptionPage() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { data:stats={} } = useQuery({queryKey:['TraderSubscriptionPage'],queryFn:()=>api('/api/subscriptions/stats'),placeholderData:{}});
  return (
    <AppLayout>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:12,background:'#00D4FF20',border:'1px solid #00D4FF40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📡</div>
          <div><h1 style={{margin:0,fontSize:26,fontWeight:900,color:S.t1}}>Trader API Subscriptions</h1>
          <p style={{margin:0,color:S.t3,fontSize:13}}>$99/month for private WebSocket feeds\, historical data\, priority routing\, dedicated RPC. Pure SaaS revenue.</p></div>
        </div>
        <div style={{background:'#00D4FF0D',border:'1px solid #00D4FF30',borderRadius:10,padding:'12px 16px',marginBottom:22}}>
          <span style={{color:S.t1,fontSize:12,lineHeight:1.7}}>
            Loading live data from chain... Connect wallet to interact.
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
          {Object.entries(stats).slice(0,6).map(([k,v])=>(
            <div key={k} style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'.1em',marginBottom:6}}>{k.replace(/([A-Z])/g,' $1').trim().toUpperCase()}</div>
              <div style={{color:'#00D4FF',fontSize:18,fontWeight:900,fontFamily:'monospace'}}>{typeof v==='number'?v.toLocaleString():fmtM(v?.toString()||'0')}</div>
            </div>
          ))}
        </div>
        <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:14,padding:22}}>
          <div style={{fontWeight:800,fontSize:15,color:S.t1,marginBottom:12}}>Interact</div>
          <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:5}}>AMOUNT (USDC)</div>
          <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00"
            style={{width:280,background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:15,fontFamily:'monospace',padding:'10px 12px',outline:'none',marginBottom:14}}/>
          <div style={{display:'flex',gap:10}}>
            <button style={{padding:'12px 28px',borderRadius:10,border:'none',cursor:address?'pointer':'not-allowed',fontWeight:900,fontSize:13,background:address?'#00D4FF':'#1C2138',color:address?'#000':'#4A5270'}}>
              {address?'Confirm Transaction':'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
