'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Yield Slicing API Routes
 *  GET /api/yield-slice/*
 * ════════════════════════════════════════════════════════════════
 */

const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── ABI (minimal read + write surface) ───────────────────────────────────────
const YIELD_SLICE_ABI = [
  // Reads
  'function sliceCount() view returns (uint256)',
  'function getSlice(uint256) view returns (tuple(uint256 lendingMarketId, uint256 maturity, address underlying, string symbol, address ptToken, address ytToken, uint256 totalWTokens, uint256 exchangeRateAtOpen, uint256 accYieldPerYT, uint256 lastExchangeRate, uint256 ammPT, uint256 ammUnderlying, uint256 ammTotalLP, uint256 yieldFeeBps, uint256 ammFeeBps, bool active))',
  'function getUserSlice(uint256, address) view returns (tuple(uint256 wTokenDeposited, uint256 ytYieldDebt, uint256 ammLPBalance))',
  'function previewClaimableYield(uint256, address) view returns (uint256)',
  'function impliedFixedRate(uint256) view returns (uint256)',
  'function ptPrice(uint256) view returns (uint256)',
  'function previewSwap(uint256, bool, uint256) view returns (uint256 amountOut, uint256 fee)',
  'function sliceTVL(uint256) view returns (uint256)',
  'function getSlicesByMarket(uint256) view returns (uint256[])',
  'function sliceProtocolFees(uint256, uint256) view returns (uint256)',
  // Events (for indexing)
  'event SliceCreated(uint256 indexed sliceId, uint256 indexed lendingMarketId, uint256 maturity, address ptToken, address ytToken, string symbol)',
  'event Sliced(uint256 indexed sliceId, address indexed user, uint256 wTokenAmount, uint256 ptMinted, uint256 ytMinted)',
  'event YieldClaimed(uint256 indexed sliceId, address indexed user, uint256 yieldAmount, uint256 fee)',
  'event AMMSwap(uint256 indexed sliceId, address indexed user, bool ptIn, uint256 amountIn, uint256 amountOut, uint256 impliedRate)',
];

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// ── Contract lazy getter ──────────────────────────────────────────────────────
let _ys;
function ys() {
  if (!_ys) {
    const addr = ADDRESSES.WikiYieldSlice;
    if (!addr) return null;
    _ys = new ethers.Contract(addr, YIELD_SLICE_ABI, getProvider());
  }
  return _ys;
}

function fmt(v)     { try { return v?.toString(); } catch { return '0'; } }
function fmtE18(v)  { try { return ethers.formatUnits(v, 18); } catch { return '0'; } }
function fmtE6(v)   { try { return ethers.formatUnits(v, 6);  } catch { return '0'; } }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _enrichSlice(c, sliceId, raw) {
  const [tvl, rate, price, fees] = await Promise.all([
    c.sliceTVL(sliceId).catch(() => 0n),
    c.impliedFixedRate(sliceId).catch(() => 0n),
    c.ptPrice(sliceId).catch(() => 0n),
    c.sliceProtocolFees(sliceId, 0).catch(() => 0n),
  ]);

  const now       = Math.floor(Date.now() / 1000);
  const remaining = Number(raw.maturity) - now;
  const daysLeft  = Math.max(0, Math.floor(remaining / 86400));

  return {
    id:               sliceId,
    lendingMarketId:  Number(raw.lendingMarketId),
    maturity:         fmt(raw.maturity),
    maturityDate:     new Date(Number(raw.maturity) * 1000).toISOString().split('T')[0],
    daysToMaturity:   daysLeft,
    expired:          Number(raw.maturity) <= now,
    underlying:       raw.underlying,
    symbol:           raw.symbol,
    ptToken:          raw.ptToken,
    ytToken:          raw.ytToken,
    totalWTokens:     fmtE18(raw.totalWTokens),
    exchangeRateAtOpen: fmtE18(raw.exchangeRateAtOpen),
    ammPT:            fmtE18(raw.ammPT),
    ammUnderlying:    fmtE18(raw.ammUnderlying),
    ammTotalLP:       fmtE18(raw.ammTotalLP),
    yieldFeeBps:      fmt(raw.yieldFeeBps),
    ammFeeBps:        fmt(raw.ammFeeBps),
    active:           raw.active,
    // Computed
    tvl:              fmtE18(tvl),
    impliedRate:      fmtE18(rate),
    impliedRatePct:   (Number(rate) / 1e16).toFixed(2),   // as % string
    ptPrice:          fmtE18(price),
    ptDiscount:       ((1 - Number(price) / 1e18) * 100).toFixed(4),
    protocolFees:     fmtE18(fees),
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = express.Router();

function safe(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      console.error('[yield-slice]', e.message);
      res.status(500).json({ error: e.message });
    }
  };
}

// ── GET /api/yield-slice/slices ───────────────────────────────────────────────
// Returns all slices with enriched data
router.get('/slices', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.json([]);

  const count = Number(await c.sliceCount());
  const all   = [];

  for (let i = 0; i < count; i++) {
    const raw     = await c.getSlice(i);
    const enriched = await _enrichSlice(c, i, raw);
    all.push(enriched);
  }

  // Optional filter
  const { active, market } = req.query;
  let filtered = all;
  if (active !== undefined) filtered = filtered.filter(s => s.active === (active !== 'false'));
  if (market !== undefined) filtered = filtered.filter(s => s.lendingMarketId === Number(market));

  res.json(filtered);
}));

