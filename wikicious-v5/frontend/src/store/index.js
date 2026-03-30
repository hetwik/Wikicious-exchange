/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS FRONTEND — Global State (Zustand)
 *
 *  Three stores:
 *  1. usePriceStore  — live prices from WebSocket
 *  2. useTradeStore  — trading panel form state
 *  3. useUIStore     — UI preferences (sidebar, chart interval, tab)
 *
 *  Usage:
 *    const price = usePriceStore(s => s.prices['BTCUSDT']);
 *    const { side, setSide } = useTradeStore();
 * ════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { WS_URL } from '../config';


// ── 1. Price Store ────────────────────────────────────────────────
// Holds live prices fed from the backend WebSocket.
// Components can subscribe to individual symbols to avoid re-renders.
export const usePriceStore = create(subscribeWithSelector((set, get) => ({

  prices:  {},     // { BTCUSDT: 67420, ETHUSDT: 3842, ... }
  changes: {},     // { BTCUSDT: 1.24, ... }  (24h change %)
  volumes: {},     // { BTCUSDT: 1234567, ... } (24h volume)
  ws:      null,   // active WebSocket instance
  wsReady: false,  // true when WS is open and subscribed

  // ── Actions ──

  setPrice:  (symbol, price)  => set(s => ({ prices: { ...s.prices,  [symbol]: price  } })),
  setPrices: (updates)        => set(s => ({ prices: { ...s.prices,  ...updates       } })),

  /** Get price for a symbol (returns 0 if not loaded yet). */
  getPrice: (symbol) => get().prices[symbol] ?? 0,

  /** Connect to backend WebSocket. Reconnects automatically on close. */
  connectWs() {
    // Don't open a second connection if one is already open
    if (get().ws?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      set({ wsReady: true });
      // Subscribe to all channels
      ws.send(JSON.stringify({
        type:     'subscribe',
        channels: ['ticker', 'positions', 'liquidations', 'funding'],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Ticker messages update the price store
        if (msg.type === 'ticker') {
          set(s => ({ prices: { ...s.prices, ...msg.data } }));
        }

        // Dispatch message to all subscribed listeners
        get()._listeners?.forEach(fn => fn(msg));
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      set({ wsReady: false, ws: null });
      // Auto-reconnect after 3 seconds
      setTimeout(() => get().connectWs(), 3_000);
    };

    ws.onerror = () => ws.close();

    set({ ws });
  },

  // Internal listener set — do not use directly
  _listeners: new Set(),

  /** Subscribe to raw WS messages. Returns an unsubscribe function. */
  subscribe(fn) {
    const listeners = get()._listeners;
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
})));


// ── 2. Trade Store ────────────────────────────────────────────────
// Holds the state of the trade form panel.
// All fields map directly to the placeMarketOrder / placeLimitOrder inputs.
export const useTradeStore = create((set) => ({

  // Selected market
  selectedSymbol:      'BTCUSDT',
  selectedMarketIndex: 0,

  // Order inputs
  side:       'long',    // 'long' | 'short'
  orderType:  'market',  // 'market' | 'limit'
  leverage:   10,        // 1–125
  size:       '',        // collateral in USDC (string for input)
  price:      '',        // limit price (string, only used for limit orders)
  tpPrice:    '',        // take-profit price (optional)
  slPrice:    '',        // stop-loss price (optional)
  reduceOnly: false,     // if true, order can only reduce an existing position

  // ── Actions ──
  setSymbol:     (symbol, idx) => set({ selectedSymbol: symbol, selectedMarketIndex: idx }),
  setSide:       (side)        => set({ side }),
  setOrderType:  (orderType)   => set({ orderType }),
  setLeverage:   (leverage)    => set({ leverage }),
  setSize:       (size)        => set({ size }),
  setPrice:      (price)       => set({ price }),
  setTpPrice:    (tpPrice)     => set({ tpPrice }),
  setSlPrice:    (slPrice)     => set({ slPrice }),
  setReduceOnly: (reduceOnly)  => set({ reduceOnly }),

  /** Clear all form inputs after placing an order. */
  reset: () => set({ size: '', price: '', tpPrice: '', slPrice: '', reduceOnly: false }),
}));


// ── 3. UI Store ───────────────────────────────────────────────────
// Holds UI preferences that affect layout and display.
export const useUIStore = create((set) => ({

  sidebarOpen:   true,
  theme:         'dark',
  chartInterval: '1h',   // '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  activeTab:     'chart', // 'chart' | 'orderbook' | 'trades'

  // ── Actions ──
  setSidebarOpen:   (v) => set({ sidebarOpen: v }),
  setChartInterval: (v) => set({ chartInterval: v }),
  setActiveTab:     (v) => set({ activeTab: v }),
}));
