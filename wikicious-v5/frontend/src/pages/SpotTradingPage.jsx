import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

const S = { bg:'#0E1120', s1:'#09101C', s2:'#131829', b:'#1C2138', t1:'#EDF0FA', t2:'#8892B0', t3:'#4A5270', a:'#5B7FFF', g:'#00E5A0', gold:'#FFB800', r:'#FF4060' };

const SPOT_PAIRS = [
  { pair:'WETH/USDC',  price:3482.40,  chg:+1.84, vol:'$8.4M',  bid:3482.10, ask:3482.70, spread:'0.017%', liq:'$8.4M'  },
  { pair:'WBTC/USDC',  price:67284.0,  chg:+2.14, vol:'$12.1M', bid:67283.0, ask:67285.0, spread:'0.003%', liq:'$12.1M' },
  { pair:'ARB/USDC',   price:1.1820,   chg:-0.94, vol:'$2.8M',  bid:1.1815,  ask:1.1825,  spread:'0.085%', liq:'$2.8M'  },
  { pair:'WIK/USDC',   price:0.2840,   chg:+4.20, vol:'$1.2M',  bid:0.2838,  ask:0.2842,  spread:'0.141%', liq:'$1.2M'  },
  { pair:'LINK/USDC',  price:9.8640,   chg:-0.47, vol:'$1.8M',  bid:9.8620,  ask:9.8660,  spread:'0.041%', liq:'$1.8M'  },
  { pair:'GMX/USDC',   price:28.620,   chg:+1.18, vol:'$0.8M',  bid:28.610,  ask:28.630,  spread:'0.070%', liq:'$0.8M'  },
  { pair:'UNI/USDC',   price:3.9940,   chg:-1.39, vol:'$0.6M',  bid:3.9930,  ask:3.9950,  spread:'0.050%', liq:'$0.6M'  },
  { pair:'WETH/WBTC',  price:0.05180,  chg:+0.05, vol:'$4.2M',  bid:0.05179, ask:0.05181, spread:'0.038%', liq:'$4.2M'  },
];

// Fake order book generator
function genBook(mid, spread, n=12) {
  const asks = Array.from({length:n}, (_,i) => ({
    price: (mid + (i+1)*spread*mid).toFixed(mid>100?2:mid>1?4:6),
    size:  ((markets.find(m=>m.symbol===symbol)?.markPrice||0)).toFixed(3),
    total: ((i+1)*2.5).toFixed(2)
  })).reverse();
  const bids = Array.from({length:n}, (_,i) => ({
    price: (mid - (i+1)*spread*mid).toFixed(mid>100?2:mid>1?4:6),
    size:  ((markets.find(m=>m.symbol===symbol)?.markPrice||0)).toFixed(3),
    total: ((i+1)*2.5).toFixed(2)
  }));
  return { asks, bids };
}

