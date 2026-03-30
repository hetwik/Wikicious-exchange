import { useEffect, useRef, useCallback } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useCandles } from '../../hooks/useApi';
import { usePriceStore } from '../../store';

const INTERVALS = ['1m','5m','15m','1h','4h','1d','1w'];

const CHART_OPTS = {
  layout: { background: { color: '#0D0F17' }, textColor: '#8A90A8' },
  grid: { vertLines: { color: '#1a1e2e', style: LineStyle.Dotted }, horzLines: { color: '#1a1e2e', style: LineStyle.Dotted } },
  crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#5B7FFF44', width: 1 }, horzLine: { color: '#5B7FFF44', width: 1 } },
  rightPriceScale: { borderColor: '#222840', textColor: '#555C78' },
  timeScale: { borderColor: '#222840', timeVisible: true, secondsVisible: false },
};

export default function CandleChart({ symbol, interval, onIntervalChange }) {
  const chartRef = useRef(null);
  const chart    = useRef(null);
  const candleSeries = useRef(null);
  const volumeSeries = useRef(null);
  const currentPrice = usePriceStore(s => s.prices[symbol]);
  const { data: candles, isLoading } = useCandles(symbol, interval);

  // Init chart
  useEffect(() => {
    if (!chartRef.current) return;
    chart.current = createChart(chartRef.current, {
      ...CHART_OPTS,
      width:  chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    });

    candleSeries.current = chart.current.addCandlestickSeries({
      upColor:          '#00D4A0',
      downColor:        '#FF4F6B',
      borderUpColor:    '#00D4A0',
      borderDownColor:  '#FF4F6B',
      wickUpColor:      '#00D4A080',
      wickDownColor:    '#FF4F6B80',
    });

    volumeSeries.current = chart.current.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: '#5B7FFF22',
    });
    chart.current.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    const ro = new ResizeObserver(() => {
      if (chartRef.current && chart.current) {
        chart.current.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
      }
    });
    ro.observe(chartRef.current);
    return () => { ro.disconnect(); chart.current?.remove(); };
  }, []);

  // Load candles
  useEffect(() => {
    if (!candles || !candleSeries.current) return;
    const cData = candles.map(c => ({
      time:  Math.floor(c.open_time / 1000),
      open:  c.open, high: c.high, low: c.low, close: c.close,
    })).sort((a, b) => a.time - b.time);

    const vData = candles.map(c => ({
      time:  Math.floor(c.open_time / 1000),
      value: c.volume,
      color: c.close >= c.open ? '#00D4A022' : '#FF4F6B22',
    })).sort((a, b) => a.time - b.time);

    candleSeries.current.setData(cData);
    volumeSeries.current.setData(vData);
    chart.current?.timeScale().fitContent();
  }, [candles]);

  // Live price tick
  useEffect(() => {
    if (!currentPrice || !candleSeries.current || !candles?.length) return;
    const last = candles[candles.length - 1];
    if (!last) return;
    const itvMs = { '1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000,'1w':604800000 };
    const ms = itvMs[interval] || 3600000;
    const bucket = Math.floor(Date.now() / ms) * ms;
    candleSeries.current.update({
      time:  Math.floor(bucket / 1000),
      open:  last.open,
      high:  Math.max(last.high, currentPrice),
      low:   Math.min(last.low, currentPrice),
      close: currentPrice,
    });
  }, [currentPrice, interval, candles]);

  return (
    <div className="flex flex-col h-full bg-[#0D0F17]">
      {/* Interval selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#222840]">
        {INTERVALS.map(iv => (
          <button
            key={iv}
            onClick={() => onIntervalChange(iv)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              interval === iv
                ? 'bg-[#1E2330] text-white'
                : 'text-[#555C78] hover:text-[#8A90A8]'
            }`}
          >
            {iv}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs font-mono">
          {candles?.[candles.length-1] && (() => {
            const c = candles[candles.length-1];
            const isUp = c.close >= c.open;
            return <>
              <span className="text-[#555C78]">O <span className={isUp?'text-[#00D4A0]':'text-[#FF4F6B]'}>{c.open?.toFixed(2)}</span></span>
              <span className="text-[#555C78]">H <span className="text-[#8A90A8]">{c.high?.toFixed(2)}</span></span>
              <span className="text-[#555C78]">L <span className="text-[#8A90A8]">{c.low?.toFixed(2)}</span></span>
              <span className="text-[#555C78]">C <span className={isUp?'text-[#00D4A0]':'text-[#FF4F6B]'}>{currentPrice?.toFixed(2)||c.close?.toFixed(2)}</span></span>
            </>;
          })()}
        </div>
      </div>
      {/* Chart */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-[#5B7FFF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
