/**
 * ════════════════════════════════════════════════════════════════
 *  STRATEGY: DCA (Dollar-Cost Averaging) Bot
 *
 *  Buys a fixed amount at regular time intervals regardless of price.
 *  Reduces impact of volatility by averaging entry price over time.
 *
 *  HOW IT WORKS:
 *  1. User sets: amount per buy, interval (hourly/daily/weekly), max buys
 *  2. Bot places a market long order every X minutes/hours/days
 *  3. Optionally: only buys when price drops by X% (dip buying)
 *  4. Optionally: takes profit when PnL hits target %
 *
 *  BEST FOR: Long-term accumulation of BTC/ETH/SOL
 *  RISK:     Low — no leverage recommended
 *
 *  CONFIG PARAMS:
 *    amountPerBuy    (number) — USDC per purchase
 *    intervalMinutes (number) — how often to buy (60 = hourly, 1440 = daily)
 *    maxBuys         (number) — stop after N total purchases (0 = unlimited)
 *    dipThreshold    (number) — only buy if price dropped X% since last buy (0 = always)
 *    takeProfitPct   (number) — close all when avg PnL hits X% (0 = never)
 *    leverage        (number) — keep at 1 for DCA
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

class DCAStrategy {
  constructor(config) {
    this.config       = config;
    this.lastBuyTime  = 0;
    this.lastBuyPrice = 0;
    this.totalBuys    = 0;
    this.avgEntry     = 0;
  }

  async tick({ price }) {
    if (!price || price <= 0) return null;

    const {
      amountPerBuy,
      intervalMinutes,
      maxBuys       = 0,
      dipThreshold  = 0,
      takeProfitPct = 0,
      leverage      = 1,
    } = this.config;

    const nowMs       = Date.now();
    const intervalMs  = intervalMinutes * 60 * 1000;
    const timeSinceLast = nowMs - this.lastBuyTime;

    // ── Take profit check ───────────────────────────────────────
    if (takeProfitPct > 0 && this.avgEntry > 0) {
      const pnlPct = ((price - this.avgEntry) / this.avgEntry) * 100;
      if (pnlPct >= takeProfitPct) {
        this.totalBuys  = 0;
        this.avgEntry   = 0;
        this.lastBuyTime = 0;
        return {
          side:      'short',  // close long = open short (in perp terms)
          size:      amountPerBuy * this.totalBuys,
          leverage,
          orderType: 'market',
          reason:    `DCA take profit at ${pnlPct.toFixed(2)}% (avg entry $${this.avgEntry.toFixed(2)})`,
        };
      }
    }

    // ── Max buys reached ────────────────────────────────────────
    if (maxBuys > 0 && this.totalBuys >= maxBuys) return null;

    // ── Interval check ───────────────────────────────────────────
    if (timeSinceLast < intervalMs) return null;

    // ── Dip threshold check ──────────────────────────────────────
    if (dipThreshold > 0 && this.lastBuyPrice > 0) {
      const dropPct = ((this.lastBuyPrice - price) / this.lastBuyPrice) * 100;
      if (dropPct < dipThreshold) {
        return null; // price hasn't dropped enough — skip this interval
      }
    }

    // ── BUY signal ───────────────────────────────────────────────
    this.lastBuyTime  = nowMs;
    this.lastBuyPrice = price;
    this.totalBuys++;

    // Update rolling average entry
    this.avgEntry = this.avgEntry === 0
      ? price
      : (this.avgEntry * (this.totalBuys - 1) + price) / this.totalBuys;

    const intervalLabel = intervalMinutes >= 1440
      ? `${(intervalMinutes / 1440).toFixed(0)}d`
      : intervalMinutes >= 60
        ? `${(intervalMinutes / 60).toFixed(0)}h`
        : `${intervalMinutes}m`;

    return {
      side:      'long',
      size:      amountPerBuy,
      leverage,
      orderType: 'market',
      reason:    `DCA buy #${this.totalBuys} every ${intervalLabel} at $${price.toFixed(2)}`,
    };
  }

  static describe() {
    return {
      name:        'DCA (Dollar-Cost Averaging)',
      description: 'Buys a fixed USDC amount at regular intervals. Reduces volatility impact.',
      bestFor:     'Long-term accumulation',
      risk:        'Low',
      params: [
        { key: 'amountPerBuy',    label: 'Amount Per Buy (USDC)', type: 'number', required: true },
        { key: 'intervalMinutes', label: 'Buy Interval (minutes)', type: 'number', default: 1440, min: 1 },
        { key: 'maxBuys',         label: 'Max Total Buys (0 = unlimited)', type: 'number', default: 0 },
        { key: 'dipThreshold',    label: 'Only buy on dip (% drop, 0 = always)', type: 'number', default: 0 },
        { key: 'takeProfitPct',   label: 'Take profit at (% gain, 0 = never)', type: 'number', default: 0 },
        { key: 'leverage',        label: 'Leverage', type: 'number', default: 1, min: 1, max: 5 },
      ],
    };
  }
}

module.exports = DCAStrategy;
