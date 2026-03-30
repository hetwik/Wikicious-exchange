import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTradeStore, usePriceStore } from '../../store';
import { usePlaceOrder, useUSDCAllowance, useApproveUSDC, useVaultBalance } from '../../hooks/useContracts';
import { useAccountBalance } from '../../hooks/useApi';
import { parseUnits } from 'viem';
import { CONTRACTS } from '../../config';
import clsx from 'clsx';

const LEVERAGES = [2, 5, 10, 20, 50, 100];

export default function TradeForm() {
  const { address, isConnected } = useAccount();
  const { data: bal } = useAccountBalance(address);

  const {
    selectedSymbol, selectedMarketIndex, side, orderType, leverage, size, price, tpPrice, slPrice,
    setSide, setOrderType, setLeverage, setSize, setPrice, setTpPrice, setSlPrice, reset,
  } = useTradeStore();

  const markPrice  = usePriceStore(s => s.prices[selectedSymbol]) || 0;
  const [showTPSL, setShowTPSL] = useState(false);
  const [placing, setPlacing]   = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { placeMarketOrder, placeLimitOrder, isPending, isSuccess } = usePlaceOrder();
  const { approve, isPending: isApproving } = useApproveUSDC();
  const { data: allowance } = useUSDCAllowance(CONTRACTS.WikiVault);

  const collateral = parseFloat(size) || 0;
  const execPrice  = orderType === 'market' ? markPrice : parseFloat(price) || markPrice;
  const notional   = collateral * leverage;
  const fee        = notional * 0.0005;
  const liqPrice   = useMemo(() => {
    if (!execPrice || !leverage) return 0;
    return side === 'long'
      ? execPrice * (1 - 1/leverage + 0.005)
      : execPrice * (1 + 1/leverage - 0.005);
  }, [execPrice, leverage, side]);

  const freeMargin = parseFloat(bal?.freeMargin || '0');
  const needsApproval = allowance !== undefined && collateral > 0 &&
    allowance < parseUnits(String(collateral + fee + 1), 6);

  const handleSubmit = async () => {
    if (!isConnected) return;
    if (collateral <= 0) { setFeedback({ type:'error', msg:'Enter collateral amount' }); return; }
    if (collateral > freeMargin) { setFeedback({ type:'error', msg:'Insufficient margin. Deposit first.' }); return; }

    setFeedback(null);
    try {
      if (orderType === 'market') {
        placeMarketOrder({
          marketIndex: selectedMarketIndex,
          isLong: side === 'long',
          collateral,
          leverage,
          takeProfit: tpPrice ? parseFloat(tpPrice) : 0,
          stopLoss:   slPrice ? parseFloat(slPrice)  : 0,
        });
      } else {
        placeLimitOrder({
          marketIndex: selectedMarketIndex,
          isLong: side === 'long',
          collateral,
          leverage,
          limitPrice: parseFloat(price) || markPrice,
          takeProfit: tpPrice ? parseFloat(tpPrice) : 0,
          stopLoss:   slPrice ? parseFloat(slPrice)  : 0,
        });
      }
      setFeedback({ type:'success', msg:'Order submitted!' });
      reset();
    } catch(e) {
      setFeedback({ type:'error', msg: e.shortMessage || e.message });
    }
  };

  if (!isConnected) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div className="text-[#555C78] text-sm text-center mb-2">Connect your wallet to trade</div>
      <ConnectButton />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Long / Short */}
      <div className="grid grid-cols-2 gap-1.5">
        {['long','short'].map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={clsx(
              'py-2.5 rounded-lg text-sm font-bold transition-all border',
              side === s
                ? s === 'long'
                  ? 'bg-[#00D4A0]/15 border-[#00D4A0] text-[#00D4A0]'
                  : 'bg-[#FF4F6B]/15 border-[#FF4F6B] text-[#FF4F6B]'
                : 'border-[#222840] text-[#555C78] hover:text-[#8A90A8]'
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Order type */}
      <div className="grid grid-cols-3 gap-1">
        {['market','limit','stop'].map(t => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={clsx(
              'py-1.5 text-xs rounded border transition-colors',
              orderType === t
                ? 'bg-[#1E2330] border-[#5B7FFF] text-white'
                : 'border-[#222840] text-[#555C78] hover:text-[#8A90A8]'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Collateral */}
      <div>
        <label className="text-[10px] text-[#555C78] mb-1 block">Collateral (USDC)</label>
        <div className="relative">
          <input
            type="number" min="0" placeholder="0.00"
            value={size}
            onChange={e => setSize(e.target.value)}
            className="w-full bg-[#12151F] border border-[#222840] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:border-[#5B7FFF] outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#555C78]">USDC</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#555C78]">Available: ${freeMargin.toFixed(2)}</span>
          <div className="flex gap-1">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setSize((freeMargin * pct / 100).toFixed(2))}
                className="text-[10px] text-[#5B7FFF] hover:text-white px-1 py-0.5 rounded bg-[#5B7FFF]/10">
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Limit price */}
      {orderType !== 'market' && (
        <div>
          <label className="text-[10px] text-[#555C78] mb-1 block">Limit Price</label>
          <input
            type="number" placeholder={markPrice.toFixed(2)}
            value={price} onChange={e => setPrice(e.target.value)}
            className="w-full bg-[#12151F] border border-[#222840] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:border-[#5B7FFF] outline-none"
          />
        </div>
      )}

      {/* Leverage */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[10px] text-[#555C78]">Leverage</label>
          <span className="text-xs font-mono text-[#5B7FFF] font-bold">{leverage}×</span>
        </div>
        <input type="range" min={1} max={100} value={leverage}
          onChange={e => setLeverage(parseInt(e.target.value))}
          className="w-full accent-[#5B7FFF] h-1.5"
        />
        <div className="flex gap-1 mt-1.5">
          {LEVERAGES.map(l => (
            <button key={l} onClick={() => setLeverage(l)}
              className={clsx('flex-1 text-[10px] py-1 rounded border transition-colors',
                leverage === l ? 'border-[#5B7FFF] text-[#5B7FFF] bg-[#5B7FFF]/10' : 'border-[#222840] text-[#555C78]')}>
              {l}×
            </button>
          ))}
        </div>
      </div>

      {/* TP/SL toggle */}
      <button onClick={() => setShowTPSL(!showTPSL)}
        className="flex items-center gap-2 text-[11px] text-[#5B7FFF] hover:text-white transition-colors">
        <span className={`transition-transform ${showTPSL ? 'rotate-90' : ''}`}>▶</span>
        Take Profit / Stop Loss
      </button>

      {showTPSL && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#555C78] mb-1 block">Take Profit</label>
            <input type="number" placeholder="0.00" value={tpPrice} onChange={e => setTpPrice(e.target.value)}
              className="w-full bg-[#12151F] border border-[#222840] rounded-lg px-2 py-2 text-xs text-[#00D4A0] font-mono focus:border-[#00D4A0] outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#555C78] mb-1 block">Stop Loss</label>
            <input type="number" placeholder="0.00" value={slPrice} onChange={e => setSlPrice(e.target.value)}
              className="w-full bg-[#12151F] border border-[#222840] rounded-lg px-2 py-2 text-xs text-[#FF4F6B] font-mono focus:border-[#FF4F6B] outline-none" />
          </div>
        </div>
      )}

      {/* Summary */}
      {collateral > 0 && (
        <div className="bg-[#12151F] rounded-lg p-3 text-[11px] font-mono space-y-1.5 border border-[#222840]">
          {[
            ['Position Size', `$${notional.toFixed(2)}`],
            ['Entry Price',   `$${execPrice.toFixed(2)}`],
            ['Liq. Price',    `$${liqPrice.toFixed(2)}`],
            ['Fee (0.05%)',   `$${fee.toFixed(4)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#555C78]">{k}</span>
              <span className="text-[#8A90A8]">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={clsx('text-xs px-3 py-2 rounded-lg', feedback.type === 'error' ? 'bg-[#FF4F6B]/10 text-[#FF4F6B]' : 'bg-[#00D4A0]/10 text-[#00D4A0]')}>
          {feedback.msg}
        </div>
      )}

      {/* Approve / Submit */}
      {needsApproval ? (
        <button onClick={() => approve(CONTRACTS.WikiVault, parseUnits('999999999', 6))}
          disabled={isApproving}
          className="py-3 rounded-lg font-bold text-sm bg-[#5B7FFF] hover:bg-[#7B9FFF] text-white disabled:opacity-50 transition-colors">
          {isApproving ? 'Approving...' : 'Approve USDC'}
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isPending || collateral <= 0}
          className={clsx(
            'py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50',
            side === 'long'
              ? 'bg-[#00D4A0] hover:bg-[#00EBB0] text-[#001A12]'
              : 'bg-[#FF4F6B] hover:bg-[#FF6F88] text-white'
          )}
        >
          {isPending
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Confirming...
              </span>
            : `${side === 'long' ? 'Long' : 'Short'} ${selectedSymbol.replace('USDT','')}`}
        </button>
      )}
    </div>
  );
}