function OrderBook({ pair }) {
  const book = useMemo(() => genBook(pair.price, 0.0005), [pair.pair]);
  const maxTotal = parseFloat(book.bids[book.bids.length-1]?.total || 1);
  return (
    <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', background:'#131829', borderBottom:`1px solid ${S.b}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', fontSize:9, color:S.t3, fontWeight:700, textTransform:'uppercase' }}>
          <span>Price (USDC)</span><span style={{textAlign:'center'}}>Size</span><span style={{textAlign:'right'}}>Total</span>
        </div>
      </div>
      {/* Asks */}
      {book.asks.map((row,i) => (
        <div key={i} style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'3px 14px', fontSize:10, fontFamily:'monospace' }}>
          <div style={{ position:'absolute', right:0, top:0, bottom:0, width:`${parseFloat(row.total)/maxTotal*100}%`, background:'#FF406010' }}/>
          <span style={{ color:S.r, position:'relative' }}>{row.price}</span>
          <span style={{ color:S.t2, textAlign:'center', position:'relative' }}>{row.size}</span>
          <span style={{ color:S.t3, textAlign:'right', position:'relative' }}>{row.total}</span>
        </div>
      ))}
      {/* Spread */}
      <div style={{ padding:'6px 14px', background:'#0A0C16', borderTop:`1px solid ${S.b}`, borderBottom:`1px solid ${S.b}` }}>
        <span style={{ fontSize:14, fontWeight:900, color:S.a, fontFamily:'monospace' }}>
          {pair.price.toFixed(pair.price > 100 ? 2 : 4)}
        </span>
        <span style={{ fontSize:10, color:S.t3, marginLeft:8 }}>Spread: {pair.spread}</span>
      </div>
      {/* Bids */}
      {book.bids.map((row,i) => (
        <div key={i} style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'3px 14px', fontSize:10, fontFamily:'monospace' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${parseFloat(row.total)/maxTotal*100}%`, background:'#00E5A010' }}/>
          <span style={{ color:S.g, position:'relative' }}>{row.price}</span>
          <span style={{ color:S.t2, textAlign:'center', position:'relative' }}>{row.size}</span>
          <span style={{ color:S.t3, textAlign:'right', position:'relative' }}>{row.total}</span>
        </div>
      ))}
    </div>
  );
}

export default function SpotTradingPage() {
  const { address } = useAccount();
  const [selPair, setSelPair] = useState(0);
  const [side,    setSide]    = useState('buy');
  const [type,    setType]    = useState('market');
  const [amount,  setAmount]  = useState('');
  const [price,   setPrice]   = useState('');
  const pair = SPOT_PAIRS[selPair];
  const [base, quote] = pair.pair.split('/');
  const total = amount && (type==='market' ? pair.price : parseFloat(price||0))
    ? (parseFloat(amount) * (type==='market' ? pair.price : parseFloat(price))).toFixed(2) : '';

  return (
    <AppLayout>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'16px 20px' }}>
        {/* Pair selector */}
        <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
          {SPOT_PAIRS.map((p, i) => (
            <button key={i} onClick={() => setSelPair(i)} style={{
              padding:'8px 14px', borderRadius:9, border:`1px solid ${selPair===i?S.a:S.b}`,
              background: selPair===i ? `${S.a}15` : S.s1,
              cursor:'pointer', whiteSpace:'nowrap', minWidth:120
            }}>
              <div style={{ fontWeight:800, fontSize:12, color:S.t1 }}>{p.pair}</div>
              <div style={{ display:'flex', gap:6, marginTop:2 }}>
                <span style={{ fontSize:10, fontFamily:'monospace', color:S.t1 }}>
                  {p.price.toFixed(p.price>100?2:4)}
                </span>
                <span style={{ fontSize:10, color: p.chg>=0 ? S.g : S.r, fontFamily:'monospace' }}>
                  {p.chg>=0?'+':''}{p.chg}%
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main layout */}
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 280px', gap:14 }}>

          {/* Order form */}
          <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:13, padding:18, height:'fit-content' }}>
            {/* Buy/Sell tabs */}
            <div style={{ display:'flex', gap:3, background:'#0A0C16', padding:3, borderRadius:9, marginBottom:14 }}>
              {['buy','sell'].map(s => (
                <button key={s} onClick={() => setSide(s)} style={{
                  flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer',
                  fontWeight:800, fontSize:12, transition:'all .12s',
                  background: side===s ? (s==='buy'?S.g:S.r) : 'transparent',
                  color: side===s ? (s==='buy'?'#000':'#fff') : S.t3
                }}>{s==='buy'?'▲ Buy':'▼ Sell'}</button>
              ))}
            </div>
            {/* Order type */}
            <div style={{ display:'flex', gap:3, marginBottom:14 }}>
              {['market','limit','stop'].map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  flex:1, padding:'5px 0', borderRadius:6, border:'none', cursor:'pointer',
                  fontWeight:700, fontSize:10, background: type===t ? S.a : '#0A0C16',
                  color: type===t ? '#fff' : S.t3, textTransform:'capitalize'
                }}>{t}</button>
              ))}
            </div>
            {/* Price input (limit/stop only) */}
            {type !== 'market' && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>PRICE ({quote})</div>
                <input value={price} onChange={e=>setPrice(e.target.value)} type="number"
                  placeholder={pair.price.toFixed(2)}
                  style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:7,
                    color:S.t1, fontSize:13, fontFamily:'monospace', padding:'8px 10px', outline:'none', boxSizing:'border-box' }}/>
              </div>
            )}
            {type === 'market' && (
              <div style={{ padding:'8px 10px', background:'#0A0C16', borderRadius:7, marginBottom:10, fontSize:11, color:S.t3 }}>
                Market price: <span style={{ color:S.t1, fontFamily:'monospace', fontWeight:700 }}>
                  {side==='buy' ? pair.ask.toFixed(pair.ask>100?2:4) : pair.bid.toFixed(pair.bid>100?2:4)} {quote}
                </span>
              </div>
            )}
            {/* Amount */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:S.t3, fontWeight:700, marginBottom:4 }}>AMOUNT ({base})</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00"
                style={{ width:'100%', background:'#0A0C16', border:`1px solid ${S.b}`, borderRadius:7,
                  color:S.t1, fontSize:13, fontFamily:'monospace', padding:'8px 10px', outline:'none', boxSizing:'border-box' }}/>
            </div>
            {/* Pct buttons */}
            <div style={{ display:'flex', gap:4, marginBottom:14 }}>
              {['25%','50%','75%','100%'].map(p => (
                <button key={p} onClick={() => {}} style={{
                  flex:1, padding:'4px 0', borderRadius:5, border:`1px solid ${S.b}`,
                  background:'#0A0C16', color:S.t3, fontSize:9, fontWeight:700, cursor:'pointer'
                }}>{p}</button>
              ))}
            </div>
            {/* Total */}
            {total && (
              <div style={{ background:'#0A0C16', borderRadius:7, padding:'8px 10px', marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:S.t3 }}>Total</span>
                  <span style={{ color:S.t1, fontFamily:'monospace', fontWeight:700 }}>{total} {quote}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:4 }}>
                  <span style={{ color:S.t3 }}>Fee (0.07%)</span>
                  <span style={{ color:S.gold, fontFamily:'monospace' }}>
                    {total ? (parseFloat(total)*0.0007).toFixed(4) : '0'} {quote}
                  </span>
                </div>
              </div>
            )}
            <button style={{
              width:'100%', padding:13, borderRadius:10, border:'none',
              cursor: address ? 'pointer' : 'not-allowed', fontWeight:900, fontSize:13,
              background: !address ? S.s2 : side==='buy' ? S.g : S.r,
              color: !address ? S.t3 : side==='buy' ? '#000' : '#fff'
            }}>
              {address ? `${side==='buy'?'Buy':'Sell'} ${base}` : 'Connect Wallet'}
            </button>
          </div>

          {/* Order book */}
          <OrderBook pair={pair} />

          {/* Pair info + recent trades */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:14, color:S.t1, marginBottom:12 }}>{pair.pair}</div>
              {[
                ['Price',    `${pair.price.toFixed(pair.price>100?2:4)} ${quote}`],
                ['24h Change',pair.chg>=0 ? `+${pair.chg}%` : `${pair.chg}%`],
                ['24h Volume',pair.vol],
                ['Spread',   pair.spread],
                ['Liquidity',pair.liq],
                ['Fee',      '0.07% taker / 0% maker'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.b}30` }}>
                  <span style={{ color:S.t3, fontSize:11 }}>{k}</span>
                  <span style={{ color: k==='24h Change' ? (pair.chg>=0?S.g:S.r) : S.t1, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:S.s1, border:`1px solid ${S.b}`, borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:12, color:S.t1, marginBottom:10 }}>Recent Trades</div>
              {Array.from({length:10}, (_,i) => {
                const isBuy = 0.5>0.5;
                const p = pair.price * (1 + (0.5-0.5)*0.001);
                return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'3px 0', fontSize:9, fontFamily:'monospace' }}>
                    <span style={{ color: isBuy?S.g:S.r }}>{p.toFixed(pair.price>100?2:4)}</span>
                    <span style={{ color:S.t2, textAlign:'center' }}>{((markets.find(m=>m.symbol===symbol)?.markPrice||0)).toFixed(3)}</span>
                    <span style={{ color:S.t3, textAlign:'right' }}>{i}s ago</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA to perps */}
        <div style={{ marginTop:16, padding:'12px 16px', background:`${S.a}0D`, border:`1px solid ${S.a}30`, borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:S.t2 }}>
            Want leverage? Trade the same pairs as perpetuals with up to 100× leverage.
          </span>
          <Link to="/trade/ETHUSDT" style={{ padding:'7px 16px', borderRadius:8, background:S.a, color:'#fff', textDecoration:'none', fontSize:11, fontWeight:800 }}>
            Switch to Perps →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
