import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useMarkets } from '../hooks/useApi';
import { CONTRACTS } from '../config';

const S = { bg:'#030810', bg2:'#0B1525', bg3:'#091220', b1:'#0E1E35', b2:'#152840',
  t1:'#E8F4FF', t2:'#4E6E90', t3:'#1E3250', G:'#00F0A8', B:'#0075FF', V:'#7C4FFF', A:'#FFB020', R:'#FF2D55' };

const BOT_TYPES   = ['Grid','DCA','Trend Follow','Mean Reversion','Custom'];
const BOT_COLORS  = [S.G, S.B, S.A, S.V, S.t2];

const BOT_FACTORY_ABI = [
  { name:'createBot', type:'function', inputs:[
    {name:'name',type:'string'},{name:'description',type:'string'},{name:'botType',type:'uint8'},
    {name:'perfFeeBps',type:'uint256'},{name:'mgmtFeeBps',type:'uint256'},
    {name:'maxLeverage',type:'uint256'},{name:'maxDrawdownBps',type:'uint256'},
    {name:'marketId',type:'bytes32'},{name:'isPublic',type:'bool'}
  ], outputs:[{name:'botId',type:'uint256'}] },
  { name:'deposit',   type:'function', inputs:[{name:'botId',type:'uint256'},{name:'amount',type:'uint256'}], outputs:[] },
  { name:'withdraw',  type:'function', inputs:[{name:'botId',type:'uint256'},{name:'shares',type:'uint256'}], outputs:[] },
  { name:'setBotStatus', type:'function', inputs:[{name:'botId',type:'uint256'},{name:'status',type:'uint8'}], outputs:[] },
  { name:'canCreateBot', type:'function', stateMutability:'view', inputs:[{name:'user',type:'address'}], outputs:[{type:'bool'}] },
  { name:'getUserBots', type:'function', stateMutability:'view', inputs:[{name:'user',type:'address'}], outputs:[{type:'uint256[]'}] },
  { name:'MAX_BOTS_PER_USER', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint256'}] },
];

export default function UserBotPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab]         = useState('marketplace');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name:'', description:'', botType:0, perfFeeBps:1000,
    mgmtFeeBps:50, maxLeverage:10, maxDrawdownBps:1000,
    market:'BTCUSDT', isPublic:true,
  });
  const [depositAmt, setDepositAmt] = useState('');
  const [selectedBot, setSelectedBot] = useState(null);

  const { data: markets = [] } = useMarkets();
  const { data: canCreate }    = useReadContract({ address: CONTRACTS.WikiUserBotFactory, abi: BOT_FACTORY_ABI, functionName:'canCreateBot', args:[address||'0x0'], query:{enabled:!!address} });
  const { data: myBotIds = [] } = useReadContract({ address: CONTRACTS.WikiUserBotFactory, abi: BOT_FACTORY_ABI, functionName:'getUserBots', args:[address||'0x0'], query:{enabled:!!address} });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleCreate() {
    if (!isConnected) return;
    const marketId = '0x' + Buffer.from(form.market).toString('hex').padEnd(64,'0');
    writeContract({
      address: CONTRACTS.WikiUserBotFactory,
      abi: BOT_FACTORY_ABI,
      functionName: 'createBot',
      args: [form.name, form.description, form.botType, form.perfFeeBps,
             form.mgmtFeeBps, form.maxLeverage, form.maxDrawdownBps, marketId, form.isPublic]
    });
  }

  function handleDeposit(botId) {
    if (!isConnected || !depositAmt) return;
    const { parseUnits } = require('viem');
    writeContract({
      address: CONTRACTS.WikiUserBotFactory,
      abi: BOT_FACTORY_ABI,
      functionName: 'deposit',
      args: [botId, parseUnits(depositAmt, 6)]
    });
  }

  // Sample marketplace bots (real data comes from contract events)
  const sampleBots = [
    { id:1, name:'Wiki Grid Pro', type:0, creator:'0x1234...5678', perfFee:'15%', mgmtFee:'0.5%', leverage:5, drawdown:'10%', market:'BTC/USD', tvl:'$284K', return30d:'+12.4%', investors:142, status:0 },
    { id:2, name:'DCA Accumulator', type:1, creator:'0xabcd...ef01', perfFee:'10%', mgmtFee:'0%', leverage:1, drawdown:'20%', market:'ETH/USD', tvl:'$98K', return30d:'+8.1%', investors:67, status:0 },
    { id:3, name:'Trend Follower V2', type:2, creator:'0x5678...9abc', perfFee:'20%', mgmtFee:'1%', leverage:10, drawdown:'15%', market:'SOL/USD', tvl:'$52K', return30d:'+21.7%', investors:34, status:0 },
    { id:4, name:'Mean Rev BTC', type:3, creator:'0xbeef...cafe', perfFee:'25%', mgmtFee:'0.5%', leverage:3, drawdown:'8%', market:'BTC/USD', tvl:'$31K', return30d:'+6.8%', investors:19, status:0 },
  ];

  return (
    <div style={{ padding:16, background:S.bg, minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:900, color:S.t1 }}>🤖 Bot Marketplace</div>
        <div style={{ fontSize:12, color:S.t2 }}>Create your own bot · Max 5 per wallet · Earn fees when others deposit</div>
        {isConnected && (
          <button onClick={()=>setShowCreate(!showCreate)} disabled={canCreate===false}
            style={{ marginLeft:'auto', padding:'8px 18px', borderRadius:10, border:'none',
              background: canCreate===false ? S.bg3 : S.G, color: canCreate===false ? S.t2 : '#000',
              fontWeight:800, fontSize:12, cursor: canCreate===false ? 'not-allowed' : 'pointer' }}>
            {canCreate===false ? 'Max 5 bots reached' : '+ Create Your Bot'}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[['BOTS LIVE','247',S.G],['TOTAL TVL','$2.8M',S.A],['AVG 30D RETURN','+14.2%',S.G],['BOT CREATORS','89',S.B]].map(([l,v,c])=>(
          <div key={l} style={{ background:S.bg2, border:`1px solid ${S.b1}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:8, color:S.t2, fontWeight:700, marginBottom:4 }}>{l}</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:18, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Create Bot Form */}
      {showCreate && (
        <div style={{ background:S.bg2, border:`1px solid ${S.B}30`, borderRadius:14, padding:18, marginBottom:14 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800, color:S.B, marginBottom:14 }}>Configure Your Bot</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[['Bot Name (max 50 chars)', 'name', 'text', 'e.g. BTC Grid Pro'],
              ['Description', 'description', 'text', 'Describe your strategy'],].map(([lbl,key,type,ph])=>(
              <div key={key} style={{ gridColumn: key==='description'?'span 2':'auto' }}>
                <div style={{ fontSize:9, color:S.t2, fontWeight:700, marginBottom:5 }}>{lbl.toUpperCase()}</div>
                <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                  placeholder={ph} type={type}
                  style={{ width:'100%', background:S.bg3, border:`1px solid ${S.b2}`, borderRadius:9, padding:'9px 12px', color:S.t1, fontSize:13, boxSizing:'border-box' }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize:9, color:S.t2, fontWeight:700, marginBottom:5 }}>BOT TYPE</div>
              <select value={form.botType} onChange={e=>setForm({...form,botType:Number(e.target.value)})}
                style={{ width:'100%', background:S.bg3, border:`1px solid ${S.b2}`, borderRadius:9, padding:'9px 12px', color:S.t1, fontSize:13 }}>
                {BOT_TYPES.map((t,i)=><option key={i} value={i}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9, color:S.t2, fontWeight:700, marginBottom:5 }}>PRIMARY MARKET</div>
              <select value={form.market} onChange={e=>setForm({...form,market:e.target.value})}
                style={{ width:'100%', background:S.bg3, border:`1px solid ${S.b2}`, borderRadius:9, padding:'9px 12px', color:S.t1, fontSize:13 }}>
                {markets.slice(0,30).map(m=><option key={m.id} value={m.symbol}>{m.symbol}</option>)}
              </select>
            </div>
            {[['PERFORMANCE FEE (0–30%)','perfFeeBps',3000,'%',100],
              ['MANAGEMENT FEE (0–2%)','mgmtFeeBps',200,'%/yr',1],
              ['MAX LEVERAGE (1–125)','maxLeverage',125,'×',1],
              ['MAX DRAWDOWN BEFORE PAUSE','maxDrawdownBps',5000,'bps',100]].map(([lbl,key,max,unit,step])=>(
              <div key={key}>
                <div style={{ fontSize:9, color:S.t2, fontWeight:700, marginBottom:5 }}>{lbl}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="number" min={0} max={max} step={step} value={form[key]}
                    onChange={e=>setForm({...form,[key]:Number(e.target.value)})}
                    style={{ flex:1, background:S.bg3, border:`1px solid ${S.b2}`, borderRadius:9, padding:'9px 12px', color:S.t1, fontSize:13 }} />
                  <span style={{ color:S.t2, fontSize:11 }}>{unit}</span>
                </div>
                <div style={{ fontSize:9, color:S.t2, marginTop:3 }}>
                  {key==='perfFeeBps' && `You earn ${(form.perfFeeBps/100).toFixed(1)}% of all profits`}
                  {key==='mgmtFeeBps' && `Annual: ${(form.mgmtFeeBps/100).toFixed(2)}% of deposited capital`}
                </div>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:S.bg3, borderRadius:10, border:`1px solid ${S.b2}` }}>
              <input type="checkbox" checked={form.isPublic} onChange={e=>setForm({...form,isPublic:e.target.checked})} id="pub" />
              <label htmlFor="pub" style={{ fontSize:12, color:S.t1, cursor:'pointer' }}>List in public marketplace (others can deposit)</label>
            </div>
          </div>
          <div style={{ marginTop:14, padding:'10px 14px', background:S.bg3, borderRadius:10, border:`1px solid ${S.A}25`, fontSize:11, color:S.t2 }}>
            💡 You earn <span style={{ color:S.A }}>{(form.perfFeeBps/100).toFixed(1)}% of profits</span> + <span style={{ color:S.A }}>{(form.mgmtFeeBps/100).toFixed(2)}%/yr management fee</span>. Protocol takes 5% of your fee. Your keeper bot (or Wikicious keeper) executes trades based on your strategy parameters.
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button onClick={handleCreate} disabled={isPending || !form.name}
              style={{ flex:1, padding:13, borderRadius:11, border:'none', background: isPending?S.bg3:S.G, color:'#000', fontWeight:800, fontSize:13, cursor:'pointer' }}>
              {isPending ? 'Creating…' : 'Deploy Bot On-Chain →'}
            </button>
            <button onClick={()=>setShowCreate(false)}
              style={{ padding:'13px 20px', borderRadius:11, border:`1px solid ${S.b2}`, background:'transparent', color:S.t2, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
          {isSuccess && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(0,240,168,.1)', borderRadius:9, fontSize:12, color:S.G }}>✅ Bot deployed! It will appear in your dashboard after the next block.</div>}
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display:'flex', gap:4, background:'rgba(6,8,15,.6)', padding:3, borderRadius:11, marginBottom:14, width:'fit-content' }}>
        {[['marketplace','🌐 Marketplace'],['mybots','🤖 My Bots'],['invested','💰 My Investments']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:tab===t?S.bg2:'transparent', color:tab===t?S.t1:S.t2, fontWeight:700, fontSize:12, cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {/* Bot cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
        {sampleBots.map(bot=>{
          const typeColor = BOT_COLORS[bot.type];
          return (
            <div key={bot.id} style={{ background:S.bg2, border:`1px solid ${typeColor}25`, borderRadius:14, padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${typeColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                  {['📊','📉','📈','↔️','⚙️'][bot.type]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:S.t1 }}>{bot.name}</div>
                  <div style={{ fontSize:10, color:S.t2 }}>{BOT_TYPES[bot.type]} · {bot.market} · {bot.leverage}× max</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, fontWeight:700, color:S.G }}>{bot.return30d}</div>
                  <div style={{ fontSize:9, color:S.t2 }}>30d return</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
                {[['TVL',bot.tvl,S.A],['Perf Fee',bot.perfFee,typeColor],['Investors',bot.investors,S.B]].map(([l,v,c])=>(
                  <div key={l} style={{ background:S.bg3, borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:8, color:S.t2, fontWeight:700 }}>{l}</div>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={selectedBot===bot.id?depositAmt:''} onChange={e=>{setSelectedBot(bot.id);setDepositAmt(e.target.value);}}
                  placeholder="Amount (USDC)" type="number" min="10"
                  style={{ flex:1, background:S.bg3, border:`1px solid ${S.b2}`, borderRadius:9, padding:'8px 12px', color:S.t1, fontSize:12 }} />
                <button onClick={()=>handleDeposit(bot.id)} disabled={isPending || !depositAmt || selectedBot!==bot.id}
                  style={{ padding:'8px 16px', borderRadius:9, border:'none', background:typeColor, color:'#000', fontWeight:800, fontSize:12, cursor:'pointer' }}>
                  Deposit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div style={{ marginTop:20, padding:16, background:S.bg2, border:`1px solid ${S.b1}`, borderRadius:14 }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, color:S.t1, marginBottom:10 }}>How User Bots Work</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[['1️⃣','Create','Set your strategy params: type, market, leverage, fees. Deploy on-chain. Max 5 bots per wallet.'],
            ['2️⃣','Configure','Your keeper (or Wikicious keeper) reads your config and executes trades automatically.'],
            ['3️⃣','Investors','Others deposit USDC into your public bot. Your strategy trades their capital too.'],
            ['4️⃣','Earn','You earn your performance fee on every profitable withdrawal. Protocol takes 5% of your fee.']
          ].map(([ico,t,d])=>(
            <div key={t} style={{ padding:12, background:S.bg3, borderRadius:11, border:`1px solid ${S.b2}`, textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{ico}</div>
              <div style={{ fontSize:12, fontWeight:700, color:S.G, marginBottom:4 }}>{t}</div>
              <div style={{ fontSize:10, color:S.t2, lineHeight:1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
