/**
 * ════════════════════════════════════════════════════════════════
 *  STRATEGY: RSI (Relative Strength Index) Bot
 *
 *  Uses the RSI momentum oscillator to identify overbought/oversold.
 *
 *  HOW IT WORKS:
 *  1. Calculates RSI over N candles (default: 14)
 *  2. RSI < oversoldLevel (default 30) → BUY (price is oversold)
 *  3. RSI > overboughtLevel (default 70) → SELL (price is overbought)
 *  4. Exits when RSI crosses back to neutral (default 50)
 *
 *  BEST FOR: Mean-reversion on high-liquidity pairs (BTC, ETH)
 *  RISK:     Medium — RSI can stay extreme during strong trends
 *
 *  CONFIG PARAMS:
 *    rsiPeriod       (number) — candles for RSI calculation (default 14)
 *    oversoldLevel   (number) — RSI level to buy at (default 30)
 *    overboughtLevel (number) — RSI level to sell at (default 70)
 *    tradeSize       (number) — USDC per trade
 *    leverage        (number) — 1–20x
 *    stopLossPct     (number) — stop loss % below entry (default 3%)
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

class RSIStrategy {
  constructor(config) {
    this.config    = config;
    this.prices    = [];     // rolling price history
    this.position  = null;   // current open position side ('long'|'short'|null)
    this.entryPrice = 0;
  }

  async tick({ price }) {
    if (!price || price <= 0) return null;

    const {
      rsiPeriod       = 14,
      oversoldLevel   = 30,
      overboughtLevel = 70,
      neutralLevel    = 50,
      tradeSize,
      leverage        = 5,
      stopLossPct     = 3,
    } = this.config;

    // Accumulate price history
    this.prices.push(price);
    if (this.prices.length > rsiPeriod * 3) {
      this.prices.shift(); // keep last 3× period for accuracy
    }

    // Need at least rsiPeriod + 1 data points
    if (this.prices.length < rsiPeriod + 1) return null;

    const rsi = this._calculateRSI(this.prices, rsiPeriod);

    // ── Stop loss check ─────────────────────────────────────────
    if (this.position && this.entryPrice > 0) {
      const pnlPct = this.position === 'long'
        ? ((price - this.entryPrice) / this.entryPrice) * 100
        : ((this.entryPrice - price) / this.entryPrice) * 100;

      if (pnlPct <= -stopLossPct) {
        const closeSide = this.position === 'long' ? 'short' : 'long';
        this.position   = null;
        this.entryPrice = 0;
        return {
          side:      closeSide,
          size:      tradeSize,
          leverage,
          orderType: 'market',
          reason:    `RSI stop loss hit — loss ${pnlPct.toFixed(2)}% | RSI: ${rsi.toFixed(1)}`,
        };
      }
    }

    // ── Exit position when RSI returns to neutral ────────────────
    if (this.position === 'long' && rsi >= neutralLevel) {
      this.position = null;
      return {
        side:      'short',
        size:      tradeSize,
        leverage,
        orderType: 'market',
        reason:    `RSI exit long — RSI back to neutral (${rsi.toFixed(1)})`,
      };
    }

    if (this.position === 'short' && rsi <= neutralLevel) {
      this.position = null;
      return {
        side:      'long',
        size:      tradeSize,
        leverage,
        orderType: 'market',
        reason:    `RSI exit short — RSI back to neutral (${rsi.toFixed(1)})`,
      };
    }

    // ── Entry signals ─────────────────────────────────────────────
    if (!this.position && rsi <= oversoldLevel) {
      this.position   = 'long';
      this.entryPrice = price;
      return {
        side:      'long',
        size:      tradeSize,
        leverage,
        orderType: 'market',
        sl:        price * (1 - stopLossPct / 100),
        reason:    `RSI oversold (${rsi.toFixed(1)} < ${oversoldLevel}) — going long`,
      };
    }

    if (!this.position && rsi >= overboughtLevel) {
      this.position   = 'short';
      this.entryPrice = price;
      return {
        side:      'short',
        size:      tradeSize,
        leverage,
        orderType: 'market',
        sl:        price * (1 + stopLossPct / 100),
        reason:    `RSI overbought (${rsi.toFixed(1)} > ${overboughtLevel}) — going short`,
      };
    }

    return null;
  }

  // Standard RSI formula: RS = avg gain / avg loss
  _calculateRSI(prices, period) {
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains  += diff;
      else          losses -= diff;
    }
    const avgGain = gains  / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  static describe() {
    return {
      name:        'RSI Bot',
      description: 'Buys when RSI is oversold (<30), sells when overbought (>70). Classic mean-reversion.',
      bestFor:     'Ranging to mildly trending markets',
      risk:        'Medium',
      params: [
        { key: 'tradeSize',       label: 'Trade Size (USDC)',      type: 'number', required: true },
        { key: 'rsiPeriod',       label: 'RSI Period',             type: 'number', default: 14, min: 5, max: 50 },
        { key: 'oversoldLevel',   label: 'Oversold Level',         type: 'number', default: 30, min: 10, max: 45 },
        { key: 'overboughtLevel', label: 'Overbought Level',       type: 'number', default: 70, min: 55, max: 90 },
        { key: 'leverage',        label: 'Leverage',               type: 'number', default: 5, min: 1, max: 20 },
        { key: 'stopLossPct',     label: 'Stop Loss %',            type: 'number', default: 3 },
      ],
    };
  }
}

module.exports = RSIStrategy;
