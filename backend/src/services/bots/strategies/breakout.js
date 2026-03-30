/**
 * ════════════════════════════════════════════════════════════════
 *  STRATEGY: Breakout Bot
 *
 *  Detects when price breaks above resistance or below support
 *  after a period of consolidation, then rides the momentum.
 *
 *  HOW IT WORKS:
 *  1. Tracks the highest high and lowest low over N PRIOR candles
 *  2. If current price closes above the highest high → LONG
 *  3. If current price closes below the lowest low  → SHORT
 *  4. Sets TP at 2× the consolidation range, SL at opposite boundary
 *  5. Volume confirmation: only trades if volume exceeds the average
 *
 *  BEST FOR: Markets about to make a big directional move
 *  RISK:     High — false breakouts are common
 *
 *  CONFIG PARAMS:
 *    lookbackPeriod   (number) — prior candles to find high/low (default 20)
 *    tradeSize        (number) — USDC per trade
 *    leverage         (number) — 1–20x
 *    tpMultiplier     (number) — TP = range × multiplier (default 2.0)
 *    volumeMultiplier (number) — volume must be N× average (0 = skip check)
 *    reentryBlock     (number) — minutes to block re-entry after trade (default 60)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

class BreakoutStrategy {
  constructor(config) {
    this.config      = config;
    this.prices      = [];   // historical prices (EXCLUDING current tick)
    this.volumes     = [];
    this.position    = null;
    this.entryPrice  = 0;
    this.lastTradeMs = 0;
  }

  async tick({ price, change }) {
    if (!price || price <= 0) return null;

    const {
      lookbackPeriod   = 20,
      tradeSize,
      leverage         = 10,
      tpMultiplier     = 2.0,
      volumeMultiplier = 1.5,
      reentryBlock     = 60,
    } = this.config;

    // ── Stop loss / Take profit on open position ─────────────
    if (this.position && this.entryPrice > 0) {
      const range = this._range(lookbackPeriod);
      const sl    = this.position === 'long'
        ? this.entryPrice - range
        : this.entryPrice + range;
      const tp    = this.position === 'long'
        ? this.entryPrice + range * tpMultiplier
        : this.entryPrice - range * tpMultiplier;

      const slHit = this.position === 'long' ? price <= sl : price >= sl;
      const tpHit = this.position === 'long' ? price >= tp : price <= tp;

      if (slHit || tpHit) {
        const reason = slHit ? `Breakout SL` : `Breakout TP +${(tpMultiplier * 100).toFixed(0)}% range`;
        const side    = this.position === 'long' ? 'short' : 'long';
        this.position    = null;
        this.lastTradeMs = Date.now();
        // Append price AFTER exit decision
        this.prices.push(price);
        if (this.prices.length > lookbackPeriod * 2) this.prices.shift();
        return { side, size: tradeSize, leverage, orderType: 'market', reason };
      }
    }

    // ── Compute high/low from PRIOR prices (before this tick) ──
    // We need at least lookbackPeriod prior candles
    if (this.prices.length >= lookbackPeriod) {
      const lookback = this.prices.slice(-lookbackPeriod);
      const highHigh = Math.max(...lookback);
      const lowLow   = Math.min(...lookback);
      const range    = highHigh - lowLow;

      // Re-entry block
      const blockMs = reentryBlock * 60_000;
      const blocked = (Date.now() - this.lastTradeMs) < blockMs;

      // Volume confirmation
      let volOk = true;
      if (volumeMultiplier > 0 && this.volumes.length >= lookbackPeriod) {
        const avgVol  = this.volumes.slice(-lookbackPeriod).reduce((a, b) => a + b, 0) / lookbackPeriod;
        const currVol = Math.abs(change || 0) * price * 1000;
        volOk = currVol >= avgVol * volumeMultiplier;
      }

      if (!this.position && !blocked && range > 0) {
        // ── Upward breakout ─────────────────────────────────
        if (price > highHigh && volOk) {
          this.position    = 'long';
          this.entryPrice  = price;
          this.lastTradeMs = Date.now();
          this.prices.push(price);
          if (this.prices.length > lookbackPeriod * 2) this.prices.shift();
          return {
            side: 'long', size: tradeSize, leverage, orderType: 'market',
            tp:   price + range * tpMultiplier,
            sl:   price - range,
            reason: `Breakout UP $${price.toFixed(2)} > resistance $${highHigh.toFixed(2)} | range $${range.toFixed(2)}`,
          };
        }

        // ── Downward breakout ────────────────────────────────
        if (price < lowLow && volOk) {
          this.position    = 'short';
          this.entryPrice  = price;
          this.lastTradeMs = Date.now();
          this.prices.push(price);
          if (this.prices.length > lookbackPeriod * 2) this.prices.shift();
          return {
            side: 'short', size: tradeSize, leverage, orderType: 'market',
            tp:   price - range * tpMultiplier,
            sl:   price + range,
            reason: `Breakout DOWN $${price.toFixed(2)} < support $${lowLow.toFixed(2)} | range $${range.toFixed(2)}`,
          };
        }
      }
    }

    // Append current price to history for NEXT tick's lookback
    const vol = Math.abs(change || 0) * price * 1000;
    this.prices.push(price);
    this.volumes.push(vol);
    if (this.prices.length  > lookbackPeriod * 2) this.prices.shift();
    if (this.volumes.length > lookbackPeriod * 2) this.volumes.shift();

    return null;
  }

  _range(lookbackPeriod) {
    if (this.prices.length < 2) return this.entryPrice * 0.02;
    const lookback = this.prices.slice(-lookbackPeriod);
    return Math.max(...lookback) - Math.min(...lookback);
  }

  static describe() {
    return {
      name:        'Breakout Bot',
      description: 'Detects resistance/support breaks and rides the momentum. Best before major moves.',
      bestFor:     'Pre-breakout consolidation periods',
      risk:        'High',
      params: [
        { key: 'tradeSize',        label: 'Trade Size (USDC)',           type: 'number', required: true },
        { key: 'lookbackPeriod',   label: 'Lookback Candles',            type: 'number', default: 20, min: 5, max: 100 },
        { key: 'leverage',         label: 'Leverage',                    type: 'number', default: 10, min: 1, max: 25 },
        { key: 'tpMultiplier',     label: 'TP Multiplier (× range)',     type: 'number', default: 2.0 },
        { key: 'volumeMultiplier', label: 'Volume Confirmation (0 = off)',type: 'number', default: 1.5 },
        { key: 'reentryBlock',     label: 'Re-entry Block (minutes)',    type: 'number', default: 60 },
      ],
    };
  }
}

module.exports = BreakoutStrategy;
