import { useState } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '../components/layout/AppLayout';

const S = { bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7' };

const TIERS = [
  { name:'BRONZE',  vol:'$0',      refShare:'20%', rebate:'10%', color:'#CD7F32' },
  { name:'SILVER',  vol:'$100K',   refShare:'25%', rebate:'12%', color:'#C0C0C0' },
  { name:'GOLD',    vol:'$1M',     refShare:'30%', rebate:'15%', color:S.gold    },
  { name:'DIAMOND', vol:'$10M',    refShare:'40%', rebate:'20%', color:S.a       },
];

export default function AffiliatePage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab]     = useState('dashboard');
  const [code, setCode]   = useState('');
  const [refCode, setRef] = useState('');
  const [copied, setCopied] = useState(false);

  const myCode = address ? `WIKI${address.slice(2,8).toUpperCase()}` : '';
  const refLink = `https://wikicious.io/?ref=${myCode}`;

  function copy() {
    navigator.clipboard.writeText(refLink);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (!isConnected) return (
    <AppLayout><div style={{maxWidth:500,margin:'80px auto',textAlign:'center',padding:20}}>
      <div style={{fontSize:64,marginBottom:16}}>🤝</div>
      <h2 style={{color:S.t1,marginBottom:8}}>Referral Program</h2>
      <p style={{color:S.t3,fontSize:14,lineHeight:1.7}}>Connect your wallet to access your referral dashboard and start earning.</p>
    </div></AppLayout>
  );

  return (
    <AppLayout>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'20px 20px'}}>
        {/* Hero */}
        <div style={{background:`linear-gradient(135deg,${S.a}18,${S.p}10)`,border:`1px solid ${S.a}30`,borderRadius:16,padding:28,marginBottom:22,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:11,color:S.t3,fontWeight:700,marginBottom:6}}>WIKICIOUS AFFILIATE PROGRAM</div>
            <h1 style={{fontSize:28,fontWeight:900,color:S.t1,marginBottom:8}}>Earn up to 40% of every fee<br/>your referrals generate — forever</h1>
            <p style={{color:S.t2,fontSize:14,maxWidth:500,lineHeight:1.7}}>Share your link. When someone trades on Wikicious through your link, you earn a cut of every fee they pay — for life. No cap. No expiry.</p>
          </div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {[['Your Tier','BRONZE','#CD7F32'],['Lifetime Earned','$0.00',S.g],['Active Referrals','0',S.a],['This Month','$0.00',S.gold]].map(([l,v,c]) => (
              <div key={l} style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:12,padding:'14px 18px',textAlign:'center',minWidth:120}}>
                <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:4}}>{l.toUpperCase()}</div>
                <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:'monospace'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:3,background:'#0A0C16',padding:3,borderRadius:10,marginBottom:18,width:'fit-content'}}>
          {[['dashboard','📊 Dashboard'],['link','🔗 My Link'],['tiers','🏆 Tiers'],['leaderboard','🥇 Leaderboard']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,fontFamily:'Space Grotesk,sans-serif',background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3}}>{l}</button>
          ))}
        </div>

        {tab === 'link' && (
          <div style={{maxWidth:600}}>
            <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:24,marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>Your Referral Link</div>
              <div style={{background:S.s2,border:`1px solid ${S.b}`,borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontFamily:'monospace',fontSize:12,color:S.a,wordBreak:'break-all'}}>{refLink}</div>
                <button onClick={copy} style={{background:copied?`${S.g}20`:S.s1,border:`1px solid ${copied?S.g:S.b}`,color:copied?S.g:S.t3,borderRadius:7,padding:'6px 14px',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',marginLeft:10}}>{copied?'✓ Copied':'📋 Copy'}</button>
              </div>
              <div style={{display:'flex',gap:8}}>
                {['Twitter','Telegram','Discord'].map(p => (
                  <button key={p} style={{flex:1,padding:'9px',borderRadius:9,border:`1px solid ${S.b}`,background:S.s2,color:S.t2,fontSize:12,fontWeight:700,cursor:'pointer'}}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{background:`${S.g}08`,border:`1px solid ${S.g}25`,borderRadius:12,padding:18}}>
              <div style={{fontWeight:800,marginBottom:10}}>Use a Referral Code</div>
              <div style={{display:'flex',gap:8}}>
                <input value={refCode} onChange={e=>setRef(e.target.value)} placeholder="Enter referral code (e.g. WIKI1A2B3C)" style={{flex:1,background:S.s2,border:`1px solid ${S.b}`,borderRadius:9,padding:'10px 14px',color:S.t1,fontSize:13,outline:'none',fontFamily:'Space Grotesk,sans-serif'}} />
                <button style={{padding:'10px 20px',borderRadius:9,border:'none',background:S.g,color:'#000',fontWeight:800,fontSize:13,cursor:'pointer'}}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'tiers' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {TIERS.map(tier => (
              <div key={tier.name} style={{background:S.s1,border:`2px solid ${tier.color}40`,borderRadius:14,padding:20}}>
                <div style={{fontSize:22,fontWeight:900,color:tier.color,marginBottom:4}}>{tier.name}</div>
                <div style={{fontSize:12,color:S.t3,marginBottom:16}}>Min referred vol: {tier.vol}</div>
                {[['Referrer share',tier.refShare],['Trader rebate',tier.rebate]].map(([l,v]) => (
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${S.b}30`}}>
                    <span style={{color:S.t3,fontSize:12}}>{l}</span>
                    <span style={{color:tier.color,fontFamily:'monospace',fontWeight:800}}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',background:'#131829',borderBottom:`1px solid ${S.b}`,fontWeight:800,fontSize:14}}>🥇 Top Affiliates</div>
            {[['0xAlpha...','$2.4M','$48,000','DIAMOND'],['0xBeta...','$1.1M','$22,000','GOLD'],['0xGamma...','$480K','$7,200','SILVER']].map(([addr,vol,earned,tier],i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'40px 2fr 2fr 1.5fr 1fr',padding:'13px 16px',borderBottom:`1px solid ${S.b}28`,alignItems:'center'}}>
                <div style={{fontWeight:900,fontSize:18,color:['#FFD700','#C0C0C0','#CD7F32'][i]}}>#{i+1}</div>
                <div style={{fontFamily:'monospace',fontSize:12,color:S.a}}>{addr}</div>
                <div style={{fontFamily:'monospace',fontSize:13,color:S.t1,fontWeight:700}}>{vol}</div>
                <div style={{fontFamily:'monospace',fontSize:13,color:S.g,fontWeight:700}}>{earned}</div>
                <span style={{padding:'2px 9px',borderRadius:6,background:`${S.a}15`,color:S.a,fontSize:10,fontWeight:800}}>{tier}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
