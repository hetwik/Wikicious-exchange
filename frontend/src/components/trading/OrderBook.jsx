import { useMemo } from 'react';
import { useOrderBook } from '../../hooks/useApi';
import { usePriceStore } from '../../store';

function fmtPrice(p) {
  if (!p) return '—';
  if (p >= 10000) return p.toFixed(1);
  if (p >= 100)   return p.toFixed(2);
  if (p >= 1)     return p.toFixed(4);
  if (p >= 0.01)  return p.toFixed(6);
  return p.toFixed(8);
}

function fmtSize(s) {
  if (s >= 1000) return (s/1000).toFixed(2) + 'K';
  return s.toFixed(4);
}

function OrderRow({ price, size, total, maxTotal, side }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const isAsk = side === 'ask';
  return (
    <div className="relative flex items-center justify-between px-3 py-[2px] group hover:bg-white/5 cursor-pointer text-xs font-mono">
      <div
        className={`absolute inset-y-0 right-0 ${isAsk ? 'bg-[#FF4F6B]' : 'bg-[#00D4A0]'} opacity-10`}
        style={{ width: `${pct}%` }}
      />
      <span className={isAsk ? 'text-[#FF4F6B]' : 'text-[#00D4A0]'}>{fmtPrice(price)}</span>
      <span className="text-[#8A90A8]">{fmtSize(size)}</span>
      <span className="text-[#555C78]">{fmtSize(total)}</span>
    </div>
  );
}

export default function OrderBook({ symbol }) {
  const { data, isLoading } = useOrderBook(symbol, 20);
  const markPrice = usePriceStore(s => s.prices[symbol]);

  const { asks, bids, maxTotal } = useMemo(() => {
    if (!data) return { asks: [], bids: [], maxTotal: 0 };

    // Cumulative totals
    let cumBid = 0, cumAsk = 0;
    const bids = (data.bids || []).map(r => { cumBid += r.size; return { ...r, total: cumBid }; });
    const asks = [...(data.asks || [])].reverse().map(r => { cumAsk += r.size; return { ...r, total: cumAsk }; });

    const maxTotal = Math.max(cumBid, cumAsk);
    return { asks: asks.reverse(), bids, maxTotal };
  }, [data]);

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#5B7FFF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Header */}
      <div className="flex justify-between px-3 py-2 text-[10px] text-[#555C78] font-semibold uppercase tracking-wide border-b border-[#222840]">
        <span>Price</span><span>Size</span><span>Total</span>
      </div>

      {/* Asks (sell orders) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {asks.map((row, i) => (
          <OrderRow key={i} {...row} side="ask" maxTotal={maxTotal} />
        ))}
      </div>

      {/* Spread */}
      <div className="px-3 py-2 flex items-center justify-between border-y border-[#222840] bg-[#0D0F17]">
        <span className="text-base font-bold font-mono text-[#00D4A0]">
          {fmtPrice(markPrice || data?.bids?.[0]?.price)}
        </span>
        <span className="text-[10px] text-[#555C78]">
          Spread: {asks[0] && bids[0]
            ? ((asks[0].price - bids[0].price) / asks[0].price * 100).toFixed(3) + '%'
            : '—'}
        </span>
      </div>

      {/* Bids (buy orders) */}
      <div className="flex-1 overflow-hidden">
        {bids.map((row, i) => (
          <OrderRow key={i} {...row} side="bid" maxTotal={maxTotal} />
        ))}
      </div>
    </div>
  );
}
