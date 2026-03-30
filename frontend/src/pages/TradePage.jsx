import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  usePlaceOrder, useClosePosition, useVaultBalance,
  useApproveUSDC, useDeposit, useWithdraw
} from '../hooks/useContracts';
import {
  useMarkets, useCandles, useOrderBook,
  useRecentTrades, useFundingRate, usePositions, useOrders,
  useWebSocket, useAccountBalance
} from '../hooks/useApi';
import { CONTRACTS } from '../config';

const INTERVALS = ['1m','5m','15m','1h','4h','1d'];

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const [symbol, setSymbol]   = useState('BTCUSDT');
  const [isLong, setIsLong]   = useState(true);
  const [collateral, setColl] = useState('');
  const [leverage, setLev]    = useState(10);
  const [tp, setTp]           = useState('');
  const [sl, setSl]           = useState('');
  const [interval, setInterval] = useState('1h');
  const [activeTab, setActiveTab] = useState('positions');

  useWebSocket();

  const { data: markets = [] }          = useMarkets();
  const { data: candles = [] }          = useCandles(symbol, interval);
  const { data: ob }                    = useOrderBook(symbol);
  const { data: recentTrades = [] }     = useRecentTrades(symbol);
  const { data: funding }               = useFundingRate(symbol);
  const { data: positions = [] }        = usePositions(address);
  const { data: orders = [] }           = useOrders(address);
  const { data: balance }               = useAccountBalance(address);
  const { free = 0, locked = 0 }        = balance || {};

  const { placeMarketOrder, isPending: placing, isSuccess: placed, error: placeErr } = usePlaceOrder();
  const { close, isPending: closing }   = useClosePosition();
  const { deposit, isPending: depositing } = useDeposit();
  const { withdraw, isPending: withdrawing } = useWithdraw();

  const market = markets.find(m => m.symbol === symbol) || {};
  const price  = market.markPrice || 0;
  const notional = (parseFloat(collateral)||0) * leverage;
  const fee      = notional * (market.takerFee || 0.001);

  function handleTrade(e) {
    e.preventDefault();
    if (!isConnected || !collateral) return;
    const mkt = markets.find(m => m.symbol === symbol);
    if (!mkt) return;
    placeMarketOrder({
      marketIndex: mkt.id,
      isLong,
      collateral:  parseFloat(collateral),
      leverage,
      takeProfit:  tp ? parseFloat(tp) : 0,
      stopLoss:    sl ? parseFloat(sl) : 0,
    });
  }

  useEffect(() => {
    if (placed) { setColl(''); setTp(''); setSl(''); }
  }, [placed]);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:12, padding:12, height:'calc(100vh - 52px)', background:'#030810' }}>
      {/* Left — chart + orderbook */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Market bar */}
        <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:'10px 16px', display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{ background:'#091220', border:'1px solid #152840', borderRadius:8, padding:'6px 10px', color:'#E8F4FF', fontSize:13, fontWeight:700 }}>
            {markets.map(m=><option key={m.id} value={m.symbol}>{m.symbol}</option>)}
          </select>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, fontWeight:700, color: market.change24h>=0?'#00F0A8':'#FF2D55' }}>${price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          <span style={{ fontSize:12, color: market.change24h>=0?'#00F0A8':'#FF2D55' }}>{market.change24h>=0?'+':''}{(market.change24h||0).toFixed(2)}%</span>
          {funding && <span style={{ fontSize:11, color:'#4E6E90' }}>Funding {(funding.rate*100).toFixed(4)}% / 8h</span>}
          <span style={{ fontSize:11, color:'#4E6E90' }}>OI Long ${(market.openInterestLong||0).toLocaleString()}</span>
          {INTERVALS.map(i=><button key={i} onClick={()=>setInterval(i)} style={{ padding:'4px 10px', borderRadius:7, border:'none', background: interval===i?'#0075FF':'transparent', color: interval===i?'#fff':'#4E6E90', fontSize:11, fontWeight:700, cursor:'pointer' }}>{i}</button>)}
        </div>
        {/* Candles info */}
        <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:14, flex:1, minHeight:320 }}>
          <div style={{ fontSize:11, color:'#4E6E90', marginBottom:8 }}>Price Chart — {symbol} {interval.toUpperCase()}</div>
          {candles.length>0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(48px,1fr))', gap:2, alignItems:'flex-end', height:260 }}>
              {candles.slice(-50).map((c,i)=>{
                const max=Math.max(...candles.slice(-50).map(x=>x.high));
                const min=Math.min(...candles.slice(-50).map(x=>x.low));
                const range=max-min||1;
                const bull=c.close>=c.open;
                const bodyH=Math.max(2,((Math.abs(c.close-c.open))/range)*240);
                const bodyBottom=((Math.min(c.close,c.open)-min)/range)*240;
                return <div key={i} style={{ position:'relative', height:260, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                  <div style={{ position:'absolute', width:2, background:bull?'#00F0A830':'#FF2D5530', bottom:((c.low-min)/range)*240, height:((c.high-c.low)/range)*240 }}/>
                  <div style={{ position:'absolute', width:6, background:bull?'#00F0A8':'#FF2D55', bottom:bodyBottom, height:bodyH, borderRadius:1 }}/>
                </div>;
              })}
            </div>
          ) : <div style={{ color:'#4E6E90', fontSize:11, marginTop:40, textAlign:'center' }}>Loading candles…</div>}
        </div>
        {/* Order book + recent trades */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:12, maxHeight:200, overflow:'auto' }}>
            <div style={{ fontSize:11, color:'#4E6E90', marginBottom:8, fontWeight:700 }}>Order Book</div>
            {ob?.asks?.slice(0,8).reverse().map((a,i)=><div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}><span style={{ color:'#FF2D55', fontFamily:'JetBrains Mono,monospace' }}>{parseFloat(a.price).toFixed(2)}</span><span style={{ color:'#4E6E90' }}>{parseFloat(a.size).toFixed(4)}</span></div>)}
            <div style={{ borderTop:'1px solid #0E1E35', margin:'6px 0', textAlign:'center', color:'#00F0A8', fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:13 }}>${price.toFixed(2)}</div>
            {ob?.bids?.slice(0,8).map((b,i)=><div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}><span style={{ color:'#00F0A8', fontFamily:'JetBrains Mono,monospace' }}>{parseFloat(b.price).toFixed(2)}</span><span style={{ color:'#4E6E90' }}>{parseFloat(b.size).toFixed(4)}</span></div>)}
          </div>
          <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:12, maxHeight:200, overflow:'auto' }}>
            <div style={{ fontSize:11, color:'#4E6E90', marginBottom:8, fontWeight:700 }}>Recent Trades</div>
            {recentTrades.slice(0,15).map((t,i)=><div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
              <span style={{ color:t.side==='buy'?'#00F0A8':'#FF2D55', fontFamily:'JetBrains Mono,monospace' }}>{parseFloat(t.price).toFixed(2)}</span>
              <span style={{ color:'#4E6E90' }}>{parseFloat(t.size).toFixed(4)}</span>
              <span style={{ color:'#4E6E90', fontSize:9 }}>{new Date(t.ts).toLocaleTimeString()}</span>
            </div>)}
            {recentTrades.length===0 && <div style={{ color:'#4E6E90', fontSize:11 }}>No trades yet</div>}
          </div>
        </div>
      </div>

      {/* Right — trade form + positions */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Balance */}
        {isConnected && <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:'10px 14px', display:'flex', gap:16 }}>
          <div><div style={{ fontSize:8, color:'#4E6E90', fontWeight:700 }}>FREE MARGIN</div><div style={{ fontFamily:'JetBrains Mono,monospace', color:'#00F0A8', fontWeight:700 }}>${free.toFixed(2)}</div></div>
          <div><div style={{ fontSize:8, color:'#4E6E90', fontWeight:700 }}>LOCKED</div><div style={{ fontFamily:'JetBrains Mono,monospace', color:'#4E6E90', fontWeight:700 }}>${locked.toFixed(2)}</div></div>
        </div>}
        {/* Trade form */}
        <form onSubmit={handleTrade} style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:12 }}>
            {[true,false].map(lng=><button type="button" key={String(lng)} onClick={()=>setIsLong(lng)} style={{ padding:'10px', borderRadius:9, border:'none', background: isLong===lng?(lng?'#00F0A8':'#FF2D55'):'#091220', color: isLong===lng?'#000':'#4E6E90', fontWeight:800, fontSize:13, cursor:'pointer' }}>{lng?'Long ▲':'Short ▼'}</button>)}
          </div>
          {[['Collateral (USDC)',collateral,setColl,'100'],['Take Profit (0=skip)',tp,setTp,'0'],['Stop Loss (0=skip)',sl,setSl,'0']].map(([lbl,val,setter,ph])=>(
            <div key={lbl} style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:'#4E6E90', fontWeight:700, marginBottom:4 }}>{lbl.toUpperCase()}</div>
              <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph} type="number" min="0" style={{ width:'100%', background:'#091220', border:'1px solid #152840', borderRadius:9, padding:'9px 12px', color:'#E8F4FF', fontSize:13, boxSizing:'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:'#4E6E90', fontWeight:700, marginBottom:4 }}>LEVERAGE: {leverage}×</div>
            <input type="range" min="1" max={market.maxLeverage||125} value={leverage} onChange={e=>setLev(Number(e.target.value))} style={{ width:'100%' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#4E6E90' }}><span>1×</span><span>{Math.round((market.maxLeverage||125)/2)}×</span><span>{market.maxLeverage||125}×</span></div>
          </div>
          {collateral && <div style={{ marginBottom:10, padding:'8px 10px', background:'#091220', borderRadius:9, fontSize:11, color:'#4E6E90' }}>
            <div>Notional: <span style={{ color:'#E8F4FF' }}>${notional.toFixed(2)}</span></div>
            <div>Est. fee: <span style={{ color:'#FFB020' }}>${fee.toFixed(4)}</span></div>
          </div>}
          {placeErr && <div style={{ marginBottom:8, padding:'8px 10px', background:'rgba(255,45,85,.1)', borderRadius:9, fontSize:11, color:'#FF2D55' }}>{placeErr.shortMessage||'Transaction failed'}</div>}
          {placed && <div style={{ marginBottom:8, padding:'8px 10px', background:'rgba(0,240,168,.1)', borderRadius:9, fontSize:11, color:'#00F0A8' }}>✅ Position opened</div>}
          {!isConnected ? <div style={{ textAlign:'center', color:'#4E6E90', fontSize:12, padding:'10px 0' }}>Connect wallet to trade</div> :
            <button type="submit" disabled={placing||!collateral} style={{ width:'100%', padding:12, borderRadius:11, border:'none', background: placing?'#152840':(isLong?'#00F0A8':'#FF2D55'), color: placing?'#4E6E90':'#000', fontWeight:800, fontSize:13, cursor: placing?'not-allowed':'pointer', fontFamily:'Syne,sans-serif' }}>
              {placing?'Submitting…':`${isLong?'Long':'Short'} ${symbol.replace('USDT','')} ${leverage}×`}
            </button>}
        </form>
        {/* Positions / Orders tabs */}
        <div style={{ background:'#0B1525', border:'1px solid #0E1E35', borderRadius:12, padding:12, flex:1, overflow:'auto' }}>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            {['positions','orders'].map(t=><button key={t} onClick={()=>setActiveTab(t)} style={{ padding:'5px 12px', borderRadius:8, border:'none', background: activeTab===t?'#091220':'transparent', color: activeTab===t?'#E8F4FF':'#4E6E90', fontWeight:700, fontSize:11, cursor:'pointer', textTransform:'capitalize' }}>{t} {activeTab===t?`(${(t==='positions'?positions:orders).length})`:''}</button>)}
          </div>
          {activeTab==='positions' && (positions.length===0 ? <div style={{ color:'#4E6E90', fontSize:11, textAlign:'center', padding:'20px 0' }}>No open positions</div> :
            positions.map(p=><div key={p.id} style={{ padding:'10px 12px', background:'#091220', borderRadius:10, marginBottom:8, border:`1px solid ${p.unrealizedPnl>=0?'rgba(0,240,168,.2)':'rgba(255,45,85,.2)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontWeight:700, fontSize:12 }}>{markets.find(m=>m.id===p.marketIndex)?.symbol||`Market ${p.marketIndex}`}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:p.unrealizedPnl>=0?'#00F0A8':'#FF2D55' }}>{p.unrealizedPnl>=0?'+':''}{p.unrealizedPnl?.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', gap:10, fontSize:10, color:'#4E6E90' }}>
                <span style={{ color:p.isLong?'#00F0A8':'#FF2D55', fontWeight:700 }}>{p.isLong?'LONG':'SHORT'}</span>
                <span>{p.leverage}×</span>
                <span>Entry: ${p.entryPrice?.toFixed(2)}</span>
                <span>Liq: ${p.liqPrice?.toFixed(2)}</span>
              </div>
              <button onClick={()=>close(p.id)} disabled={closing} style={{ marginTop:8, width:'100%', padding:'6px', borderRadius:8, border:'1px solid rgba(255,45,85,.3)', background:'transparent', color:'#FF2D55', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                {closing?'Closing…':'Close Position'}
              </button>
            </div>)
          )}
          {activeTab==='orders' && (orders.length===0 ? <div style={{ color:'#4E6E90', fontSize:11, textAlign:'center', padding:'20px 0' }}>No open orders</div> :
            orders.map(o=><div key={o.id} style={{ padding:'10px 12px', background:'#091220', borderRadius:10, marginBottom:8, border:'1px solid rgba(255,176,32,.2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:700, fontSize:12 }}>{o.symbol}</span>
                <span style={{ color:'#FFB020', fontSize:11 }}>Limit @ ${o.limitPrice?.toFixed(2)}</span>
              </div>
              <div style={{ fontSize:10, color:'#4E6E90', marginTop:3 }}>{o.isLong?'LONG':'SHORT'} {o.leverage}× · ${o.collateral}</div>
            </div>)
          )}
        </div>
      </div>
    </div>
  );
}