// ── GET /api/yield-slice/slices/:id ──────────────────────────────────────────
router.get('/slices/:id', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.status(404).json({ error: 'not deployed' });
  const id  = Number(req.params.id);
  const raw = await c.getSlice(id);
  res.json(await _enrichSlice(c, id, raw));
}));

// ── GET /api/yield-slice/market/:marketId ────────────────────────────────────
// All slices for a specific lending market
router.get('/market/:marketId', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.json([]);
  const ids = await c.getSlicesByMarket(Number(req.params.marketId));
  const result = [];
  for (const id of ids) {
    const raw = await c.getSlice(id);
    result.push(await _enrichSlice(c, Number(id), raw));
  }
  res.json(result);
}));

// ── GET /api/yield-slice/user/:address ───────────────────────────────────────
// All slices where a user has a position
router.get('/user/:address', safe(async (req, res) => {
  const c    = ys();
  const addr = req.params.address;
  if (!c || !ethers.isAddress(addr)) return res.json([]);

  const count    = Number(await c.sliceCount());
  const positions = [];

  for (let i = 0; i < count; i++) {
    const us = await c.getUserSlice(i, addr);
    if (us.wTokenDeposited === 0n && us.ammLPBalance === 0n) continue;

    const [raw, claimable] = await Promise.all([
      c.getSlice(i),
      c.previewClaimableYield(i, addr).catch(() => 0n),
    ]);

    const enriched = await _enrichSlice(c, i, raw);

    // Also fetch YT balance directly from the YT ERC20
    let ytBalance = '0';
    let ptBalance = '0';
    try {
      const ytContract = new ethers.Contract(raw.ytToken, ERC20_ABI, getProvider());
      const ptContract = new ethers.Contract(raw.ptToken, ERC20_ABI, getProvider());
      const [ytBal, ptBal] = await Promise.all([ytContract.balanceOf(addr), ptContract.balanceOf(addr)]);
      ytBalance = fmtE18(ytBal);
      ptBalance = fmtE18(ptBal);
    } catch {}

    positions.push({
      ...enriched,
      userPosition: {
        wTokenDeposited:  fmtE18(us.wTokenDeposited),
        ammLPBalance:     fmtE18(us.ammLPBalance),
        claimableYield:   fmtE18(claimable),
        ytBalance,
        ptBalance,
      },
    });
  }

  res.json(positions);
}));

// ── GET /api/yield-slice/preview/swap ────────────────────────────────────────
// ?sliceId=0&ptIn=true&amount=1000000000000000000
router.get('/preview/swap', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.json({ amountOut: '0', fee: '0' });

  const { sliceId, ptIn, amount } = req.query;
  const [out, fee] = await c.previewSwap(
    Number(sliceId),
    ptIn === 'true',
    BigInt(amount || '0')
  );
  res.json({ amountOut: fmtE18(out), fee: fmtE18(fee) });
}));

// ── GET /api/yield-slice/stats ────────────────────────────────────────────────
// Protocol-level summary
router.get('/stats', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.json({ totalSlices: 0, totalTVL: '0', totalFees: '0' });

  const count  = Number(await c.sliceCount());
  let totalTVL = 0n;
  let totalFees = 0n;
  let activeSlices = 0;

  for (let i = 0; i < count; i++) {
    const [tvl, fees, raw] = await Promise.all([
      c.sliceTVL(i).catch(() => 0n),
      c.sliceProtocolFees(i, 0).catch(() => 0n),
      c.getSlice(i),
    ]);
    totalTVL  += tvl;
    totalFees += fees;
    if (raw.active && Number(raw.maturity) > Math.floor(Date.now() / 1000)) activeSlices++;
  }

  res.json({
    totalSlices:  count,
    activeSlices,
    totalTVL:     fmtE18(totalTVL),
    totalFees:    fmtE18(totalFees),
  });
}));

// ── Historical swap events (last 200 blocks on local provider) ───────────────
router.get('/slices/:id/swaps', safe(async (req, res) => {
  const c = ys();
  if (!c) return res.json([]);

  try {
    const latest = await getProvider().getBlockNumber();
    const logs   = await getProvider().getLogs({
      address:   ADDRESSES.WikiYieldSlice,
      topics:    [ethers.id('AMMSwap(uint256,address,bool,uint256,uint256,uint256)')],
      fromBlock: Math.max(0, latest - 50_000),
      toBlock:   'latest',
    });
    const iface = new ethers.Interface(YIELD_SLICE_ABI);
    const swaps = logs
      .map(l => { try { return iface.parseLog(l); } catch { return null; } })
      .filter(e => e && Number(e.args.sliceId) === Number(req.params.id))
      .map(e => ({
        sliceId:     Number(e.args.sliceId),
        user:        e.args.user,
        ptIn:        e.args.ptIn,
        amountIn:    fmtE18(e.args.amountIn),
        amountOut:   fmtE18(e.args.amountOut),
        impliedRate: fmtE18(e.args.impliedRate),
      }));
    res.json(swaps);
  } catch {
    res.json([]);
  }
}));

module.exports = { yieldSliceRouter: router };
