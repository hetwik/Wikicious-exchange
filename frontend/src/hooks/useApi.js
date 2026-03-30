/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS FRONTEND — API Hooks
 *
 *  All backend API calls are made through these React Query hooks.
 *  Data is cached, refetched on interval, and shared across components.
 *
 *  Auth token is automatically attached to every request via interceptor.
 *
 *  Usage example:
 *    const { data: markets } = useMarkets();
 *    const { data: positions } = usePositions(walletAddress);
 * ════════════════════════════════════════════════════════════════
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useRef } from 'react';
import { API_URL, WS_URL } from '../config';
import { usePriceStore } from '../store';


// ── Axios Instance ────────────────────────────────────────────────
// Shared across all hooks. Automatically attaches JWT token.
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wik_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


// ── Auth ──────────────────────────────────────────────────────────

/** Log in with email + password. Saves JWT to localStorage. */
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }) =>
      api.post('/api/auth/login', { email, password }).then(r => r.data),
    onSuccess: (data) => {
      localStorage.setItem('wik_token', data.token);
    },
  });
}

/** Register a new account. Saves JWT to localStorage on success. */
export function useRegister() {
  return useMutation({
    mutationFn: (body) =>
      api.post('/api/auth/register', body).then(r => r.data),
    onSuccess: (data) => {
      localStorage.setItem('wik_token', data.token);
    },
  });
}

/** Fetch the current logged-in user's profile. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get('/api/auth/me').then(r => r.data),
    retry:    false, // don't retry on 401 — user is not logged in
  });
}


// ── Markets ───────────────────────────────────────────────────────

/** All markets with mark price, 24h change, and open interest. */
export function useMarkets() {
  return useQuery({
    queryKey:        ['markets'],
    queryFn:         () => api.get('/api/markets').then(r => r.data),
    refetchInterval: 5_000,  // re-fetch every 5 seconds
    staleTime:       1_000,
  });
}

/** OHLCV candles for a market. Interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' */
export function useCandles(symbol, interval = '1h', limit = 200) {
  return useQuery({
    queryKey:        ['candles', symbol, interval],
    queryFn:         () => api.get(`/api/markets/${symbol}/candles`, { params: { interval, limit } }).then(r => r.data),
    refetchInterval: interval === '1m' ? 10_000 : 30_000,
    staleTime:       5_000,
    enabled:         !!symbol,
  });
}

/** Live order book — bids and asks. */
export function useOrderBook(symbol, depth = 25) {
  return useQuery({
    queryKey:        ['orderbook', symbol],
    queryFn:         () => api.get(`/api/markets/${symbol}/orderbook`, { params: { depth } }).then(r => r.data),
    refetchInterval: 1_500,
    staleTime:       500,
    enabled:         !!symbol,
  });
}

/** Recent trades for a market. */
export function useRecentTrades(symbol) {
  return useQuery({
    queryKey:        ['trades', symbol],
    queryFn:         () => api.get(`/api/markets/${symbol}/trades`).then(r => r.data),
    refetchInterval: 3_000,
    enabled:         !!symbol,
  });
}

/** Current funding rate and next funding time. */
export function useFundingRate(symbol) {
  return useQuery({
    queryKey:        ['funding', symbol],
    queryFn:         () => api.get(`/api/markets/${symbol}/funding`).then(r => r.data),
    refetchInterval: 10_000,
    enabled:         !!symbol,
  });
}


// ── Account ───────────────────────────────────────────────────────

/** On-chain margin balance (free + locked) for a wallet address. */
export function useAccountBalance(address) {
  return useQuery({
    queryKey:        ['balance', address],
    queryFn:         () => api.get(`/api/account/${address}/balance`).then(r => r.data),
    enabled:         !!address,
    refetchInterval: 5_000,
  });
}

/** All open positions for a wallet address. */
export function usePositions(address) {
  return useQuery({
    queryKey:        ['positions', address],
    queryFn:         () => api.get(`/api/account/${address}/positions`).then(r => r.data),
    enabled:         !!address,
    refetchInterval: 3_000,
  });
}

/** All open orders for a wallet address. */
export function useOrders(address) {
  return useQuery({
    queryKey:        ['orders', address],
    queryFn:         () => api.get(`/api/account/${address}/orders`).then(r => r.data),
    enabled:         !!address,
    refetchInterval: 3_000,
  });
}


// ── AMM Pool ──────────────────────────────────────────────────────

/** WLP price, total liquidity, and fees earned. */
export function usePoolStats() {
  return useQuery({
    queryKey:        ['pool'],
    queryFn:         () => api.get('/api/pool/stats').then(r => r.data),
    refetchInterval: 10_000,
  });
}


// ── Leaderboard ───────────────────────────────────────────────────

/** Top 100 traders by realized PnL. */
export function useLeaderboard() {
  return useQuery({
    queryKey:        ['leaderboard'],
    queryFn:         () => api.get('/api/leaderboard').then(r => r.data),
    refetchInterval: 30_000,
  });
}


// ── WebSocket ─────────────────────────────────────────────────────

/**
 * Connects the WebSocket to the backend and subscribes to:
 * - ticker     → live price updates
 * - positions  → position open/close events for connected wallet
 * - liquidations → liquidation events
 * - funding    → funding rate updates
 *
 * Prices are stored in usePriceStore and accessible via usePrice().
 */
export function useWebSocket() {
  const connectWs = usePriceStore(s => s.connectWs);
  const wsReady   = usePriceStore(s => s.wsReady);
  useEffect(() => { connectWs(); }, [connectWs]);
  return wsReady;
}

/**
 * Subscribe to raw WebSocket messages.
 * Handler is called for every message on any channel.
 * Automatically unsubscribes when component unmounts.
 */
export function useWsMessages(handler) {
  const subscribe = usePriceStore(s => s.subscribe);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => subscribe((msg) => handlerRef.current(msg)), [subscribe]);
}


export { api };
