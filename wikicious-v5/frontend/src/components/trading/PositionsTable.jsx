import { useAccount } from 'wagmi';
import { usePositions, useOrders } from '../../hooks/useApi';
import { useClosePosition, useCancelOrder } from '../../hooks/useContracts';
import { usePriceStore } from '../../store';
import { MARKET_SYMBOLS } from '../../config';
import clsx from 'clsx';

function fmt(n, dec = 2) { return parseFloat(n || 0).toFixed(dec); }
function fmtPrice(p) {
  p = parseFloat(p);
  if (p >= 1000) return '$' + p.toLocaleString('en', {minimumFractionDigits:2,maximumFractionDigits:2});
  if (p >= 1)    return '$' + p.toFixed(4);
  return '$' + p.toFixed(6);
}

function PositionRow({ pos }) {
  const prices  = usePriceStore(s => s.prices);
  const symbol  = MARKET_SYMBOLS[pos.marketIndex] || 'BTCUSDT';
  const mark    = prices[symbol] || parseFloat(pos.entryPrice);
  const entry   = parseFloat(pos.entryPrice);
  const size    = parseFloat(pos.size);
  const upnl    = pos.isLong ? (mark - entry) * size / entry : (entry - mark) * size / entry;
  const margin  = parseFloat(pos.collateral);
  const roe     = margin > 0 ? upnl / margin * 100 : 0;
  const isUp    = upnl >= 0;
  const { close, isPending } = useClosePosition();

  return (
    <tr className="border-b border-[#1a1e2e] hover:bg-[#12151F] transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{symbol.replace('USDT','')}</span>
          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded',
            pos.isLong ? 'bg-[#00D4A0]/15 text-[#00D4A0]' : 'bg-[#FF4F6B]/15 text-[#FF4F6B]')}>
            {pos.isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[10px] text-[#5B7FFF] font-mono">{pos.leverage}×</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-[#8A90A8] text-xs">{fmtPrice(pos.size)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#8A90A8]">{fmtPrice(entry)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#8A90A8]">{fmtPrice(mark)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#FF4F6B]">{fmtPrice(pos.liqPrice)}</td>
      <td className="px-4 py-3 text-right">
        <div className={clsx('font-mono text-xs font-bold', isUp ? 'text-[#00D4A0]' : 'text-[#FF4F6B]')}>
          {isUp ? '+' : ''}{upnl.toFixed(2)} USDC
        </div>
        <div className={clsx('text-[10px]', isUp ? 'text-[#00D4A0]/70' : 'text-[#FF4F6B]/70')}>
          {isUp ? '+' : ''}{roe.toFixed(2)}%
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => close(pos.id)}
          disabled={isPending}
          className="text-xs text-[#FF4F6B] hover:text-white border border-[#FF4F6B]/30 hover:border-[#FF4F6B] px-2.5 py-1 rounded transition-all disabled:opacity-50">
          {isPending ? '...' : 'Close'}
        </button>
      </td>
    </tr>
  );
}

function OrderRow({ order }) {
  const { cancel, isPending } = useCancelOrder();
  const symbol = MARKET_SYMBOLS[order.marketIndex] || 'BTCUSDT';
  return (
    <tr className="border-b border-[#1a1e2e] hover:bg-[#12151F]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">{symbol.replace('USDT','')}</span>
          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded',
            order.isLong ? 'bg-[#00D4A0]/15 text-[#00D4A0]' : 'bg-[#FF4F6B]/15 text-[#FF4F6B]')}>
            {order.isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[10px] text-[#555C78]">{order.isLimit ? 'LIMIT' : 'MARKET'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#8A90A8]">${fmt(order.size)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#8A90A8]">
        {order.limitPrice ? fmtPrice(order.limitPrice) : 'Market'}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-[#8A90A8]">{order.leverage}×</td>
      <td className="px-4 py-3 text-right" colSpan={2}>
        <span className="text-[10px] text-[#F5C842] bg-[#F5C842]/10 px-2 py-1 rounded">Open</span>
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => cancel(order.id)} disabled={isPending}
          className="text-xs text-[#555C78] hover:text-[#FF4F6B] border border-[#222840] hover:border-[#FF4F6B]/30 px-2.5 py-1 rounded transition-all">
          {isPending ? '...' : 'Cancel'}
        </button>
      </td>
    </tr>
  );
}

const HEADERS = ['Market', 'Size', 'Entry', 'Mark', 'Liq Price', 'PnL', 'Action'];

export default function PositionsTable() {
  const { address } = useAccount();
  const { data: positions = [] } = usePositions(address);
  const { data: orders = [] } = useOrders(address);
  const openOrders = orders.filter(o => o.isLimit);

  const tabs = [
    { label: 'Positions', count: positions.length },
    { label: 'Orders',    count: openOrders.length },
  ];
  const [tab, setTab] = require('react').useState(0);

  const totalUpnl = positions.reduce((sum, pos) => {
    const prices_ = usePriceStore.getState().prices;
    const symbol = MARKET_SYMBOLS[pos.marketIndex] || 'BTCUSDT';
    const mark = prices_[symbol] || parseFloat(pos.entryPrice);
    const entry = parseFloat(pos.entryPrice);
    const size = parseFloat(pos.size);
    return sum + (pos.isLong ? (mark - entry) * size / entry : (entry - mark) * size / entry);
  }, 0);

  if (!address) return (
    <div className="h-full flex items-center justify-center text-[#555C78] text-sm">
      Connect wallet to view positions
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + summary */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#222840]">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={clsx('text-xs font-semibold flex items-center gap-1.5 pb-1.5 border-b-2 transition-colors',
              tab === i ? 'border-[#5B7FFF] text-white' : 'border-transparent text-[#555C78] hover:text-[#8A90A8]')}>
            {t.label}
            {t.count > 0 && <span className="bg-[#5B7FFF]/20 text-[#5B7FFF] text-[9px] px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
        {positions.length > 0 && (
          <div className="ml-auto text-xs font-mono">
            <span className="text-[#555C78]">Total PnL: </span>
            <span className={totalUpnl >= 0 ? 'text-[#00D4A0]' : 'text-[#FF4F6B]'}>
              {totalUpnl >= 0 ? '+' : ''}${totalUpnl.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0D0F17] z-10">
            <tr>
              {HEADERS.map(h => (
                <th key={h} className={clsx('px-4 py-2 text-[10px] text-[#555C78] font-semibold uppercase tracking-wide', h === 'Market' ? 'text-left' : 'text-right')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab === 0 && positions.map(pos => <PositionRow key={pos.id} pos={pos} />)}
            {tab === 1 && openOrders.map(o => <OrderRow key={o.id} order={o} />)}
          </tbody>
        </table>

        {tab === 0 && positions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-[#555C78] text-sm gap-2">
            <span className="text-2xl">📊</span>
            No open positions
          </div>
        )}
        {tab === 1 && openOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-[#555C78] text-sm gap-2">
            <span className="text-2xl">📋</span>
            No open orders
          </div>
        )}
      </div>
    </div>
  );
}
