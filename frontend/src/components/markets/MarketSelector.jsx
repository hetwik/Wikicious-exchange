// MarketSelector — compact dropdown for the top trading bar
import { useState, useRef, useEffect } from 'react';
import { useMarkets } from '../../hooks/useApi';
import { usePriceStore } from '../../store';
import { MARKET_SYMBOLS } from '../../config';
import clsx from 'clsx';

function fmtPrice(p) {
  p = parseFloat(p);
  if (p >= 10000) return '$' + p.toLocaleString('en',{maximumFractionDigits:0});
  if (p >= 100)   return '$' + p.toFixed(2);
  if (p >= 1)     return '$' + p.toFixed(4);
  return '$' + p.toFixed(6);
}

export default function MarketSelector({ currentSymbol, onSelect }) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const prices  = usePriceStore(s => s.prices);
  const { data: markets = [] } = useMarkets();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const base = currentSymbol.replace('USDT','').replace('1000','');
  const price = prices[currentSymbol];
  const filteredMarkets = markets.filter(m =>
    !search || m.symbol?.toUpperCase().includes(search.toUpperCase())
  ).slice(0, 100);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 h-full hover:bg-[#12151F] transition-colors min-w-[160px]"
      >
        <div className="w-6 h-6 bg-[#5B7FFF]/15 rounded-full flex items-center justify-center text-[10px] font-bold text-[#5B7FFF]">
          {base.slice(0,2)}
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-white leading-none">{base}-PERP</div>
          {price && <div className="text-[10px] text-[#555C78] font-mono">{fmtPrice(price)}</div>}
        </div>
        <span className={clsx('ml-1 text-[#555C78] text-xs transition-transform', open && 'rotate-180')}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 w-80 bg-[#0D0F17] border border-[#222840] rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-[#222840]">
            <input
              autoFocus
              placeholder="Search markets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#12151F] border border-[#222840] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#5B7FFF] placeholder-[#555C78]"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {/* Favorites */}
            <div className="px-3 py-1.5 text-[10px] text-[#555C78] font-semibold uppercase tracking-wider">Popular</div>
            {['BTCUSDT','ETHUSDT','ARBUSDT','SOLUSDT','OPUSDT'].map((sym, i) => {
              const p = prices[sym];
              const change = 0;
              const isUp = change >= 0;
              return (
                <button key={sym} onClick={() => { onSelect(sym, MARKET_SYMBOLS.indexOf(sym)); setOpen(false); setSearch(''); }}
                  className={clsx('w-full flex items-center justify-between px-3 py-2 hover:bg-[#12151F] transition-colors',
                    currentSymbol === sym && 'bg-[#5B7FFF]/10')}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#5B7FFF]/15 rounded-full flex items-center justify-center text-[9px] font-bold text-[#5B7FFF]">
                      {sym.replace('USDT','').slice(0,2)}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white">{sym.replace('USDT','')}</div>
                      <div className="text-[10px] text-[#555C78]">PERP · Arb</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-[#8A90A8]">{p ? fmtPrice(p) : '—'}</div>
                    <div className={clsx('text-[10px] font-mono', isUp ? 'text-[#00D4A0]' : 'text-[#FF4F6B]')}>
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}

            {/* All markets */}
            {search && <>
              <div className="px-3 py-1.5 text-[10px] text-[#555C78] font-semibold uppercase tracking-wider border-t border-[#1a1e2e]">Results</div>
              {filteredMarkets.map((mkt, i) => {
                const p = prices[mkt.symbol];
                const change = mkt.change24h || 0;
                const isUp = change >= 0;
                return (
                  <button key={mkt.symbol} onClick={() => { onSelect(mkt.symbol, MARKET_SYMBOLS.indexOf(mkt.symbol)); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#12151F] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{mkt.symbol.replace('USDT','').replace('1000','')}</span>
                      <span className="text-[10px] text-[#555C78]">PERP</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#8A90A8]">{p ? fmtPrice(p) : '—'}</div>
                      <div className={clsx('text-[10px] font-mono', isUp ? 'text-[#00D4A0]' : 'text-[#FF4F6B]')}>
                        {isUp ? '+' : ''}{change.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
