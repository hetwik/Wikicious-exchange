import React, { useState } from 'react';
import { useOrderBook, useRecentTrades, useMarkets } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useApi';

export default function OrderBookPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [depth, setDepth]   = useState(20);
  useWebSocket();
  const { data: markets = [] } = useMarkets();
  const { data: ob }           = useOrderBook(symbol, depth);
  const { data: trades = [] }  = useRecentTrades(symbol);
  const bids = ob?.bids || [];
  const asks = ob?.asks || [];
  const spread = bids[0] && asks[0] ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(2) : '—';

  return (
    <div style={{ padding:16, background:'#030810', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:900, color:'#E8F4FF' }}>📊 Order Book</div>
        <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{ background:'#0B1525', border:'1px solid #152840', borderRadius:8, padding:'6px 10px', color:'#E8F4FF', fontSize:13 }}>
          {markets.map(m=><option key={m.id} value={m.symbol}>{m.symbol}</option>)}
        </select>
        {[10,20,50].map(d=><button key={d} onClick={()=>setDepth(d)} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:depth===d?'#0075FF':'#0B1525', color:depth===d?'#fff':'#4E6E90', fontSize:11, fontWeight:700, cursor:'pointer' }}>{d}</button>)}
        <span style={{ fontSize:12, color:'#4E6E90' }}>Spread: <span style={{ color:'#FFB020', fontFamily:'JetBrains Mono,monospace' }}>${spread}</span></span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#FF2D55', marginBottom:10 }}>ASKS (Sell Orders)</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#4E6E90', marginBottom:6, fontWeight:700 }}>
            <span>PRICE</span><span>SIZE</span><span>TOTAL</span>
          </div>
          {asks.slice(0,depth).reverse().map((a,i)=>{
            const total = asks.slice(0,i+1).reduce((s,x)=>s+parseFloat(x.size||0),0);
            return <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3, fontFamily:'JetBrains Mono,monospace' }}>
              <span style={{ color:'#FF2D55' }}>{parseFloat(a.price).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              <span style={{ color:'#4E6E90' }}>{parseFloat(a.size||0).toFixed(4)}</span>
              <span style={{ color:'#4E6E90' }}>{total.toFixed(4)}</span>
            </div>;
          })}
          {asks.length===0 && <div style={{ color:'#4E6E90', fontSize:11 }}>No asks</div>}
        </div>
        <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00F0A8', marginBottom:10 }}>BIDS (Buy Orders)</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#4E6E90', marginBottom:6, fontWeight:700 }}>
            <span>PRICE</span><span>SIZE</span><span>TOTAL</span>
          </div>
          {bids.slice(0,depth).map((b,i)=>{
            const total = bids.slice(0,i+1).reduce((s,x)=>s+parseFloat(x.size||0),0);
            return <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3, fontFamily:'JetBrains Mono,monospace' }}>
              <span style={{ color:'#00F0A8' }}>{parseFloat(b.price).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              <span style={{ color:'#4E6E90' }}>{parseFloat(b.size||0).toFixed(4)}</span>
              <span style={{ color:'#4E6E90' }}>{total.toFixed(4)}</span>
            </div>;
          })}
          {bids.length===0 && <div style={{ color:'#4E6E90', fontSize:11 }}>No bids</div>}
        </div>
      </div>
      <div style={{ marginTop:12, background:'#0B1525', border:'1px solid #0E1E35', borderRadius:14, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#4E6E90', marginBottom:8 }}>Recent Trades</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
          {['TIME','PRICE','SIZE','SIDE'].map(h=><div key={h} style={{ fontSize:9, color:'#4E6E90', fontWeight:700 }}>{h}</div>)}
          {trades.slice(0,20).map((t,i)=>[
            <div key={`t${i}`} style={{ fontSize:11, color:'#4E6E90' }}>{new Date(t.ts).toLocaleTimeString()}</div>,
            <div key={`p${i}`} style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:t.side==='buy'?'#00F0A8':'#FF2D55' }}>${parseFloat(t.price).toFixed(2)}</div>,
            <div key={`s${i}`} style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'#4E6E90' }}>{parseFloat(t.size).toFixed(4)}</div>,
            <div key={`si${i}`} style={{ fontSize:11, fontWeight:700, color:t.side==='buy'?'#00F0A8':'#FF2D55' }}>{t.side?.toUpperCase()}</div>
          ])}
        </div>
        {trades.length===0 && <div style={{ color:'#4E6E90', fontSize:11 }}>No recent trades</div>}
      </div>
    </div>
  );
}
