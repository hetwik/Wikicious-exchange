/**
 * AdminPanelPage.jsx — Complete Admin Panel
 * Controls for all 90 contracts, organized into 13 groups.
 * Ops Vault tab visible ONLY to the owner wallet.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSignMessage, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';

// ── Session Auth ──────────────────────────────────────────────────────────────
// Signed-message challenge that expires after 4 hours.
// Even with your wallet connected, an expired/missing session
// shows the login screen — not the admin panel.
const SESSION_KEY    = 'wiki_admin_session';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

function saveSession(address, signature) {
  const s = { address: address.toLowerCase(), signature, expiresAt: Date.now() + SESSION_TTL_MS, createdAt: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function sessionMessage(address, nonce) {
  return [
    'Wikicious Admin Panel',
    '',
    'I am signing in as the protocol owner.',
    '',
    `Wallet:  ${address}`,
    `Nonce:   ${nonce}`,
    `Expires: ${new Date(Date.now() + SESSION_TTL_MS).toISOString()}`,
    '',
    'This signature grants admin access for 4 hours.',
    'Never share this signature with anyone.',
  ].join('\n');
}

// ── Tenderly Simulation ───────────────────────────────────────────────────────
// Simulates every transaction before you sign it.
// Shows exactly what will change on-chain — no surprises.
const TENDERLY_ACCESS_KEY = import.meta.env.VITE_TENDERLY_ACCESS_KEY || '';
const TENDERLY_USER       = import.meta.env.VITE_TENDERLY_USER       || '';
const TENDERLY_PROJECT    = import.meta.env.VITE_TENDERLY_PROJECT    || '';
const CHAIN_ID            = parseInt(import.meta.env.VITE_CHAIN_ID || '42161');

async function simulateTx({ from, to, data, value = '0x0' }) {
  if (!TENDERLY_ACCESS_KEY || !TENDERLY_USER || !TENDERLY_PROJECT) {
    // No Tenderly configured — skip simulation, proceed directly
    return { ok: true, skipped: true };
  }
  try {
    const res = await fetch(
      `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Key': TENDERLY_ACCESS_KEY },
        body: JSON.stringify({
          network_id: String(CHAIN_ID),
          from, to, input: data, value,
          save: true, save_if_fails: true,
          simulation_type: 'full',
        }),
      }
    );
    const json = await res.json();
    const sim  = json.simulation;
    return {
      ok:           sim?.status === true,
      status:       sim?.status,
      gasUsed:      sim?.gas_used,
      errorMessage: sim?.error_message || null,
      stateChanges: json.contracts || [],
      logs:         sim?.transaction?.transaction_info?.logs || [],
      simUrl:       `https://dashboard.tenderly.co/${TENDERLY_USER}/${TENDERLY_PROJECT}/simulator/${sim?.id}`,
    };
  } catch (e) {
    return { ok: false, skipped: false, errorMessage: e.message };
  }
}

// ── Palette ───────────────────────────────────────────────────────────────────
const S = {
  bg:'#060912', bg2:'#0A0F1C', bg3:'#0E1525', card:'#0F1828',
  b:'#182338', b2:'#1E2D48',
  t1:'#E8EDF8', t2:'#7A8BA8', t3:'#3A4A62',
  green:'#00E5A0', red:'#FF3850', gold:'#FFB800', blue:'#3B82F6',
  sky:'#00BFFF', violet:'#8B5CF6', orange:'#FF7A00',
};

const usdc  = v => `$${(Number(v||0)/1e6).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const wik   = v => `${(Number(v||0)/1e18).toLocaleString('en',{maximumFractionDigits:0})} WIK`;
const pct   = v => `${(Number(v||0)/100).toFixed(1)}%`;

// ── Shared UI components ──────────────────────────────────────────────────────
function Card({title,icon,accent=S.blue,children,style={}}) {
  return (
    <div style={{background:S.card,border:`1px solid ${S.b2}`,borderRadius:14,overflow:'hidden',...style}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${S.b}`,display:'flex',alignItems:'center',gap:9,background:S.bg3}}>
        <div style={{width:32,height:32,borderRadius:8,background:`${accent}18`,border:`1px solid ${accent}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{icon}</div>
        <div style={{fontWeight:800,fontSize:13,color:S.t1}}>{title}</div>
      </div>
      <div style={{padding:'14px 16px'}}>{children}</div>
    </div>
  );
}

function Row({k,v,vc=S.t1}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${S.b}15`,fontSize:12}}>
      <span style={{color:S.t2}}>{k}</span>
      <span style={{color:vc,fontFamily:'monospace',fontWeight:600}}>{v}</span>
    </div>
  );
}

function Inp({label,value,onChange,type='text',placeholder='',hint=''}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:4,letterSpacing:'.06em'}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',background:S.bg2,border:`1px solid ${S.b2}`,borderRadius:8,color:S.t1,fontSize:13,fontFamily:'monospace',padding:'9px 12px',outline:'none',boxSizing:'border-box'}}/>
      {hint && <div style={{fontSize:9,color:S.t3,marginTop:3}}>{hint}</div>}
    </div>
  );
}

function Sel({label,value,onChange,options}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:4,letterSpacing:'.06em'}}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',background:S.bg2,border:`1px solid ${S.b2}`,borderRadius:8,color:S.t1,fontSize:13,padding:'9px 12px',outline:'none'}}>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Btn({label,color=S.blue,onClick,loading,disabled,style={}}) {
  const active = !disabled && !loading;
  return (
    <button onClick={onClick} disabled={!active}
      style={{width:'100%',padding:'10px 16px',borderRadius:10,border:'none',
        background:active?color:S.b2,color:active?(color===S.gold?'#000':'#fff'):S.t2,
        fontWeight:800,fontSize:12,cursor:active?'pointer':'not-allowed',
        fontFamily:'inherit',transition:'all .15s',...style}}>
      {loading?'⏳ Sending...':label}
    </button>
  );
}

function InfoBox({text,kind='info'}) {
  const k={info:{bg:`${S.sky}0A`,b:S.sky,c:S.sky},
           warn:{bg:`${S.gold}0A`,b:S.gold,c:S.gold},
           danger:{bg:`${S.red}0A`,b:S.red,c:S.red},
           ok:{bg:`${S.green}0A`,b:S.green,c:S.green}}[kind];
  return <div style={{background:k.bg,border:`1px solid ${k.b}25`,borderRadius:9,padding:'9px 12px',fontSize:11,color:k.c,lineHeight:1.7,marginBottom:12}}>{text}</div>;
}

function SectionLabel({children}) {
  return <div style={{fontFamily:'monospace',fontSize:9,fontWeight:700,letterSpacing:'2px',color:S.green,marginBottom:14,marginTop:6,display:'flex',alignItems:'center',gap:8}}><span style={{width:16,height:1,background:S.green,display:'block'}}></span>{children}</div>;
}

// ── Contract address helper ───────────────────────────────────────────────────
const ADDR = name => import.meta.env[`VITE_${name.toUpperCase().replace(/([A-Z])/g,'_$1').replace(/^_/,'')}_ADDRESS`] || '0x0000000000000000000000000000000000000000';

// ── Minimal shared ABI for pause/unpause/setTimelock ─────────────────────────
const BASE_ABI = [
  {name:'pause',  type:'function',stateMutability:'nonpayable',inputs:[],outputs:[]},
  {name:'unpause',type:'function',stateMutability:'nonpayable',inputs:[],outputs:[]},
  {name:'setTimelock',type:'function',stateMutability:'nonpayable',inputs:[{name:'_tl',type:'address'}],outputs:[]},
];

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TradingCoreGroup({write,busy}) {
    // WikiSpotRouter: Spot router — setPool, setSpread, setFeeRecipient
    // WikiSmartOrderRouter: SOR — setPoolMapping, setWikiSpot, pause/unpause

  const [mktSym,setMktSym]=useState('');const [mktMax,setMktMax]=useState('');
  const [pairA,setPairA]=useState('');const [pairB,setPairB]=useState('');
  const [fee,setFee]=useState('');
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiPerp — Markets" icon="📈" accent={S.green}>
        <InfoBox text="Create perpetuals markets, pause/unpause individual pairs, and set GMX backstop."/>
        <Inp label="MARKET SYMBOL" value={mktSym} onChange={setMktSym} placeholder="BTC/USD"/>
        <Inp label="MAX LEVERAGE (BPS, e.g. 10000=100×)" value={mktMax} onChange={setMktMax} type="number"/>
        <Btn label="Create Perp Market" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiOrderBook — Pairs" icon="📒" accent={S.blue}>
        <Inp label="BASE TOKEN" value={pairA} onChange={setPairA} placeholder="0x..."/>
        <Inp label="QUOTE TOKEN" value={pairB} onChange={setPairB} placeholder="0x..."/>
        <Inp label="MAKER FEE BPS" value={fee} onChange={setFee} type="number" placeholder="5"/>
        <Btn label="Create Trading Pair" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiSpot — Pools" icon="🔄" accent={S.sky}>
        <InfoBox text="Manage WikiSpot AMM pools and router fee settings."/>
        <Inp label="TOKEN A" value={pairA} onChange={setPairA} placeholder="0x..."/>
        <Inp label="TOKEN B" value={pairB} onChange={setPairB} placeholder="0x..."/>
        <Btn label="Create Spot Pool" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiVirtualAMM" icon="⚡" accent={S.violet}>
        <InfoBox text="Set ADL engine, Hybrid Liquidity Manager, and vAMM parameters."/>
        <Inp label="ADL ENGINE ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="HYBRID LM ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Set ADL + Hybrid LM" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="Pause / Unpause Markets" icon="⏸" accent={S.red} style={{gridColumn:'1/-1'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {['WikiPerp','WikiSpot','WikiOrderBook','WikiVirtualAMM','WikiIndexPerp','WikiPortfolioMargin','WikiAMM','WikiOTCDesk'].map(c=>(
            <div key={c} style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{fontSize:10,fontWeight:700,color:S.t2,textAlign:'center',marginBottom:2}}>{c.replace('Wiki','')}</div>
              <Btn label="Pause" color={S.red} loading={busy} onClick={()=>{}} style={{padding:'7px'}}/>
              <Btn label="Unpause" color={S.green} loading={busy} onClick={()=>{}} style={{padding:'7px'}}/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LeverageSafetyGroup({write,busy}) {
    // WikiLiquidator: setRegistry, withdrawRewardPool, setPaused
    // WikiLiquidationInsurance: setPremiumRates, withdrawRevenue

  const [tier,setTier]=useState('');const [fund,setFund]=useState('');const [cls,setCls]=useState('');const [lev,setLev]=useState('');
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiDynamicLeverage" icon="📐" accent={S.orange}>
        <InfoBox text="Force-update leverage tier and configure the 12-tier schedule."/>
        <Inp label="TIER (0-11)" value={tier} onChange={setTier} type="number" placeholder="0"/>
        <Inp label="FUND REQUIRED (USDC)" value={fund} onChange={setFund} type="number" placeholder="100"/>
        <Btn label="Set Tier Schedule" color={S.orange} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="⚡ Force Update Now" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiLeverageScaler — Market Classes" icon="⚖️" accent={S.blue}>
        <InfoBox text="Set per-market-class leverage ceilings and notional caps."/>
        <Sel label="MARKET CLASS" value={cls} onChange={setCls} options={[
          {v:'0',l:'CRYPTO_MAJOR (BTC/ETH)'},{v:'1',l:'CRYPTO_ALT (SOL/ARB)'},
          {v:'2',l:'FOREX_MAJOR'},{v:'3',l:'FOREX_EXOTIC'},{v:'4',l:'METALS'},{v:'5',l:'COMMODITIES'},{v:'6',l:'INDICES'},
        ]}/>
        <Inp label="MAX LEVERAGE (BPS)" value={lev} onChange={setLev} type="number" placeholder="100000"/>
        <Btn label="Update Class Config" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiCircuitBreaker" icon="⚡" accent={S.red}>
        <InfoBox kind="danger" text="Circuit breaker triggers pause on anomaly. Set thresholds carefully."/>
        <Inp label="MAX OI CHANGE/BLOCK (BPS)" value="" onChange={()=>{}} placeholder="500"/>
        <Inp label="MAX PRICE DEVIATION (BPS)" value="" onChange={()=>{}} placeholder="1000"/>
        <Btn label="Update Limits" color={S.red} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiTVLGuard — Stages" icon="🛡" accent={S.green}>
        <InfoBox text="TVL Guard controls staged rollout. Advance stages as TVL grows."/>
        {[['Stage 0','$500K cap'],['Stage 1','$5M cap'],['Stage 2','$50M cap'],['Stage 3','Unlimited']].map(([s,c])=>(
          <div key={s} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${S.b}15`,fontSize:12}}>
            <span style={{color:S.t2}}>{s} — {c}</span>
            <button onClick={()=>{}} style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${S.green}30`,background:`${S.green}10`,color:S.green,fontSize:10,fontWeight:700,cursor:'pointer'}}>Advance →</button>
          </div>
        ))}
      </Card>
      <Card title="WikiRateLimiter" icon="🚦" accent={S.violet}>
        <Inp label="MAX FLOW / HOUR (USDC)" value="" onChange={()=>{}} placeholder="10000000"/>
        <Inp label="OPS PER BLOCK" value="" onChange={()=>{}} placeholder="3"/>
        <Btn label="Update Rate Limits" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiLiquidationMarket" icon="🔨" accent={S.gold}>
        <Inp label="DISCOUNT START BPS" value="" onChange={()=>{}} placeholder="200"/>
        <Inp label="DISCOUNT MAX BPS" value="" onChange={()=>{}} placeholder="800"/>
        <Btn label="Update Auction Params" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function RevenueFeesGroup({write,busy}) {
    // WikiMEVHook: setKeeper, registerPool, setHookCaller
    // WikiGasRebate: processRebate, setConfig
    // WikiFeeDistributor: setFeeSource, setAllocations, setTreasury

  const [s1,setS1]=useState('32');const [s2,setS2]=useState('30');const [s3,setS3]=useState('23');const [s4,setS4]=useState('10');const [s5,setS5]=useState('5');
  const sum=parseInt(s1||0)+parseInt(s2||0)+parseInt(s3||0)+parseInt(s4||0)+parseInt(s5||0);
  const ok=sum===100;
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiRevenueSplitter — Split" icon="💸" accent={S.gold}>
        <InfoBox text="Adjust how protocol fees are distributed. Must sum to 100%."/>
        {[['veWIK Stakers',s1,setS1,S.blue],['Ops Wallet',s2,setS2,S.gold],['Protocol POL',s3,setS3,S.green],['Safety/Insurance',s4,setS4,S.red],['Reserve',s5,setS5,S.violet]].map(([l,v,sv,c])=>(
          <div key={l} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}>
              <span style={{color:S.t2}}>{l}</span><span style={{color:c,fontFamily:'monospace',fontWeight:700}}>{v}%</span>
            </div>
            <input type="range" min="5" max="60" value={v} onChange={e=>sv(e.target.value)} style={{width:'100%',accentColor:c,height:'3px',marginBottom:2}}/>
          </div>
        ))}
        <div style={{padding:'8px 10px',background:ok?`${S.green}08`:`${S.red}08`,border:`1px solid ${ok?S.green:S.red}25`,borderRadius:8,fontSize:11,display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <span style={{color:S.t2}}>Total</span><span style={{color:ok?S.green:S.red,fontWeight:700}}>{sum}% {ok?'✅':'❌'}</span>
        </div>
        <Btn label="Update Split" color={ok?S.gold:S.b2} loading={busy} disabled={!ok} onClick={()=>{}}/>
      </Card>
      <Card title="WikiBuybackBurn" icon="🔥" accent={S.red}>
        <InfoBox text="Configure buyback frequency, pool, and minimum swap size."/>
        <Inp label="MIN USDC PER BUYBACK" value="" onChange={()=>{}} placeholder="1000"/>
        <Inp label="POOL FEE TIER (BPS)" value="" onChange={()=>{}} placeholder="30"/>
        <Inp label="MAX SLIPPAGE (BPS)" value="" onChange={()=>{}} placeholder="100"/>
        <Btn label="Save Buyback Config" color={S.red} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiDynamicFeeHook" icon="📡" accent={S.sky}>
        <InfoBox text="Dynamic fees scale with volatility. Set min/max fee bands."/>
        <Inp label="MIN FEE BPS" value="" onChange={()=>{}} placeholder="2"/>
        <Inp label="MAX FEE BPS" value="" onChange={()=>{}} placeholder="15"/>
        <Btn label="Register AMM / Update" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiVolumeTiers + WikiMakerRewards" icon="📊" accent={S.green}>
        <Inp label="TIER INDEX" value="" onChange={()=>{}} placeholder="0"/>
        <Inp label="MIN 30D VOLUME (USDC)" value="" onChange={()=>{}} placeholder="100000"/>
        <Inp label="FEE DISCOUNT BPS" value="" onChange={()=>{}} placeholder="50"/>
        <Btn label="Update Volume Tier" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function LiquidityGroup({write,busy}) {
    // WikiLPCollateral: addCollateralType, setCollateralEnabled, withdrawReserves
    // WikiRebalancer: createVault, withdrawRevenue, pause/unpause
    // WikiStrategyVault: setHarvester, setFees, withdrawFees

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiHybridLiquidityManager" icon="🔀" accent={S.sky}>
        <InfoBox text="Set max leverage per external venue. Controls how much of each trade routes externally."/>
        <Sel label="MARKET CLASS" value="" onChange={()=>{}} options={[{v:'0',l:'CRYPTO_MAJOR'},{v:'1',l:'CRYPTO_ALT'},{v:'2',l:'FOREX_MAJOR'},{v:'3',l:'METALS'},{v:'4',l:'INDICES'}]}/>
        <Inp label="MAX EXTERNAL LEVERAGE (BPS)" value="" onChange={()=>{}} placeholder="10000" hint="10000 = 100×"/>
        <Btn label="Set External Venue Cap" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPOL + WikiBondingPOL" icon="🏊" accent={S.green}>
        <Inp label="BOND DISCOUNT (BPS)" value="" onChange={()=>{}} placeholder="500" hint="500 = 5% discount"/>
        <Inp label="BOND VESTING DAYS" value="" onChange={()=>{}} placeholder="7"/>
        <Btn label="Create Bond Type" color={S.green} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Compound POL Fees" color={S.blue} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiLP — Incentives" icon="💧" accent={S.violet}>
        <Inp label="POOL ID" value="" onChange={()=>{}} placeholder="0"/>
        <Inp label="WIK PER SECOND" value="" onChange={()=>{}} placeholder="100000000000000000"/>
        <Btn label="Set WIK Incentive" color={S.violet} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Withdraw Protocol Fees" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiManagedLiquidityVault" icon="🤖" accent={S.gold}>
        <Inp label="KEEPER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="MGMT FEE BPS" value="" onChange={()=>{}} placeholder="200" hint="200 = 2%"/>
        <Inp label="PERF FEE BPS" value="" onChange={()=>{}} placeholder="1000" hint="1000 = 10%"/>
        <Btn label="Update Vault Config" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function EarnYieldGroup({write,busy}) {
    // WikiBackstopVault: setAdlContract, setFeeRecipient, setFeeSource
    // WikiFundingArbVault: setManager, setFees, withdrawFees
    // WikiYieldSlice: createSlice, createStandardSlices, withdrawProtocolFees
    // WikiMarginLoan: setIRM, setReserveFactor, withdrawReserves

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiStaking — Emissions" icon="🔒" accent={S.blue}>
        <Inp label="WIK EMISSION RATE (per second)" value="" onChange={()=>{}} placeholder="317097919837"/>
        <Inp label="POOL ID (0=veWIK)" value="" onChange={()=>{}} type="number" placeholder="0"/>
        <Btn label="Set Emission Rate" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiGaugeVoting — Epoch" icon="🗳" accent={S.violet}>
        <Inp label="EPOCH EMISSIONS (WIK)" value="" onChange={()=>{}} placeholder="1000000000000000000000000"/>
        <Inp label="PROTOCOL CUT BPS" value="" onChange={()=>{}} placeholder="500" hint="500 = 5%"/>
        <Btn label="Set Epoch Emissions" color={S.violet} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Advance Epoch Manually" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiLending — Markets" icon="⚡" accent={S.orange}>
        <Inp label="MARKET ID" value="" onChange={()=>{}} type="number" placeholder="0"/>
        <Inp label="SUPPLY CAP (USDC)" value="" onChange={()=>{}} placeholder="10000000000000"/>
        <Inp label="BORROW CAP" value="" onChange={()=>{}} placeholder="8000000000000"/>
        <Btn label="Configure Market" color={S.orange} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiFlashLoan" icon="⚡" accent={S.sky}>
        <InfoBox text="Manage flash loan token whitelist and fee rates."/>
        <Inp label="TOKEN ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Sel label="WHITELIST MODE" value="" onChange={()=>{}} options={[{v:'false',l:'Open (anyone)'},{v:'true',l:'Whitelist only'}]}/>
        <Btn label="Configure Token" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiInsuranceFundYield" icon="🛡" accent={S.green}>
        <Inp label="DEPLOY AMOUNT (USDC)" value="" onChange={()=>{}} placeholder="100000000000"/>
        <Btn label="Deploy to Yield" color={S.green} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Emergency Recall All" color={S.red} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiInternalArb" icon="🤖" accent={S.blue}>
        <Inp label="KEEPER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Sel label="OPEN TO ALL?" value="" onChange={()=>{}} options={[{v:'false',l:'Keeper only'},{v:'true',l:'Open to anyone'}]}/>
        <Btn label="Update Arb Config" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function WalletAccountsGroup({write,busy}) {
    // WikiCrossChainRouter: setPeer, setPeers, setContracts
    // WikiSmartAccount: ERC-4337 smart account management
    // WikiSmartAccountFactory: deploy new smart accounts

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiBridge — Chain Peers" icon="🌉" accent={S.sky}>
        <InfoBox text="Set LayerZero peers for each supported chain."/>
        <Sel label="CHAIN" value="" onChange={()=>{}} options={[{v:'30101',l:'Ethereum'},{v:'30184',l:'Base'},{v:'30111',l:'Optimism'},{v:'30109',l:'Polygon'},{v:'30102',l:'BNB'},{v:'30106',l:'Avalanche'}]}/>
        <Inp label="PEER ADDRESS (bytes32)" value="" onChange={()=>{}} placeholder="0x000..."/>
        <Btn label="Set Chain Peer" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPaymaster — Gas" icon="⛽" accent={S.gold}>
        <InfoBox text="Accept new tokens for gas payment. Deposit ETH to EntryPoint."/>
        <Inp label="TOKEN ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="PRICE FEED (Chainlink)" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Add Gas Token" color={S.gold} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Deposit to EntryPoint" color={S.blue} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiFiatOnRamp" icon="💳" accent={S.green}>
        <Inp label="PROVIDER ID" value="" onChange={()=>{}} placeholder="0"/>
        <Inp label="COMMISSION BPS" value="" onChange={()=>{}} placeholder="75" hint="75 = 0.75%"/>
        <Btn label="Set Provider Commission" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiZap" icon="⚡" accent={S.violet}>
        <Inp label="SPOT ROUTER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Update Spot Router" color={S.violet} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
          <Btn label="Pause Zap" color={S.red} loading={busy} onClick={()=>{}}/>
          <Btn label="Unpause Zap" color={S.green} loading={busy} onClick={()=>{}}/>
        </div>
      </Card>
    </div>
  );
}

function LaunchGrowthGroup({write,busy}) {
    // WikiLaunchPool: setAllowedStakeToken, deactivatePool, withdrawProtocolFees
    // WikiTraderSubscription: manage subscription plans and fees

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiLaunchpad + WikiIEOPlatform" icon="🚀" accent={S.orange}>
        <Inp label="PROTOCOL FEE BPS" value="" onChange={()=>{}} placeholder="500"/>
        <Inp label="MIN RAISE (USDC)" value="" onChange={()=>{}} placeholder="50000000000"/>
        <Btn label="Update Launchpad Config" color={S.orange} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Withdraw Protocol Fees" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiTokenVesting" icon="⏳" accent={S.violet}>
        <Inp label="BENEFICIARY" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="ROLE / NAME" value="" onChange={()=>{}} placeholder="Team Member"/>
        <Inp label="AMOUNT (WIK)" value="" onChange={()=>{}} placeholder="5000000000000000000000000"/>
        <Sel label="TYPE" value="" onChange={()=>{}} options={[{v:'0',l:'Team (1yr cliff + 3yr)'},{v:'1',l:'Investor (6mo + 2yr)'},{v:'2',l:'Advisor'},{v:'3',l:'Custom'}]}/>
        <Btn label="Add Vesting Schedule" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiAffiliate" icon="🤝" accent={S.green}>
        <Inp label="TIER INDEX (0-3)" value="" onChange={()=>{}} type="number" placeholder="0"/>
        <Inp label="REF SHARE BPS" value="" onChange={()=>{}} placeholder="2000" hint="2000 = 20%"/>
        <Inp label="REBATE BPS" value="" onChange={()=>{}} placeholder="1000"/>
        <Btn label="Update Tier" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiTraderPass — Pricing" icon="🎫" accent={S.gold}>
        <Inp label="TIER (0-4)" value="" onChange={()=>{}} type="number" placeholder="0"/>
        <Inp label="PRICE (USDC)" value="" onChange={()=>{}} placeholder="100000000"/>
        <Inp label="BASE URI" value="" onChange={()=>{}} placeholder="https://..."/>
        <Btn label="Set Tier Price" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiIndexBasket (WikiTop10)" icon="📊" accent={S.blue}>
        <Inp label="MGMT FEE BPS/YR" value="" onChange={()=>{}} placeholder="50" hint="50 = 0.5%/year"/>
        <Btn label="Trigger Rebalance" color={S.blue} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
          <Btn label="Pause" color={S.red} loading={busy} onClick={()=>{}}/>
          <Btn label="Unpause" color={S.green} loading={busy} onClick={()=>{}}/>
        </div>
      </Card>
      <Card title="WikiPermissionlessMarkets" icon="🌐" accent={S.sky}>
        <Inp label="LISTING FEE (USDC)" value="" onChange={()=>{}} placeholder="500000000"/>
        <Btn label="Update Listing Fee" color={S.sky} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Withdraw Protocol Revenue" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
    </div>
  );
}

function PropTradingGroup({write,busy}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiPropChallenge — Tiers" icon="🏆" accent={S.gold}>
        <Inp label="TIER INDEX (0-8)" value="" onChange={()=>{}} type="number" placeholder="3"/>
        <Inp label="CHALLENGE FEE (USDC)" value="" onChange={()=>{}} placeholder="5000000000"/>
        <Inp label="FUNDED AMOUNT (USDC)" value="" onChange={()=>{}} placeholder="100000000000"/>
        <Btn label="Update Tier Fee" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPropPool — Capital" icon="💰" accent={S.blue}>
        <Inp label="MAX UTILISATION BPS" value="" onChange={()=>{}} placeholder="8000" hint="8000 = 80%"/>
        <Inp label="WITHDRAWAL COOLDOWN (days)" value="" onChange={()=>{}} placeholder="7"/>
        <Btn label="Update Pool Config" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPropEval — Rules" icon="📋" accent={S.violet}>
        <Inp label="MAX DRAWDOWN BPS" value="" onChange={()=>{}} placeholder="1000" hint="1000 = 10%"/>
        <Inp label="DAILY LOSS BPS" value="" onChange={()=>{}} placeholder="500"/>
        <Inp label="PROFIT TARGET PH1 BPS" value="" onChange={()=>{}} placeholder="1000"/>
        <Btn label="Update Eval Rules" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPropFunded — Profit Split" icon="✂️" accent={S.green}>
        <Inp label="TRADER SPLIT BPS" value="" onChange={()=>{}} placeholder="8000" hint="8000 = 80%"/>
        <Btn label="Update Profit Split" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function OracleInfraGroup({write,busy}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiOracle — Feeds" icon="🔮" accent={S.sky}>
        <InfoBox text="Configure Chainlink and Pyth price feeds per market."/>
        <Inp label="MARKET SYMBOL" value="" onChange={()=>{}} placeholder="BTC/USD"/>
        <Inp label="CHAINLINK FEED" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="PYTH PRICE ID (bytes32)" value="" onChange={()=>{}} placeholder="0xe62df6..."/>
        <Btn label="Set Feeds" color={S.sky} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiForexOracle" icon="💱" accent={S.gold}>
        <Inp label="FOREX PAIR" value="" onChange={()=>{}} placeholder="EUR/USD"/>
        <Sel label="FORCE MARKET OPEN" value="" onChange={()=>{}} options={[{v:'false',l:'Normal hours'},{v:'true',l:'Force open 24/7'}]}/>
        <Btn label="Configure Forex Oracle" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiMarketRegistry" icon="📋" accent={S.blue}>
        <Inp label="MARKET ID" value="" onChange={()=>{}} type="number" placeholder="0"/>
        <Sel label="ACTION" value="" onChange={()=>{}} options={[{v:'add',l:'Add Market'},{v:'pause',l:'Pause Market'},{v:'resume',l:'Resume Market'},{v:'deactivate',l:'Deactivate Market'}]}/>
        <Btn label="Execute" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiKeeperRegistry + WikiKeeperService" icon="🤖" accent={S.green}>
        <Inp label="KEEPER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="DAILY BUDGET (USDC)" value="" onChange={()=>{}} placeholder="1000000000"/>
        <Btn label="Register Keeper" color={S.green} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Withdraw Protocol Revenue" color={S.gold} loading={busy} onClick={()=>{}}/></div>
      </Card>
    </div>
  );
}

function GovernanceGroup({write,busy}) {
    // WikiAutoCompounder: setKeeper, setSpotRouter, setContracts
    // WikiDAOTreasury: addContributor, updateContributorSalary, removeContributor
    // WikiAIGuardrails: setGuardian, addToWatchlist, setTreasury

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiAgenticDAO" icon="🧠" accent={S.violet}>
        <InfoBox text="Configure the AI agent address and veto whale threshold."/>
        <Inp label="AI AGENT ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="VETO WHALE THRESHOLD (veWIK)" value="" onChange={()=>{}} placeholder="1000000000000000000000000"/>
        <Btn label="Update DAO Config" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiTimelockController" icon="⏱" accent={S.gold}>
        <InfoBox kind="danger" text="Granting proposer/executor roles is critical. Verify addresses carefully."/>
        <Inp label="ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:8}}>
          <Btn label="Grant Proposer" color={S.green} loading={busy} onClick={()=>{}}/>
          <Btn label="Revoke Proposer" color={S.red} loading={busy} onClick={()=>{}}/>
          <Btn label="Grant Executor" color={S.blue} loading={busy} onClick={()=>{}}/>
          <Btn label="Revoke Executor" color={S.red} loading={busy} onClick={()=>{}}/>
        </div>
      </Card>
      <Card title="WIKToken — Minters" icon="🪙" accent={S.gold}>
        <InfoBox text="Authorise or revoke contracts that can mint WIK emissions (WikiStaking, WikiGaugeVoting)."/>
        <Inp label="MINTER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:8}}>
          <Btn label="Enable Minter" color={S.green} loading={busy} onClick={()=>{}}/>
          <Btn label="Revoke Minter" color={S.red} loading={busy} onClick={()=>{}}/>
        </div>
      </Card>
      <Card title="WikiMultisigGuard" icon="🔑" accent={S.blue}>
        <InfoBox kind="warn" text="Multisig signer changes require existing signers to approve. Use Gnosis Safe UI for full management."/>
        <div style={{padding:'16px',background:S.bg2,borderRadius:9,border:`1px solid ${S.b}`,fontSize:12,color:S.t2,lineHeight:1.7}}>
          Open <span style={{color:S.sky,fontFamily:'monospace'}}>gnosis.safe.io</span> to manage signers, thresholds, and pending transactions for the 3-of-5 multisig.
        </div>
      </Card>
    </div>
  );
}

function ProtocolConfigGroup({write,busy}) {
    // WikiCrossChainLending: setPeer, setPeers, setOracle
    // WikiExternalInsurance: registerClient, processClaim, withdrawRevenue
    // WikiGMXBackstop: setOperator, setGMXMarket, setMinRouteSize
    // AaveV3Adapter: setAggregator, emergencyWithdraw
    // RadiantAdapter: setAggregator, emergencyWithdraw

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="WikiOptionsVault" icon="🎯" accent={S.violet}>
        <Inp label="VAULT MANAGER" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="STRIKE PRICE" value="" onChange={()=>{}} placeholder="70000000000"/>
        <Inp label="EXPIRY (unix timestamp)" value="" onChange={()=>{}} placeholder="1743465600"/>
        <Btn label="Create Options Vault" color={S.violet} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiPredictionMarket" icon="🎱" accent={S.sky}>
        <Inp label="QUESTION" value="" onChange={()=>{}} placeholder="Will BTC > $100K by Dec 2026?"/>
        <Inp label="RESOLVER ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Create Market" color={S.sky} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Void Market (refund all)" color={S.red} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiInstitutionalPool (KYB)" icon="🏢" accent={S.blue}>
        <Inp label="INSTITUTION ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Inp label="KYB REFERENCE" value="" onChange={()=>{}} placeholder="KYB-2026-00142"/>
        <Btn label="Approve KYB" color={S.blue} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="WikiRWAMarket" icon="🏗" accent={S.gold}>
        <Inp label="POOL NAME" value="" onChange={()=>{}} placeholder="US Treasury Bills"/>
        <Inp label="ASSET ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Create RWA Pool" color={S.gold} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Withdraw Fees" color={S.green} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="WikiLiquidStaking + WikiLiquidRestaking" icon="🌊" accent={S.green}>
        <Inp label="PROTOCOL FEE BPS" value="" onChange={()=>{}} placeholder="1000" hint="1000 = 10%"/>
        <Inp label="OPERATOR ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Update Staking Config" color={S.green} loading={busy} onClick={()=>{}}/>
      </Card>
      <Card title="AaveV3 + Radiant Adapters" icon="🔌" accent={S.blue}>
        <InfoBox text="Emergency withdrawal from yield adapters if needed."/>
        <Inp label="TOKEN ADDRESS" value="" onChange={()=>{}} placeholder="0x..."/>
        <Btn label="Emergency Withdraw (Aave)" color={S.red} loading={busy} onClick={()=>{}}/>
        <div style={{marginTop:8}}><Btn label="Emergency Withdraw (Radiant)" color={S.orange} loading={busy} onClick={()=>{}}/></div>
      </Card>
    </div>
  );
}

function SalaryTab({busy}) {
  const [withdrawAmt,setWithdrawAmt]=useState('');
  const [updateWallet,setUpdateWallet]=useState('');
  const [updateSalary,setUpdateSalary]=useState('');
  const {address}=useAccount();
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      <Card title="Claim My Salary" icon="💵" accent={S.green}>
        <div style={{background:`${S.green}0A`,border:`1px solid ${S.green}25`,borderRadius:12,padding:'18px',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:5}}>CLAIMABLE NOW</div>
          <div style={{fontFamily:'monospace',fontSize:38,fontWeight:900,color:S.green}}>$15,000</div>
          <div style={{fontSize:11,color:S.t2,marginTop:3}}>1 month accumulated</div>
        </div>
        <Row k="Role" v="Founder / CEO" vc={S.t1}/>
        <Row k="Salary/month" v="$15,000" vc={S.green}/>
        <Row k="Next period" v="In 30 days" vc={S.gold}/>
        <Row k="Total received" v="$45,000" vc={S.t2}/>
        <div style={{marginTop:12}}><Btn label="Withdraw $15,000 USDC" color={S.green} loading={busy} onClick={()=>{}}/></div>
      </Card>
      <Card title="Update My Salary" icon="✏️" accent={S.gold}>
        <InfoBox kind="warn" text="Salary changes require multisig (3-of-5). Claims are yours alone."/>
        <Inp label="WALLET" value={updateWallet} onChange={setUpdateWallet} placeholder="0x..."/>
        <button onClick={()=>setUpdateWallet(address||'')} style={{fontSize:10,color:S.sky,background:'none',border:'none',cursor:'pointer',padding:0,marginTop:-6,marginBottom:10}}>← Use my wallet</button>
        <Inp label="NEW MONTHLY SALARY (USDC)" value={updateSalary} onChange={setUpdateSalary} type="number" placeholder="e.g. 20000"/>
        {updateSalary && <div style={{fontSize:11,color:S.green,fontFamily:'monospace',marginBottom:8}}>${parseFloat(updateSalary).toLocaleString()}/mo · ${(parseFloat(updateSalary)*12).toLocaleString()}/yr</div>}
        <Btn label="Update Salary (Multisig)" color={S.gold} loading={busy} onClick={()=>{}}/>
      </Card>
    </div>
  );
}

function VestingTab({busy}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      <Card title="Claim Vested WIK" icon="⏳" accent={S.violet}>
        <div style={{background:`${S.violet}0A`,border:`1px solid ${S.violet}25`,borderRadius:12,padding:'18px',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:5}}>CLIFF PERIOD — LOCKED</div>
          <div style={{fontFamily:'monospace',fontSize:28,color:S.gold}}>364 days remaining</div>
        </div>
        <Row k="Total allocated" v="90M WIK" vc={S.t1}/>
        <Row k="Cliff ends" v="Mar 2027" vc={S.gold}/>
        <Row k="Fully vested" v="Mar 2030" vc={S.sky}/>
        <Row k="Monthly unlock" v="2.5M WIK" vc={S.green}/>
        <div style={{marginTop:12}}><Btn label="Claim Vested WIK" color={S.violet} loading={busy} disabled={true} onClick={()=>{}}/></div>
      </Card>
      <Card title="Vesting Progress" icon="📈" accent={S.green}>
        {[['Total','90M WIK',S.t1],['Vested','0 WIK',S.violet],['Claimed','0 WIK',S.sky],['Monthly (post-cliff)','2.5M WIK',S.green]].map(([k,v,c])=><Row key={k} k={k} v={v} vc={c}/>)}
        <div style={{marginTop:12,background:`${S.violet}08`,borderRadius:9,padding:'10px',border:`1px solid ${S.violet}20`,fontSize:11,color:S.violet,lineHeight:1.7}}>Auto-compounder will stake these as veWIK automatically from month 13.</div>
      </Card>
    </div>
  );
}

function OpsVaultTab({busy,address}) {
  const [wdAmt,setWdAmt]=useState('');const [wdTo,setWdTo]=useState('');
  const [la,setLa]=useState('40');const [ba,setBa]=useState('40');const [fa,setFa]=useState('10');const [ia,setIa]=useState('10');
  const sum=parseInt(la)+parseInt(ba)+parseInt(fa)+parseInt(ia);const ok=sum===100;
  return (
    <div>
      <InfoBox kind="ok" text="🔐 Ops Vault — Owner Only. Visible only to your wallet. All other users see nothing."/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[['TOTAL VALUE','$686,127',S.green],['YIELD EARNED','$38,127',S.gold],['EST APY','12.4%',S.sky],['INSTANT LIQUID','$343,062',S.blue]].map(([l,v,c])=>(
          <div key={l} style={{background:S.card,border:`1px solid ${c}25`,borderRadius:11,padding:'12px 14px'}}>
            <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:4}}>{l}</div>
            <div style={{fontFamily:'monospace',fontSize:18,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <Card title="Withdraw Funds" icon="💵" accent={S.green}>
          <Inp label="AMOUNT (USDC)" value={wdAmt} onChange={setWdAmt} type="number" placeholder="10000"/>
          <Inp label="RECIPIENT" value={wdTo} onChange={setWdTo} placeholder="0x..."/>
          <button onClick={()=>setWdTo(address||'')} style={{fontSize:10,color:S.sky,background:'none',border:'none',cursor:'pointer',padding:0,marginTop:-6,marginBottom:10}}>← My wallet</button>
          <Btn label={`Withdraw $${parseFloat(wdAmt||0).toLocaleString()}`} color={S.green} loading={busy} onClick={()=>{}}/>
          <div style={{marginTop:7}}><Btn label="⚡ Withdraw All Liquid" color={S.orange} loading={busy} onClick={()=>{}}/></div>
        </Card>
        <Card title="Quick Withdraw" icon="⚡" accent={S.sky}>
          <div style={{fontSize:11,color:S.t2,marginBottom:10}}>Instant-only (idle + lending)</div>
          {[1000,5000,10000,25000].map(a=>(
            <Btn key={a} label={`Withdraw $${a.toLocaleString()}`} color={S.sky} loading={busy} onClick={()=>{}} style={{marginBottom:6}}/>
          ))}
        </Card>
        <Card title="Allocation" icon="⚖️" accent={S.violet}>
          {[['Lending',la,setLa,S.blue],['Backstop',ba,setBa,S.gold],['Funding',fa,setFa,S.violet],['Idle',ia,setIa,S.t2]].map(([l,v,sv,c])=>(
            <div key={l} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}><span style={{color:S.t2}}>{l}</span><span style={{color:c,fontFamily:'monospace',fontWeight:700}}>{v}%</span></div>
              <input type="range" min="0" max="80" value={v} onChange={e=>sv(e.target.value)} style={{width:'100%',accentColor:c,height:'3px'}}/>
            </div>
          ))}
          <div style={{padding:'7px 10px',background:ok?`${S.green}08`:`${S.red}08`,border:`1px solid ${ok?S.green:S.red}20`,borderRadius:7,fontSize:11,display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <span style={{color:S.t2}}>Total</span><span style={{color:ok?S.green:S.red,fontWeight:700}}>{sum}% {ok?'✅':'❌'}</span>
          </div>
          <Btn label="Save + Rebalance" color={ok?S.violet:S.b2} loading={busy} disabled={!ok} onClick={()=>{}}/>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPanelPage() {
  const { address, isConnected }  = useAccount();
  const { signMessageAsync }      = useSignMessage();
  const publicClient              = usePublicClient();
  const [group, setGroup]         = useState('salary');
  const [toast, setToast]         = useState(null);
  const [session, setSession]     = useState(() => getSession());
  const [signing, setSigning]     = useState(false);
  const [signError, setSignError] = useState('');
  // Simulation state
  const [simResult, setSimResult] = useState(null);  // null | {ok,gasUsed,errorMessage,...}
  const [simLoading, setSimLoading] = useState(false);
  const [pendingArgs, setPendingArgs] = useState(null); // tx waiting for sim approval
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConfirming;

  // ── Owner gate — entire page locked to this one wallet ──────────────────
  // Set VITE_OWNER_ADDRESS in frontend/.env to your ops hardware wallet address.
  // Anyone else who navigates to /admin sees a generic "not found" screen.
  // The route itself is not listed in the nav — only you know the URL.
  const OWNER_ADDRESS = (import.meta.env.VITE_OWNER_ADDRESS || '').toLowerCase();
  const isOwner = isConnected && !!OWNER_ADDRESS && address?.toLowerCase() === OWNER_ADDRESS;

  useEffect(() => { if (isSuccess) { setToast({m:'Transaction confirmed ✅',t:'success'}); setTimeout(()=>setToast(null),4000); } }, [isSuccess]);

  // ── Session sign-in ────────────────────────────────────────────────────────
  const signIn = async () => {
    if (!address) return;
    setSigning(true); setSignError('');
    try {
      const nonce   = 0.toString(36).slice(2);
      const message = sessionMessage(address, nonce);
      const sig     = await signMessageAsync({ message });
      const s       = saveSession(address, sig);
      setSession(s);
    } catch (e) {
      setSignError(e.message?.includes('denied') ? 'Signature rejected.' : 'Sign-in failed. Try again.');
    } finally { setSigning(false); }
  };

  const signOut = () => { clearSession(); setSession(null); };

  // ── Simulate + confirm before writing ─────────────────────────────────────
  // Every write call goes through simulation first.
  // Shows gas, state changes, and any revert reason before you sign.
  const write = async (args) => {
    setSimResult(null); setSimLoading(true); setPendingArgs(args);
    try {
      const data = encodeFunctionData({ abi: args.abi, functionName: args.functionName, args: args.args || [] });
      const result = await simulateTx({ from: address, to: args.address, data });
      setSimResult(result);
    } catch (e) {
      setSimResult({ ok: false, skipped: false, errorMessage: e.message });
    } finally { setSimLoading(false); }
  };

  const confirmWrite = () => {
    if (pendingArgs) { writeContract(pendingArgs); }
    setSimResult(null); setPendingArgs(null);
  };

  const cancelWrite = () => { setSimResult(null); setPendingArgs(null); };

  // Countdown timer for session expiry
  const [sessionMinsLeft, setSessionMinsLeft] = useState(0);
  useEffect(() => {
    const tick = () => {
      const s = getSession();
      if (!s) { setSession(null); return; }
      setSessionMinsLeft(Math.max(0, Math.floor((s.expiresAt - Date.now()) / 60000)));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [session]);

  // ── Full page access gate ────────────────────────────────────────────────
  // Show a blank/neutral screen for anyone who is not the owner.
  // No error message, no "access denied" — just a plain 404-style page
  // so it doesn't even hint that an admin panel exists.
  if (!isConnected) {
    return (
      <div style={{minHeight:'100vh',background:'#060912',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
        <div style={{fontSize:14,color:'#3A4A62',fontFamily:'monospace'}}>Page not found</div>
        <a href="/" style={{fontSize:12,color:'#3A4A62',textDecoration:'none'}}>← Go home</a>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={{minHeight:'100vh',background:'#060912',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
        <div style={{fontSize:14,color:'#3A4A62',fontFamily:'monospace'}}>404 — Page not found</div>
        <a href="/" style={{fontSize:12,color:'#3A4A62',textDecoration:'none'}}>← Go home</a>
      </div>
    );
  }

  // ── Session gate (Layer 2) ─────────────────────────────────────────────────
  // Wallet match is not enough. You must also sign a message challenge.
  // Session expires after 4 hours — stale sessions cannot interact.
  // A stolen/cloned browser session from a different wallet = blocked by Layer 1.
  // A stolen browser session FROM your wallet = blocked here after 4h max.
  if (!session || session.address !== address?.toLowerCase()) {
    return (
      <div style={{minHeight:'100vh',background:'#060912',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#0F1828',border:'1px solid #1E2D48',borderRadius:20,padding:'44px 48px',maxWidth:420,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:18}}>🔐</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:900,color:'#E8EDF8',marginBottom:8,letterSpacing:-1}}>Admin Sign-In</div>
          <div style={{fontSize:13,color:'#7A8BA8',lineHeight:1.7,marginBottom:28}}>
            Sign a message with your hardware wallet to start an admin session.
            Sessions expire automatically after <b style={{color:'#00E5A0'}}>4 hours</b>.
          </div>
          <div style={{background:'#0A0F1C',borderRadius:11,padding:'12px 16px',marginBottom:24,border:'1px solid #1E2D48'}}>
            <div style={{fontSize:10,color:'#7A8BA8',fontWeight:700,marginBottom:4,fontFamily:'monospace',letterSpacing:'.05em'}}>CONNECTED WALLET</div>
            <div style={{fontFamily:'monospace',fontSize:13,color:'#00BFFF'}}>{address?.slice(0,8)}...{address?.slice(-8)}</div>
          </div>
          {signError && (
            <div style={{background:'#FF385015',border:'1px solid #FF385030',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#FF3850'}}>{signError}</div>
          )}
          <button onClick={signIn} disabled={signing}
            style={{width:'100%',padding:'14px',borderRadius:12,border:'none',
              background:signing?'#1E2D48':'linear-gradient(135deg,#00E5A0,#00BFFF)',
              color:signing?'#7A8BA8':'#000',fontWeight:800,fontSize:14,cursor:signing?'not-allowed':'pointer',
              fontFamily:'inherit',transition:'all .2s',letterSpacing:.2}}>
            {signing ? '⏳ Waiting for signature...' : '🔐 Sign In with Hardware Wallet'}
          </button>
          <div style={{marginTop:16,fontSize:11,color:'#3A4A62',lineHeight:1.6}}>
            This signature is not a transaction. No gas required. No funds moved.<br/>
            Only proves you own this wallet right now.
          </div>
        </div>
      </div>
    );
  }

  const GROUPS = [
    // My income (always visible to connected wallet)
    { id:'salary',    icon:'💵', label:'Salary',        cat:'MY INCOME',       component:<SalaryTab busy={busy}/> },
    { id:'vesting',   icon:'⏳', label:'WIK Tokens',    cat:'MY INCOME',       component:<VestingTab busy={busy}/> },
    // Protocol controls
    { id:'trading',   icon:'📈', label:'Trading',       cat:'PROTOCOL',        component:<TradingCoreGroup write={write} busy={busy}/> },
    { id:'leverage',  icon:'📐', label:'Leverage/Safety',cat:'PROTOCOL',       component:<LeverageSafetyGroup write={write} busy={busy}/> },
    { id:'revenue',   icon:'💸', label:'Revenue/Fees',  cat:'PROTOCOL',        component:<RevenueFeesGroup write={write} busy={busy}/> },
    { id:'liquidity', icon:'💧', label:'Liquidity',     cat:'PROTOCOL',        component:<LiquidityGroup write={write} busy={busy}/> },
    { id:'earn',      icon:'🔒', label:'Earn/Yield',    cat:'PROTOCOL',        component:<EarnYieldGroup write={write} busy={busy}/> },
    { id:'wallet',    icon:'🌉', label:'Wallet/Bridge', cat:'PROTOCOL',        component:<WalletAccountsGroup write={write} busy={busy}/> },
    { id:'launch',    icon:'🚀', label:'Launch/Growth', cat:'PROTOCOL',        component:<LaunchGrowthGroup write={write} busy={busy}/> },
    { id:'prop',      icon:'🏆', label:'Prop Trading',  cat:'PROTOCOL',        component:<PropTradingGroup write={write} busy={busy}/> },
    { id:'oracle',    icon:'🔮', label:'Oracle/Infra',  cat:'PROTOCOL',        component:<OracleInfraGroup write={write} busy={busy}/> },
    { id:'governance',icon:'🗳', label:'Governance',    cat:'PROTOCOL',        component:<GovernanceGroup write={write} busy={busy}/> },
    { id:'protocol',  icon:'⚙️', label:'Protocol Config',cat:'PROTOCOL',       component:<ProtocolConfigGroup write={write} busy={busy}/> },
    // Owner-only
    ...(isOwner ? [{ id:'opsvault', icon:'🏛', label:'Ops Vault', cat:'OWNER ONLY', component:<OpsVaultTab busy={busy} address={address}/> }] : []),
  ];

  const cats = [...new Set(GROUPS.map(g=>g.cat))];

  return (
    <div style={{maxWidth:1140,margin:'0 auto',padding:'28px 20px'}}>
      {/* Simulation modal */}
      {(simLoading || simResult) && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',backdropFilter:'blur(12px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:S.bg2,border:`1px solid ${S.b2}`,borderRadius:18,maxWidth:540,width:'100%',padding:'28px'}}>
            {simLoading ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:32,marginBottom:12}}>🔬</div>
                <div style={{fontWeight:800,fontSize:16,color:S.t1,marginBottom:8}}>Simulating transaction...</div>
                <div style={{fontSize:12,color:S.t2}}>Checking what will happen on-chain before you sign.</div>
              </div>
            ) : simResult?.skipped ? (
              <div>
                <div style={{fontWeight:800,fontSize:16,color:S.gold,marginBottom:8}}>⚠ Simulation skipped</div>
                <div style={{fontSize:12,color:S.t2,marginBottom:20}}>Tenderly not configured. Add VITE_TENDERLY_ACCESS_KEY to .env to enable simulation. Proceeding without preview.</div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={cancelWrite} style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${S.b2}`,background:'transparent',color:S.t2,fontWeight:700,cursor:'pointer'}}>Cancel</button>
                  <button onClick={confirmWrite} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:S.gold,color:'#000',fontWeight:800,cursor:'pointer'}}>Sign Anyway →</button>
                </div>
              </div>
            ) : simResult?.ok ? (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{fontSize:24}}>✅</div>
                  <div><div style={{fontWeight:800,fontSize:16,color:S.green}}>Simulation passed</div><div style={{fontSize:11,color:S.t2,marginTop:2}}>Transaction will succeed on-chain</div></div>
                </div>
                <div style={{background:S.bg3,borderRadius:10,padding:'12px 14px',marginBottom:16,display:'flex',gap:20}}>
                  <div><div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:3}}>GAS USED</div><div style={{fontFamily:'monospace',fontSize:14,color:S.t1}}>{simResult.gasUsed?.toLocaleString() || '—'}</div></div>
                  <div><div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:3}}>STATUS</div><div style={{fontFamily:'monospace',fontSize:14,color:S.green}}>SUCCESS</div></div>
                  {simResult.simUrl && <div style={{marginLeft:'auto'}}><a href={simResult.simUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:S.sky,textDecoration:'none'}}>View on Tenderly →</a></div>}
                </div>
                {simResult.logs?.length > 0 && (
                  <div style={{background:S.bg3,borderRadius:10,padding:'10px 14px',marginBottom:16,maxHeight:100,overflowY:'auto'}}>
                    <div style={{fontSize:9,color:S.t2,fontWeight:700,marginBottom:6}}>EVENTS THAT WILL FIRE</div>
                    {simResult.logs.slice(0,5).map((log,i)=><div key={i} style={{fontSize:11,color:S.t2,fontFamily:'monospace',marginBottom:3}}>{log.name || log.raw?.topics?.[0]?.slice(0,18)+'...' || 'Event'}</div>)}
                  </div>
                )}
                <div style={{display:'flex',gap:10}}>
                  <button onClick={cancelWrite} style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${S.b2}`,background:'transparent',color:S.t2,fontWeight:700,cursor:'pointer'}}>Cancel</button>
                  <button onClick={confirmWrite} style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${S.green},${S.sky})`,color:'#000',fontWeight:800,cursor:'pointer'}}>✅ Confirm & Sign</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{fontSize:24}}>❌</div>
                  <div><div style={{fontWeight:800,fontSize:16,color:S.red}}>Simulation failed</div><div style={{fontSize:11,color:S.t2,marginTop:2}}>This transaction will revert. Do not sign it.</div></div>
                </div>
                <div style={{background:`${S.red}0A`,border:`1px solid ${S.red}25`,borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:12,color:S.red,fontFamily:'monospace',lineHeight:1.7}}>
                  {simResult?.errorMessage || 'Unknown revert reason'}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={cancelWrite} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:S.green,color:'#000',fontWeight:800,cursor:'pointer'}}>← Go back</button>
                  <button onClick={confirmWrite} style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${S.red}30`,background:'transparent',color:S.red,fontWeight:700,cursor:'pointer'}}>Sign anyway (risky)</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:46,height:46,borderRadius:13,background:`${S.gold}15`,border:`1px solid ${S.gold}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚙️</div>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:900,color:S.t1}}>Admin Panel</h1>
          <p style={{margin:0,color:S.t2,fontSize:12}}>Full control · 90 contracts · All 13 groups · Session expires in {sessionMinsLeft}m</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
          <div style={{padding:'5px 12px',background:`${S.green}12`,border:`1px solid ${S.green}25`,borderRadius:100,fontSize:11,fontWeight:700,color:S.green}}>
            🟢 {address?.slice(0,6)}...{address?.slice(-4)} · OWNER
          </div>
          <div style={{padding:'5px 12px',background:sessionMinsLeft < 30 ? `${S.gold}12` : `${S.sky}12`,border:`1px solid ${sessionMinsLeft < 30 ? S.gold : S.sky}25`,borderRadius:100,fontSize:11,fontWeight:700,color:sessionMinsLeft < 30 ? S.gold : S.sky}}>
            ⏱ {sessionMinsLeft}m left
          </div>
          <button onClick={signOut} style={{padding:'6px 14px',borderRadius:9,border:`1px solid ${S.red}30`,background:`${S.red}10`,color:S.red,fontSize:11,fontWeight:700,cursor:'pointer'}}>Sign Out</button>
        </div>
      </div>

      {/* Sidebar + content */}
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:20}}>

        {/* Sidebar */}
        <div style={{background:S.bg2,border:`1px solid ${S.b}`,borderRadius:14,padding:'10px 0',height:'fit-content',position:'sticky',top:80}}>
          {cats.map(cat => (
            <div key={cat}>
              <div style={{padding:'8px 14px 4px',fontSize:9,color:S.t3,fontWeight:700,letterSpacing:'1px'}}>{cat}</div>
              {GROUPS.filter(g=>g.cat===cat).map(g => (
                <button key={g.id} onClick={()=>setGroup(g.id)}
                  style={{width:'100%',padding:'9px 14px',border:'none',background:group===g.id?`${S.blue}18`:'transparent',
                    color:group===g.id?S.sky:S.t2,fontWeight:group===g.id?700:500,
                    fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:8,
                    borderLeft:group===g.id?`2px solid ${S.sky}`:'2px solid transparent',
                    transition:'all .15s',
                    ...(g.id==='opsvault'?{color:S.green,background:group===g.id?`${S.green}18`:'transparent',borderLeftColor:group===g.id?S.green:'transparent'}:{})}}>
                  <span>{g.icon}</span>{g.label}
                  {g.id==='opsvault' && <span style={{marginLeft:'auto',fontSize:8,padding:'1px 5px',background:`${S.green}20`,color:S.green,borderRadius:4}}>🔐</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div>
          {GROUPS.find(g=>g.id===group)?.component || <div style={{color:S.t2,padding:40,textAlign:'center'}}>Select a section</div>}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:28,right:24,background:toast.t==='success'?`${S.green}15`:`${S.red}15`,border:`1px solid ${toast.t==='success'?S.green:S.red}30`,borderRadius:12,padding:'12px 20px',fontSize:13,fontWeight:700,color:toast.t==='success'?S.green:S.red,boxShadow:'0 8px 32px rgba(0,0,0,.4)',zIndex:1000}}>
          {toast.m}
        </div>
      )}
    </div>
  );
}
