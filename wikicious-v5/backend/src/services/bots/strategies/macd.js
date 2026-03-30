/**
 * ════════════════════════════════════════════════════════════════
 *  STRATEGY: MACD (Moving Average Convergence Divergence) Bot
 *
 *  Trend-following strategy. Trades when the MACD line crosses
 *  the signal line — the classic momentum crossover signal.
 *
 *  HOW IT WORKS:
 *  MACD Line   = EMA(12) - EMA(26)        fast minus slow EMA
 *  Signal Line = EMA(9) of MACD Line      smoothed MACD
 *  Histogram   = MACD Line - Signal Line  divergence bar
 *
 *  BUY  when MACD crosses ABOVE signal (bullish crossover)
 *  SELL when MACD crosses BELOW signal (bearish crossover)
 *
 *  Optional confirmation: only trade if histogram is expanding
 *  (momentum is increasing, not just a weak cross)
 *
 *  BEST FOR: Trending markets (BTC trending up or down)
 *  RISK:     Whipsaws badly in sideways markets
 *
 *  CONFIG PARAMS:
 *    fastPeriod    (number) — fast EMA period   (default 12)
 *    slowPeriod    (number) — slow EMA period   (default 26)
 *    signalPeriod  (number) — signal EMA period (default 9)
 *    tradeSize     (number) — USDC per trade
 *    leverage      (number) — 1–20x
 *    stopLossPct   (number) — stop loss % from entry (default 2%)
 *    minHistogram  (number) — min histogram strength to trade (default 0 = any)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

class MACDStrategy {
  constructor(config) {
    this.config      = config;
    this.prices      = [];
    this.macdHistory = [];   // last 3 MACD values to detect crossover direction
    this.position    = null; // 'long' | 'short' | null
    this.entryPrice  = 0;
  }

  async tick({ price }) {
    if (!price || price <= 0) return null;

    const {
      fastPeriod   = 12,
      slowPeriod   = 26,
      signalPeriod = 9,
      tradeSize,
      leverage     = 5,
      stopLossPct  = 2,
      minHistogram = 0,
    } = this.config;

    // Need enough prices to compute slow EMA + signal
    const needed = slowPeriod + signalPeriod + 5;
    this.prices.push(price);
    if (this.prices.length > needed * 2) this.prices.shift();
    if (this.prices.length < needed)     return null;

    // ── Calculate MACD ───────────────────────────────────────────
    const fastEMA   = this._ema(this.prices, fastPeriod);
    const slowEMA   = this._ema(this.prices, slowPeriod);
    const macdLine  = fastEMA - slowEMA;

    // Build MACD history for signal EMA calculation
    this.macdHistory.push(macdLine);
    if (this.macdHistory.length > signalPeriod * 3) this.macdHistory.shift();
    if (this.macdHistory.length < signalPeriod + 1) return null;

    const signalLine = this._ema(this.macdHistory, signalPeriod);
    const histogram  = macdLine - signalLine;
    const prevMacd   = this.macdHistory[this.macdHistory.length - 2];
    const prevSignal = this._ema(this.macdHistory.slice(0, -1), signalPeriod);

    const bullishCross = prevMacd <= prevSignal && macdLine > signalLine;
    const bearishCross = prevMacd >= prevSignal && macdLine < signalLine;

    // ── Stop loss ────────────────────────────────────────────────
    if (this.position && this.entryPrice > 0) {
      const pnl = this.position === 'long'
        ? ((price - this.entryPrice) / this.entryPrice) * 100
        : ((this.entryPrice - price) / this.entryPrice) * 100;
      if (pnl <= -stopLossPct) {
        const side     = this.position === 'long' ? 'short' : 'long';
        this.position  = null;
        this.entryPrice = 0;
        return { side, size: tradeSize, leverage, orderType: 'market',
          reason: `MACD SL — loss ${pnl.toFixed(2)}% | MACD ${macdLine.toFixed(4)}` };
      }
    }

    // ── Exit on opposite cross ────────────────────────────────────
    if (this.position === 'long' && bearishCross) {
      this.position = null;
      return { side: 'short', size: tradeSize, leverage, orderType: 'market',
        reason: `MACD bearish cross — exit long | hist ${histogram.toFixed(4)}` };
    }
    if (this.position === 'short' && bullishCross) {
      this.position = null;
      return { side: 'long', size: tradeSize, leverage, orderType: 'market',
        reason: `MACD bullish cross — exit short | hist ${histogram.toFixed(4)}` };
    }

    // ── Entry signals ─────────────────────────────────────────────
    if (!this.position && bullishCross && Math.abs(histogram) >= minHistogram) {
      this.position   = 'long';
      this.entryPrice = price;
      return { side: 'long', size: tradeSize, leverage, orderType: 'market',
        sl: price * (1 - stopLossPct / 100),
        reason: `MACD bullish cross ↑ | MACD ${macdLine.toFixed(4)} > Signal ${signalLine.toFixed(4)}` };
    }
    if (!this.position && bearishCross && Math.abs(histogram) >= minHistogram) {
      this.position   = 'short';
      this.entryPrice = price;
      return { side: 'short', size: tradeSize, leverage, orderType: 'market',
        sl: price * (1 + stopLossPct / 100),
        reason: `MACD bearish cross ↓ | MACD ${macdLine.toFixed(4)} < Signal ${signalLine.toFixed(4)}` };
    }

    return null;
  }

  // Exponential Moving Average
  _ema(data, period) {
    const k = 2 / (period + 1);
    let ema  = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  static describe() {
    return {
      name:        'MACD Bot',
      description: 'Trades MACD crossovers — buys on bullish cross, sells on bearish. Classic trend-follower.',
      bestFor:     'Trending markets',
      risk:        'Medium-High',
      params: [
        { key: 'tradeSize',    label: 'Trade Size (USDC)', type: 'number', required: true },
        { key: 'fastPeriod',   label: 'Fast EMA Period',   type: 'number', default: 12, min: 5,  max: 50 },
        { key: 'slowPeriod',   label: 'Slow EMA Period',   type: 'number', default: 26, min: 10, max: 100 },
        { key: 'signalPeriod', label: 'Signal Period',     type: 'number', default: 9,  min: 3,  max: 30 },
        { key: 'leverage',     label: 'Leverage',          type: 'number', default: 5,  min: 1,  max: 20 },
        { key: 'stopLossPct',  label: 'Stop Loss %',       type: 'number', default: 2 },
        { key: 'minHistogram', label: 'Min Histogram Strength (0 = any)', type: 'number', default: 0 },
      ],
    };
  }
}

module.exports = MACDStrategy;
