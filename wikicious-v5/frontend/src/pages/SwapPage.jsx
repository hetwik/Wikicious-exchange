import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

const TOKENS = [
  { symbol:'USDC',  name:'USD Coin',        color:'#2775CA', icon:'💵', decimals:6,  addr:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { symbol:'WETH',  name:'Wrapped Ether',   color:'#627EEA', icon:'Ξ',  decimals:18, addr:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
  { symbol:'WBTC',  name:'Wrapped Bitcoin', color:'#F7931A', icon:'₿',  decimals:8,  addr:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  { symbol:'ARB',   name:'Arbitrum',        color:'#2D374B', icon:'A',  decimals:18, addr:'0x912CE59144191C1204E64559FE8253a0e49E6548' },
  { symbol:'WIK',   name:'Wikicious Token', color:'#5B7FFF', icon:'W',  decimals:18, addr:'' },
  { symbol:'LINK',  name:'Chainlink',       color:'#2A5ADA', icon:'⬡',  decimals:18, addr:'0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  { symbol:'UNI',   name:'Uniswap',         color:'#FF007A', icon:'🦄', decimals:18, addr:'0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { symbol:'GMX',   name:'GMX',             color:'#03D1CF', icon:'G',  decimals:18, addr:'0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a' },
];

const POOLS = [
  { id:0, from:'WETH',  to:'USDC',  rate:3482.40, fee:'0.05%',  liquidity:'$8.4M',  impact:'0.02%' },
  { id:1, from:'WBTC',  to:'USDC',  rate:67284.0, fee:'0.05%',  liquidity:'$12.1M', impact:'0.01%' },
  { id:2, from:'ARB',   to:'USDC',  rate:1.182,   fee:'0.30%',  liquidity:'$2.8M',  impact:'0.08%' },
  { id:3, from:'WIK',   to:'USDC',  rate:0.284,   fee:'0.30%',  liquidity:'$1.2M',  impact:'0.12%' },
  { id:4, from:'LINK',  to:'USDC',  rate:9.864,   fee:'0.30%',  liquidity:'$1.8M',  impact:'0.06%' },
  { id:5, from:'WETH',  to:'WBTC',  rate:0.0518,  fee:'0.05%',  liquidity:'$4.2M',  impact:'0.03%' },
  { id:6, from:'ARB',   to:'WETH',  rate:0.000339,fee:'0.30%',  liquidity:'$1.4M',  impact:'0.10%' },
  { id:7, from:'GMX',   to:'USDC',  rate:28.62,   fee:'0.30%',  liquidity:'$0.8M',  impact:'0.18%' },
];

const S = { bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060' };

function TokenSelector({ value, onChange, exclude, label }) {
  const [open, setOpen] = useState(false);
  const tok = TOKENS.find(t => t.symbol === value) || TOKENS[0];
  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
        background:S.s2, border:`1px solid ${S.b}`, borderRadius:9,
        cursor:'pointer', color:S.t1, fontWeight:800, fontSize:13
      }}>
        <span style={{ fontSize:18 }}>{tok.icon}</span>
        <span>{tok.symbol}</span>
        <span style={{ color:S.t3, fontSize:11 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:100,
          background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, minWidth:200,
          boxShadow:'0 12px 40px #00000080' }}>
          {TOKENS.filter(t => t.symbol !== exclude).map(t => (
            <div key={t.symbol} onClick={() => { onChange(t.symbol); setOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                cursor:'pointer', borderBottom:`1px solid ${S.b}30`,
                background:'transparent', transition:'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = S.s2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:12, color:S.t1 }}>{t.symbol}</div>
                <div style={{ fontSize:10, color:S.t3 }}>{t.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SwapPage() {
  const { address } = useAccount();
  const [fromToken, setFromToken] = useState('WETH');
  const [toToken,   setToToken]   = useState('USDC');
  const [fromAmt,   setFromAmt]   = useState('');
  const [slippage,  setSlippage]  = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);

  const pool = POOLS.find(p =>
    (p.from === fromToken && p.to === toToken) ||
    (p.from === toToken   && p.to === fromToken)
  );

  const rate = pool ? (pool.from === fromToken ? pool.rate : 1 / pool.rate) : null;
  const toAmt = rate && fromAmt ? (parseFloat(fromAmt) * rate).toFixed(6) : '';
  const priceImpact = pool?.impact || '—';
  const fee = pool?.fee || '0.30%';
  const minReceived = toAmt ? (parseFloat(toAmt) * (1 - parseFloat(slippage)/100)).toFixed(6) : '';

  const flip = () => { setFromToken(toToken); setToToken(fromToken); };

  return (
    <AppLayout>
      <div style={{ maxWidth:440, margin:'40px auto', padding:'0 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:S.t1 }}>Swap</h2>
            <div style={{ fontSize:11, color:S.t3 }}>Trade any token instantly on WikiAMM</div>
          </div>
          <button onClick={() => setShowSettings(s => !s)} style={{
            width:36, height:36, borderRadius:9, background:S.s2, border:`1px solid ${S.b}`,
            cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center'
          }}>⚙️</button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, padding:16, marginBottom:14 }}>
            <div style={{ fontSize:11, color:S.t2, fontWeight:700, marginBottom:10 }}>SLIPPAGE TOLERANCE</div>
            <div style={{ display:'flex', gap:6 }}>
              {['0.1','0.5','1.0'].map(v => (
                <button key={v} onClick={() => setSlippage(v)} style={{
                  padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
                  fontWeight:700, fontSize:11, fontFamily:'monospace',
                  background: slippage===v ? S.a : S.s2, color: slippage===v ? '#fff' : S.t3
                }}>{v}%</button>
              ))}
              <input value={slippage} onChange={e => setSlippage(e.target.value)} placeholder="Custom"
                style={{ flex:1, background:S.s2, border:`1px solid ${S.b}`, borderRadius:7,
                  color:S.t1, fontSize:11, fontFamily:'monospace', padding:'6px 10px', outline:'none' }}/>
            </div>
          </div>
        )}

        {/* Main swap card */}
        <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:16, overflow:'hidden' }}>

          {/* From */}
          <div style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, color:S.t3, fontWeight:700 }}>FROM</span>
              {address && <span style={{ fontSize:11, color:S.t3 }}>Balance: 1.248 {fromToken}</span>}
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input value={fromAmt} onChange={e => setFromAmt(e.target.value)} type="number" placeholder="0.00"
                style={{ flex:1, background:'transparent', border:'none', outline:'none',
                  color:S.t1, fontSize:28, fontWeight:700, fontFamily:'monospace' }}/>
              <TokenSelector value={fromToken} onChange={setFromToken} exclude={toToken} />
            </div>
            <div style={{ fontSize:11, color:S.t3, marginTop:6 }}>
              {fromAmt && rate ? `≈ $${(parseFloat(fromAmt) * (fromToken==='USDC'?1:rate)).toFixed(2)}` : '—'}
            </div>
          </div>

          {/* Flip button */}
          <div style={{ display:'flex', justifyContent:'center', margin:'-12px 0', position:'relative', zIndex:10 }}>
            <button onClick={flip} style={{
              width:36, height:36, borderRadius:'50%', background:S.s2,
              border:`2px solid ${S.b}`, cursor:'pointer', fontSize:18,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'transform .15s'
            }} onMouseEnter={e=>e.target.style.transform='rotate(180deg)'} onMouseLeave={e=>e.target.style.transform='rotate(0deg)'}>
              ⇅
            </button>
          </div>

          {/* To */}
          <div style={{ padding:20, background:S.s2 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, color:S.t3, fontWeight:700 }}>TO</span>
              {address && <span style={{ fontSize:11, color:S.t3 }}>Balance: 284.20 {toToken}</span>}
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ flex:1, fontSize:28, fontWeight:700, fontFamily:'monospace', color: toAmt ? S.g : S.t3 }}>
                {toAmt || '0.00'}
              </div>
              <TokenSelector value={toToken} onChange={setToToken} exclude={fromToken} />
            </div>
            <div style={{ fontSize:11, color:S.t3, marginTop:6 }}>
              {toAmt ? `≈ $${(parseFloat(toAmt) * (toToken==='USDC'?1:1)).toFixed(2)}` : '—'}
            </div>
          </div>
        </div>

        {/* Rate info */}
        {rate && fromAmt && (
          <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:'12px 16px', marginTop:10 }}>
            {[
              ['Rate',         `1 ${fromToken} = ${rate.toFixed(6)} ${toToken}`],
              ['Price Impact', priceImpact],
              ['Fee',          fee],
              ['Min Received', `${minReceived} ${toToken}`],
              ['Route',        `${fromToken} → WikiAMM → ${toToken}`],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${S.b}20` }}>
                <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                <span style={{ color:S.t1, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Swap button */}
        <button style={{
          width:'100%', marginTop:12, padding:'15px 0', borderRadius:13, border:'none',
          cursor: address ? 'pointer' : 'not-allowed', fontWeight:900, fontSize:15,
          background: !address ? S.s2 :
                      !fromAmt ? `${S.a}80` :
                      !pool ? '#FF406080' :
                      `linear-gradient(135deg, ${S.a}, #A855F7)`,
          color: address ? '#fff' : S.t3,
          transition:'all .15s',
        }}>
          {!address ? 'Connect Wallet' :
           !fromAmt ? 'Enter Amount' :
           !pool ? 'No Liquidity' :
           `Swap ${fromToken} → ${toToken}`}
        </button>

        {/* Pool stats */}
        <div style={{ marginTop:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.t2, letterSpacing:'.08em', marginBottom:10 }}>AVAILABLE POOLS</div>
          {POOLS.map(p => (
            <div key={p.id} onClick={() => { setFromToken(p.from); setToToken(p.to); }}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 14px', background:S.s1, border:`1px solid ${(fromToken===p.from&&toToken===p.to)||(fromToken===p.to&&toToken===p.from)?S.a:S.b}`,
                borderRadius:10, marginBottom:6, cursor:'pointer', transition:'border-color .12s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontWeight:700, fontSize:12, color:S.t1 }}>{p.from}/{p.to}</div>
                <span style={{ background:`${S.a}18`, color:S.a, border:`1px solid ${S.a}30`,
                  borderRadius:4, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{p.fee}</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:S.g, fontFamily:'monospace', fontWeight:700 }}>{p.liquidity}</div>
                <div style={{ fontSize:9, color:S.t3 }}>liquidity</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
