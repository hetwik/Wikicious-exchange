/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS BACKEND — Price Service
 *
 *  Connects to Binance WebSocket (wss://stream.binance.com) to get
 *  real-time prices for 100+ crypto pairs.
 *
 *  If Binance WS disconnects, falls back to simulated prices
 *  so the app keeps working during network issues.
 *
 *  Usage:
 *    const prices = require('./prices');
 *    prices.start();
 *    prices.getPrice('BTCUSDT'); // → 67420.5
 *    prices.on('update', (updates) => { ... });
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

const WebSocket    = require('ws');
const EventEmitter = require('events');

// ── Tracked Symbols ───────────────────────────────────────────────
// All Binance USDT perpetual pairs we support.
// The !miniTicker@arr stream sends ALL pairs — we filter to these.
const TRACKED_PAIRS = [
  // Majors
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
  'AVAXUSDT', 'DOGEUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'UNIUSDT',

  // Layer 2s & DeFi
  'ARBUSDT', 'OPUSDT', 'LDOUSDT', 'GMXUSDT', 'DYDXUSDT', 'STXUSDT',

  // Alt L1s
  'NEARUSDT', 'APTUSDT', 'SUIUSDT', 'SEIUSDT', 'INJUSDT', 'TIAUSDT',

  // DeFi blue chips
  'AAVEUSDT', 'MKRUSDT', 'COMPUSDT', 'CRVUSDT', 'SNXUSDT', 'YFIUSDT',

  // Memes
  'SHIBUSDT', 'PEPEUSDT', 'BONKUSDT', 'WIFUSDT', 'FLOKIUSDT',

  // Gaming / NFT
  'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'GALAUSDT', 'APUSDT',

  // Others
  'ATOMUSDT', 'LTCUSDT', 'ETCUSDT', 'XLMUSDT', 'ALGOUSDT',
  'RUNEUSDT', 'GRTUSDT', 'FETUSDT', 'RENDERUSDT', 'FTMUSDT',
  'JUPUSDT', 'PYTHUSDT', 'ORDIUSDT', 'WLDUSDT', 'ENAUSDT',
];

// ── Fallback seed prices (used when Binance WS is offline) ────────
const SEED_PRICES = {
  BTCUSDT: 67420, ETHUSDT: 3842,  BNBUSDT: 580,  SOLUSDT: 184,
  XRPUSDT: 0.72,  ADAUSDT: 0.62,  ARBUSDT: 1.84, OPUSDT:  3.21,
  AVAXUSDT: 42,   LINKUSDT: 18,   MATICUSDT: 0.91, GMXUSDT: 28,
  DOGEUSDT: 0.18, NEARUSDT: 7.8,  INJUSDT: 28,   LDOUSDT: 2.8,
  APTUSDT: 9.5,   UNIUSDT: 11.2,  AAVEUSDT: 105, MKRUSDT: 2800,
};


class PriceService extends EventEmitter {
  constructor() {
    super();
    this.prices  = {};   // symbol → current price (number)
    this.changes = {};   // symbol → 24h change % (number)
    this.volumes = {};   // symbol → 24h quote volume (number)

    this._ws             = null;
    this._reconnectTimer = null;
    this._simInterval    = null;
    this._isConnected    = false;
  }

  // ── Public API ────────────────────────────────────────────────

  /** Start the price service. Call once at startup. */
  start() {
    this._connectBinance();
    console.log('📡 Price service starting…');
  }

  /** Stop all connections and timers. */
  stop() {
    if (this._ws)             this._ws.close();
    if (this._simInterval)    clearInterval(this._simInterval);
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
  }

  /** Get the latest price for a symbol, or null if unknown. */
  getPrice(symbol) {
    return this.prices[symbol] ?? null;
  }

  /** Get 24h price change % for a symbol. */
  getChange(symbol) {
    return this.changes[symbol] ?? 0;
  }

  /** Get 24h quote volume for a symbol. */
  getVolume(symbol) {
    return this.volumes[symbol] ?? 0;
  }

  /** Get all current prices as { symbol: price } */
  getAllPrices() {
    return { ...this.prices };
  }


  // ── Binance WebSocket ─────────────────────────────────────────

  _connectBinance() {
    // !miniTicker@arr streams a 24h mini-ticker for ALL symbols every second
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr', {
      handshakeTimeout: 10_000,
    });

    this._ws = ws;

    ws.on('open', () => {
      this._isConnected = true;

      // Stop simulator if it was running
      if (this._simInterval) {
        clearInterval(this._simInterval);
        this._simInterval = null;
      }

      console.log('✅ Connected to Binance WebSocket price feed');
    });

    ws.on('message', (raw) => {
      try {
        const tickers = JSON.parse(raw);
        if (!Array.isArray(tickers)) return;

        const updates = {};

        for (const ticker of tickers) {
          // Only track symbols we care about
          if (!TRACKED_PAIRS.includes(ticker.s)) continue;

          const price = parseFloat(ticker.c); // current close price
          if (price <= 0) continue;

          const prevPrice = this.prices[ticker.s];
          this.prices[ticker.s]  = price;
          this.changes[ticker.s] = parseFloat(ticker.P); // 24h change %
          this.volumes[ticker.s] = parseFloat(ticker.q); // 24h quote volume

          // Only include in update if price actually changed
          if (prevPrice !== price) {
            updates[ticker.s] = price;
          }
        }

        if (Object.keys(updates).length > 0) {
          this.emit('update', updates);
        }
      } catch { /* ignore malformed frames */ }
    });

    ws.on('close', () => {
      this._isConnected = false;
      console.warn('⚠️  Binance WS disconnected — using simulated prices');
      this._startSimulator();
      // Reconnect after 5 seconds
      this._reconnectTimer = setTimeout(() => this._connectBinance(), 5_000);
    });

    ws.on('error', () => ws.close());
  }


  // ── Fallback Simulator ────────────────────────────────────────
  // Simulates realistic price movement when Binance WS is offline.
  // Prices drift ±0.1% per tick so charts still render.

  _startSimulator() {
    if (this._simInterval) return; // already running

    // Seed with known prices if we don't have live data yet
    for (const [symbol, price] of Object.entries(SEED_PRICES)) {
      if (!this.prices[symbol]) {
        this.prices[symbol]  = price;
        this.changes[symbol] = 0;
      }
    }

    this._simInterval = setInterval(() => {
      const updates = {};

      for (const [symbol, price] of Object.entries(this.prices)) {
        // Random walk: ±0.1% per tick (300ms)
        const drift = (Math.random() - 0.499) * price * 0.001;
        const newPrice = Math.max(0.000001, price + drift);
        this.prices[symbol] = newPrice;
        updates[symbol]     = newPrice;
      }

      this.emit('update', updates);
    }, 300);
  }
}


// Export a single shared instance — the whole app shares one price feed
module.exports = new PriceService();
