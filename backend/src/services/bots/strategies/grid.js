/**
 * ════════════════════════════════════════════════════════════════
 *  STRATEGY: Grid Trading Bot
 *
 *  Places a grid of buy and sell limit orders between a price range.
 *  Profits from price oscillation within the range.
 *
 *  HOW IT WORKS:
 *  1. User sets: lower price, upper price, number of grids, total capital
 *  2. Bot divides the range into N equal levels
 *  3. Places buy orders below current price, sell orders above
 *  4. When a buy fills → place a sell one grid above
 *  5. When a sell fills → place a buy one grid below
 *  6. Profit = grid spacing × number of cycles
 *
 *  BEST FOR: Sideways / ranging markets (BTC in consolidation)
 *  RISK:     If price breaks outside range, bot stops profiting
 *
 *  CONFIG PARAMS:
 *    lowerPrice   (number)  — bottom of grid range
 *    upperPrice   (number)  — top of grid range
 *    gridCount    (number)  — number of grid levels (5–100)
 *    totalCapital (number)  — USDC to allocate
 *    leverage     (number)  — 1–10x (keep low for grid)
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

class GridStrategy {
  constructor(config) {
    this.config     = config;
    this.gridLevels = [];     // sorted price levels
    this.filledBuys = new Set();  // grid indices with filled buys
    this.initialized = false;
    this.tickCount   = 0;
    this.lastPrice   = 0;
  }

  // Called every engine tick with { price, config }
  async tick({ price }) {
    if (!price || price <= 0) return null;

    const { lowerPrice, upperPrice, gridCount, totalCapital, leverage = 1 } = this.config;

    // Validate range
    if (price < lowerPrice || price > upperPrice) {
      // Price outside range — bot idles
      return null;
    }

    // Build grid levels on first run
    if (!this.initialized) {
      this._buildGrid(lowerPrice, upperPrice, gridCount);
      this.initialized = true;
      this.lastPrice   = price;
      return null;
    }

    const prevPrice = this.lastPrice;
    this.lastPrice  = price;

    // Capital per grid level
    const capitalPerGrid = totalCapital / gridCount;

    // ── Price crossed DOWN through a grid level → BUY signal
    for (let i = 0; i < this.gridLevels.length; i++) {
      const level = this.gridLevels[i];
      if (prevPrice > level && price <= level && !this.filledBuys.has(i)) {
        this.filledBuys.add(i);
        return {
          side:      'long',
          size:      capitalPerGrid,
          leverage,
          orderType: 'limit',
          price:     level,
          reason:    `Grid buy at level ${i + 1} ($${level.toFixed(2)})`,
        };
      }
    }

    // ── Price crossed UP through a grid level where we have a buy → SELL signal
    for (let i = 0; i < this.gridLevels.length; i++) {
      const level = this.gridLevels[i];
      if (prevPrice <= level && price > level && this.filledBuys.has(i)) {
        this.filledBuys.delete(i);
        const profit = (this.gridLevels[i + 1] - level) / level;
        return {
          side:      'short',
          size:      capitalPerGrid,
          leverage,
          orderType: 'limit',
          price:     this.gridLevels[i + 1] || level * 1.001,
          reason:    `Grid sell at level ${i + 1} ($${level.toFixed(2)}) — est. profit ${(profit * 100).toFixed(3)}%`,
        };
      }
    }

    return null; // no signal this tick
  }

  _buildGrid(lower, upper, count) {
    const step = (upper - lower) / count;
    this.gridLevels = [];
    for (let i = 0; i <= count; i++) {
      this.gridLevels.push(+(lower + step * i).toFixed(8));
    }
  }

  // Human-readable config description
  static describe() {
    return {
      name:        'Grid Trading',
      description: 'Places buy/sell orders at fixed price intervals. Profits from sideways price action.',
      bestFor:     'Ranging markets',
      risk:        'Medium',
      params: [
        { key: 'lowerPrice',   label: 'Lower Price ($)',    type: 'number', required: true  },
        { key: 'upperPrice',   label: 'Upper Price ($)',    type: 'number', required: true  },
        { key: 'gridCount',    label: 'Grid Levels',        type: 'number', default: 20, min: 5, max: 100 },
        { key: 'totalCapital', label: 'Total Capital (USDC)', type: 'number', required: true },
        { key: 'leverage',     label: 'Leverage',           type: 'number', default: 1, min: 1, max: 10 },
      ],
    };
  }
}

module.exports = GridStrategy;
