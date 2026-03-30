import { useState } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '../components/layout/AppLayout';

const S = { bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7',teal:'#00D4FF' };

const MOCK_SESSION_KEYS = [
  { key:'0x4f2a…b8c1', label:'MyAlgoBot', permissions:['open_position','close_position'], maxSpend:'$500/tx', expires:'7d', active:true },
  { key:'0x7b3c…d2e4', label:'GridBot',   permissions:['open_position'], maxSpend:'$200/tx', expires:'3d', active:true },
];

const GAS_TOKENS = [
  { sym:'USDC', icon:'💵', markup:'12%', saved:'~$0.42/tx' },
  { sym:'WIK',  icon:'🔵', markup:'10%', saved:'~$0.38/tx' },
  { sym:'WETH', icon:'Ξ',  markup:'12%', saved:'~$0.42/tx' },
  { sym:'ARB',  icon:'🔴', markup:'12%', saved:'~$0.42/tx' },
];

const BATCH_TEMPLATES = [
  { name:'Open Position + TP/SL', calls:3, desc:'Open long + set take profit + set stop loss in one tx' },
  { name:'Approve + Swap + Stake', calls:3, desc:'Approve USDC + swap to WIK + stake — one signature' },
  { name:'Close + Withdraw',       calls:2, desc:'Close position + withdraw margin to wallet' },
];

export default function SmartWalletPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('overview');
  const [gasToken, setGasToken] = useState('USDC');
  const [showNewKey, setShowNewKey] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyDays, setKeyDays] = useState(7);
  const [keyMaxSpend, setKeyMaxSpend] = useState(500);

  const hasWallet = true; // mock — real: check if smart account deployed

  return (
    <AppLayout>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:52,height:52,borderRadius:15,background:'linear-gradient(135deg,#5B7FFF,#A855F7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26 }}>🔐</div>
          <div>
            <h1 style={{ margin:0,fontSize:26,fontWeight:900,color:S.t1,fontFamily:'Georgia,serif' }}>Smart Wallet</h1>
            <div style={{ fontSize:12,color:S.t3 }}>ERC-4337 Account Abstraction · Gasless trading · Session keys · Social recovery</div>
          </div>
          {hasWallet && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'#00E5A010', border:'1px solid #00E5A030', borderRadius:10 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:S.g,boxShadow:`0 0 6px ${S.g}` }}/>
              <span style={{ fontSize:12,fontWeight:800,color:S.g }}>Smart Account Active</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:11, marginBottom:24, width:'fit-content' }}>
          {[['overview','⚡ Overview'],['gasless','⛽ Gasless Gas'],['sessions','🔑 Session Keys'],['batch','📦 Batch Txs'],['recovery','🛡 Recovery']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 18px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,background:tab===t?S.a:'transparent',color:tab===t?'#fff':S.t3 }}>{l}</button>
          ))}
        </div>

        {tab==='overview' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
              {[['Gas Saved','$48.20','this month',S.g],['Batch Txs','142','vs 284 individual',S.a],['Session Keys','2','active delegates',S.gold],['Guardians','3','social recovery signers',S.p]].map(([l,v,sub,c])=>(
                <div key={l} style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18 }}>
                  <div style={{ fontSize:9,color:S.t3,fontWeight:700 }}>{l.toUpperCase()}</div>
                  <div style={{ fontSize:24,fontWeight:900,fontFamily:'monospace',color:c,margin:'6px 0 2px' }}>{v}</div>
                  <div style={{ fontSize:10,color:S.t3 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:20 }}>
                <div style={{ fontWeight:800,fontSize:14,color:S.t1,marginBottom:16 }}>How It Works</div>
                {[
                  ['ERC-4337 Smart Account','Your wallet is a smart contract. No seed phrase needed — controlled by your key or guardians.'],
                  ['Gas in Any Token','Pay ETH gas costs in USDC, WIK, ARB, or any supported token. 12% convenience markup.'],
                  ['Batch Transactions','Open a position, set TP/SL, and update collateral in one click. 3-in-1 atomic execution.'],
                  ['Session Keys','Delegate limited trading rights to bots/algos. They can trade within your set limits.'],
                ].map(([title,desc])=>(
                  <div key={title} style={{ display:'flex',gap:10,marginBottom:14 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:S.a,marginTop:5,flexShrink:0 }}/>
                    <div><div style={{ fontWeight:700,fontSize:12,color:S.t1,marginBottom:2 }}>{title}</div><div style={{ fontSize:11,color:S.t3,lineHeight:1.6 }}>{desc}</div></div>
                  </div>
                ))}
              </div>

              <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:20 }}>
                <div style={{ fontWeight:800,fontSize:14,color:S.t1,marginBottom:16 }}>Smart Account Address</div>
                <div style={{ background:'#0A0C16',borderRadius:9,padding:'12px 14px',marginBottom:14 }}>
                  <div style={{ fontSize:9,color:S.t3,fontWeight:700,marginBottom:4 }}>YOUR SMART ACCOUNT</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,color:S.a }}>0x4a2f8b3c...e1d9 (CREATE2 deterministic)</div>
                </div>
                {!hasWallet ? (
                  <button style={{ width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:14,background:`linear-gradient(135deg,${S.a},${S.p})`,color:'#fff',cursor:'pointer' }}>
                    Deploy Smart Account (Free)
                  </button>
                ) : (
                  <div style={{ background:'#00E5A010',border:'1px solid #00E5A030',borderRadius:9,padding:'12px 14px' }}>
                    <div style={{ fontSize:10,fontWeight:800,color:S.g,marginBottom:4 }}>✅ Deployed on Arbitrum One</div>
                    <div style={{ fontSize:11,color:S.t3 }}>Block 198,420,842 · EntryPoint v0.6 · ERC-4337 compliant</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab==='gasless' && (
          <div>
            <div style={{ background:`${S.g}0D`,border:`1px solid ${S.g}25`,borderRadius:12,padding:'14px 18px',marginBottom:20 }}>
              <div style={{ fontWeight:800,fontSize:14,color:S.t1,marginBottom:4 }}>Pay Gas in Any Token</div>
              <div style={{ fontSize:11,color:S.t2 }}>Instead of holding ETH for gas, pay directly in the token you already have. Wikicious acts as a Paymaster — charges 10–12% markup on the actual gas cost.</div>
            </div>

            <div style={{ fontWeight:700,fontSize:13,color:S.t1,marginBottom:12 }}>Select Gas Payment Token</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              {GAS_TOKENS.map(t => (
                <div key={t.sym} onClick={()=>setGasToken(t.sym)} style={{ background:gasToken===t.sym?`${S.g}10`:S.s1, border:`2px solid ${gasToken===t.sym?S.g:S.b}`, borderRadius:12,padding:16,cursor:'pointer',transition:'all .12s',textAlign:'center' }}>
                  <div style={{ fontSize:28,marginBottom:8 }}>{t.icon}</div>
                  <div style={{ fontWeight:900,fontSize:15,color:S.t1,marginBottom:4 }}>{t.sym}</div>
                  <div style={{ fontSize:10,color:S.t3 }}>Markup: <span style={{ color:S.gold,fontWeight:700 }}>{t.markup}</span></div>
                  <div style={{ fontSize:10,color:S.g,marginTop:3 }}>Save {t.saved}</div>
                </div>
              ))}
            </div>

            <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:20 }}>
              <div style={{ fontWeight:700,fontSize:13,color:S.t1,marginBottom:14 }}>Gas Cost Comparison</div>
              {[['Standard ETH Tx','Must hold 0.01+ ETH for gas','❌ Friction'],['WikiPaymaster','Pay in '+gasToken+' (12% markup on gas)','✅ Any token'],['VIP (veWIK holder)','Protocol pays gas — zero cost to you','✅✅ Free']].map(([method,desc,badge])=>(
                <div key={method} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${S.b}20`,alignItems:'center' }}>
                  <div><div style={{ fontSize:12,fontWeight:700,color:S.t1 }}>{method}</div><div style={{ fontSize:10,color:S.t3 }}>{desc}</div></div>
                  <div style={{ fontSize:11,fontWeight:800,color:badge.includes('Free')?S.g:badge.includes('✅✅')?S.g:badge.includes('❌')?S.r:S.a }}>{badge}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='sessions' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div><div style={{ fontWeight:800,fontSize:14,color:S.t1 }}>Session Keys</div><div style={{ fontSize:11,color:S.t3 }}>Delegate limited trading rights to bots or hot wallets</div></div>
              <button onClick={()=>setShowNewKey(true)} style={{ padding:'9px 18px',borderRadius:9,border:'none',background:S.a,color:'#fff',fontWeight:800,fontSize:11,cursor:'pointer' }}>+ New Session Key</button>
            </div>

            {MOCK_SESSION_KEYS.map(k => (
              <div key={k.key} style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18,marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:`${S.gold}18`,border:`1px solid ${S.gold}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🔑</div>
                    <div><div style={{ fontWeight:800,fontSize:14,color:S.t1 }}>{k.label}</div><div style={{ fontFamily:'monospace',fontSize:10,color:S.t3 }}>{k.key}</div></div>
                  </div>
                  <div style={{ display:'flex',gap:6 }}>
                    <span style={{ padding:'3px 10px',borderRadius:5,background:'#00E5A015',color:S.g,fontSize:9,fontWeight:700,border:'1px solid #00E5A030' }}>● Active</span>
                    <button style={{ padding:'3px 10px',borderRadius:5,border:`1px solid ${S.r}30`,background:'transparent',color:S.r,fontSize:9,cursor:'pointer' }}>Revoke</button>
                  </div>
                </div>
                <div style={{ display:'flex',gap:16 }}>
                  <div><div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>MAX SPEND</div><div style={{ fontFamily:'monospace',fontSize:12,fontWeight:700,color:S.t1 }}>{k.maxSpend}</div></div>
                  <div><div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>EXPIRES</div><div style={{ fontFamily:'monospace',fontSize:12,fontWeight:700,color:S.gold }}>{k.expires}</div></div>
                  <div><div style={{ fontSize:8,color:S.t3,fontWeight:700 }}>PERMISSIONS</div><div style={{ display:'flex',gap:4,marginTop:2 }}>{k.permissions.map(p=><span key={p} style={{ background:`${S.a}15`,color:S.a,border:`1px solid ${S.a}30`,borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:700 }}>{p}</span>)}</div></div>
                </div>
              </div>
            ))}

            {showNewKey && (
              <div style={{ position:'fixed',inset:0,background:'#00000080',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <div style={{ background:'#0D1017',border:`1px solid ${S.b}`,borderRadius:18,padding:28,width:440 }} onClick={e=>e.stopPropagation()}>
                  <div style={{ fontWeight:900,fontSize:18,color:S.t1,marginBottom:20 }}>New Session Key</div>
                  {[['Label','Bot name',keyLabel,setKeyLabel,'text'],['Max Spend/Tx ($)','500',keyMaxSpend,setKeyMaxSpend,'number'],['Duration (days)','7',keyDays,setKeyDays,'number']].map(([l,ph,v,s,t])=>(
                    <div key={l} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:9,color:S.t3,fontWeight:700,marginBottom:5 }}>{l.toUpperCase()}</div>
                      <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={ph} style={{ width:'100%',background:S.s2,border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,padding:'10px 12px',outline:'none',boxSizing:'border-box' }}/>
                    </div>
                  ))}
                  <div style={{ fontSize:9,color:S.t3,fontWeight:700,marginBottom:8 }}>PERMISSIONS</div>
                  {['open_position','close_position','set_tp_sl','add_collateral'].map(p=>(
                    <label key={p} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',cursor:'pointer' }}>
                      <input type="checkbox" defaultChecked={p.includes('position')} style={{ accentColor:S.a }}/>
                      <span style={{ fontSize:11,color:S.t1 }}>{p.replace(/_/g,' ')}</span>
                    </label>
                  ))}
                  <div style={{ display:'flex',gap:8,marginTop:20 }}>
                    <button onClick={()=>setShowNewKey(false)} style={{ flex:1,padding:12,borderRadius:9,border:`1px solid ${S.b}`,background:'transparent',color:S.t3,fontWeight:700,cursor:'pointer' }}>Cancel</button>
                    <button onClick={()=>setShowNewKey(false)} style={{ flex:1,padding:12,borderRadius:9,border:'none',background:S.gold,color:'#000',fontWeight:900,cursor:'pointer' }}>Create Key</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='batch' && (
          <div>
            <div style={{ fontWeight:800,fontSize:14,color:S.t1,marginBottom:4 }}>Batch Transactions</div>
            <div style={{ fontSize:11,color:S.t3,marginBottom:18 }}>Execute multiple contract calls in a single UserOperation. One signature, one gas payment, atomic execution.</div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
              {BATCH_TEMPLATES.map(t => (
                <div key={t.name} style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:12,padding:16,cursor:'pointer' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <div style={{ fontWeight:800,fontSize:12,color:S.t1 }}>{t.name}</div>
                    <span style={{ background:`${S.a}15`,color:S.a,border:`1px solid ${S.a}30`,borderRadius:10,padding:'2px 8px',fontSize:9,fontWeight:700 }}>{t.calls} calls</span>
                  </div>
                  <div style={{ fontSize:10,color:S.t3,marginBottom:12 }}>{t.desc}</div>
                  <button style={{ width:'100%',padding:8,borderRadius:7,border:`1px solid ${S.a}30`,background:`${S.a}10`,color:S.a,fontSize:10,fontWeight:700,cursor:'pointer' }}>Use Template →</button>
                </div>
              ))}
            </div>

            <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18 }}>
              <div style={{ fontWeight:700,fontSize:13,color:S.t1,marginBottom:12 }}>Recent Batch Executions</div>
              {[['Open BTC Long + TP/SL','3 calls','$0.12 gas','✅ Executed','2m ago'],['Approve + Swap + Stake','3 calls','$0.09 gas','✅ Executed','1h ago'],['Close ETH + Withdraw','2 calls','$0.07 gas','✅ Executed','3h ago']].map(([name,calls,gas,status,time])=>(
                <div key={name} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${S.b}20`,alignItems:'center' }}>
                  <div><div style={{ fontWeight:700,fontSize:12,color:S.t1 }}>{name}</div><div style={{ fontSize:9,color:S.t3 }}>{calls} · {gas} · {time}</div></div>
                  <span style={{ fontSize:10,fontWeight:700,color:S.g }}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='recovery' && (
          <div style={{ maxWidth:560 }}>
            <div style={{ background:`${S.p}0D`,border:`1px solid ${S.p}25`,borderRadius:12,padding:18,marginBottom:20 }}>
              <div style={{ fontWeight:800,fontSize:14,color:S.t1,marginBottom:4 }}>Social Recovery</div>
              <div style={{ fontSize:11,color:S.t2,lineHeight:1.7 }}>If you lose your private key, your 3 guardians can collectively sign a recovery transaction to transfer ownership to a new wallet. No seed phrase needed.</div>
            </div>
            <div style={{ background:S.s1,border:`1px solid ${S.b}`,borderRadius:13,padding:18,marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:13,color:S.t1,marginBottom:12 }}>Your Guardians (2-of-3 threshold)</div>
              {['0x7f3a…b2c4 (Hardware wallet)','0x2b8c…d1e5 (Trusted friend)','0x9d1e…4f7a (Backup device)'].map((g,i)=>(
                <div key={g} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${S.b}20` }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:7,background:`${S.p}18`,border:`1px solid ${S.p}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🛡</div>
                    <span style={{ fontFamily:'monospace',fontSize:11,color:S.t1 }}>{g}</span>
                  </div>
                  <span style={{ fontSize:9,color:S.g,fontWeight:700 }}>✓ Confirmed</span>
                </div>
              ))}
            </div>
            <button style={{ width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:13,background:`linear-gradient(135deg,${S.p},${S.a})`,color:'#fff',cursor:'pointer' }}>
              Initiate Recovery Process
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
