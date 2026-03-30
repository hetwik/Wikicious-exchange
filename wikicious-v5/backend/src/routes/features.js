'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — New Feature Routes
 *  Covers: OrderBook · Staking · Launchpad · Bridge · Lending
 * ════════════════════════════════════════════════════════════════
 */

const express  = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── ABIs (minimal read-only) ──────────────────────────────────────────────

const ORDERBOOK_ABI = [
  'function getPair(uint256) view returns (tuple(address baseToken, address quoteToken, uint256 takerFeeBps, int256 makerRebateBps, uint256 minOrderSize, uint256 pricePrecision, bool active, uint256 protocolFees, uint256 totalVolume))',
  'function pairCount() view returns (uint256)',
  'function getOrder(uint256) view returns (tuple(uint256 pairId, address maker, bool isBid, uint256 price, uint256 baseAmount, uint256 baseRemaining, bool isIOC, uint256 createdAt, bool active))',
  'function getOrderBookDepth(uint256 pairId, bool isBid, uint256 depth) view returns (uint256[] prices, uint256[] sizes)',
  'function getMidPrice(uint256 pairId) view returns (uint256)',
  'function bestPrice(uint256, bool) view returns (uint256)',
];

const STAKING_ABI = [
  'function getLock(address) view returns (tuple(uint256 amount, uint256 unlockTime, uint256 veWIK))',
  'function getCurrentVeWIK(address) view returns (uint256)',
  'function pendingWIK(uint256, address) view returns (uint256)',
  'function pendingFeesView(address) view returns (uint256)',
  'function pools(uint256) view returns (tuple(address lpToken, uint256 allocPoint, uint256 lastRewardTime, uint256 accWIKPerShare, uint256 totalBoosted, bool active))',
  'function poolCount() view returns (uint256)',
  'function getUserPool(uint256, address) view returns (tuple(uint256 lpAmount, uint256 boostedAmount, uint256 rewardDebt))',
  'function totalLockedWIK() view returns (uint256)',
  'function totalVeWIK() view returns (uint256)',
  'function wikPerSecond() view returns (uint256)',
];

const LAUNCHPAD_ABI = [
  'function saleCount() view returns (uint256)',
  'function getSale(uint256) view returns (tuple(address projectOwner, address saleToken, address raiseToken, string name, string metaURI, uint256 pricePerToken, uint256 hardcap, uint256 softcap, uint256 totalTokens, uint256 goldAlloc, uint256 silverAlloc, uint256 bronzeAlloc, uint256 publicAlloc, uint256 startTime, uint256 endTime, uint256 tgeTime, uint256 cliffDuration, uint256 vestDuration, uint256 totalRaised, uint256 launchFeeBps, uint8 status, bool tokensDeposited))',
  'function getUserCommit(uint256, address) view returns (tuple(uint256 committed, uint256 tokensClaimed, bool refunded))',
  'function tierOf(address) view returns (uint8)',
  'function allocationFor(uint256, address) view returns (uint256)',
  'function claimableView(uint256, address) view returns (uint256)',
];

const BRIDGE_ABI = [
  'function getTokenConfig(address) view returns (tuple(bool enabled, uint256 minAmount, uint256 feeBps, uint256 dailyLimit, uint256 dailySent, uint256 dayStart, uint256 totalFees))',
  'function getLiquidity(address) view returns (uint256 available, uint256 fees)',
  'function getTransfer(bytes32) view returns (tuple(address sender, address token, uint256 amount, uint32 destChain, address destAddress, uint256 nonce, uint256 timestamp, uint8 status))',
  'function totalVolume() view returns (uint256)',
  'function paused() view returns (bool)',
  'function supportedChains(uint32) view returns (bool)',
];

const LENDING_ABI = [
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256) view returns (tuple(address underlying, bytes32 oracleId, string symbol, uint256 baseRatePerSecond, uint256 multiplierPerSecond, uint256 jumpMultiplierPerSecond, uint256 kinkUtilization, uint256 totalSupply, uint256 totalBorrows, uint256 totalReserves, uint256 exchangeRate, uint256 borrowIndex, uint256 lastAccrualTime, uint256 collateralFactor, uint256 liquidationThreshold, uint256 reserveFactor, uint256 supplyCap, uint256 borrowCap, bool supplyEnabled, bool borrowEnabled, uint256 supplyWIKPerSecond, uint256 borrowWIKPerSecond, uint256 accSupplyWIKPerToken, uint256 accBorrowWIKPerBorrow))',
  'function getSupplyBalance(uint256, address) view returns (uint256)',
  'function getBorrowBalance(uint256, address) view returns (uint256)',
  'function healthFactor(address) view returns (uint256)',
  'function getSupplyAPY(uint256) view returns (uint256)',
  'function getBorrowAPY(uint256) view returns (uint256)',
  'function getUtilization(uint256) view returns (uint256)',
];

// ── Lazy contract getters ─────────────────────────────────────────────────
let _ob, _staking, _launchpad, _bridge, _lending;

function getContract(name, abi, addrKey) {
  const addr = ADDRESSES[addrKey];
  if (!addr) return null;
  return new ethers.Contract(addr, abi, getProvider());
}

const ob       = () => _ob       || (_ob       = getContract('orderbook',  ORDERBOOK_ABI,  'WikiOrderBook'));
const staking  = () => _staking  || (_staking  = getContract('staking',    STAKING_ABI,    'WikiStaking'));
const launchpad= () => _launchpad|| (_launchpad = getContract('launchpad',  LAUNCHPAD_ABI,  'WikiLaunchpad'));
const bridge   = () => _bridge   || (_bridge   = getContract('bridge',     BRIDGE_ABI,     'WikiBridge'));
const lending  = () => _lending  || (_lending  = getContract('lending',    LENDING_ABI,    'WikiLending'));

function safeCall(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error('Route error:', e.message);
      res.status(500).json({ error: e.message });
    }
  };
}

function fmt(v) {
  try { return v?.toString(); } catch { return '0'; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER BOOK ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const obRouter = express.Router();

// GET /api/orderbook/pairs
obRouter.get('/pairs', safeCall(async (req, res) => {
  const c = ob(); if (!c) return res.json([]);
  const count = Number(await c.pairCount());
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const p = await c.getPair(i);
    pairs.push({ id: i, baseToken: p.baseToken, quoteToken: p.quoteToken,
      takerFeeBps: fmt(p.takerFeeBps), makerRebateBps: fmt(p.makerRebateBps),
      active: p.active, totalVolume: fmt(p.totalVolume) });
  }
  res.json(pairs);
}));

// GET /api/orderbook/:pairId/depth?levels=20
obRouter.get('/:pairId/depth', safeCall(async (req, res) => {
  const c = ob(); if (!c) return res.json({ bids: [], asks: [] });
  const pairId = Number(req.params.pairId);
  const levels = Math.min(Number(req.query.levels || 20), 50);

  const [bidPrices, bidSizes] = await c.getOrderBookDepth(pairId, true, levels);
  const [askPrices, askSizes] = await c.getOrderBookDepth(pairId, false, levels);

  res.json({
    bids: bidPrices.map((p, i) => ({ price: fmt(p), size: fmt(bidSizes[i]) })).filter(x => x.price !== '0'),
    asks: askPrices.map((p, i) => ({ price: fmt(p), size: fmt(askSizes[i]) })).filter(x => x.price !== '0'),
  });
}));

// GET /api/orderbook/:pairId/mid
obRouter.get('/:pairId/mid', safeCall(async (req, res) => {
  const c = ob(); if (!c) return res.json({ mid: '0' });
  const mid = await c.getMidPrice(Number(req.params.pairId));
  res.json({ mid: fmt(mid) });
}));

// GET /api/orderbook/order/:orderId
obRouter.get('/order/:orderId', safeCall(async (req, res) => {
  const c = ob(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const o = await c.getOrder(Number(req.params.orderId));
  res.json({ pairId: fmt(o.pairId), maker: o.maker, isBid: o.isBid,
    price: fmt(o.price), baseAmount: fmt(o.baseAmount),
    baseRemaining: fmt(o.baseRemaining), active: o.active });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  STAKING ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const stakingRouter = express.Router();

// GET /api/staking/stats
stakingRouter.get('/stats', safeCall(async (req, res) => {
  const c = staking(); if (!c) return res.json({});
  const [totalLocked, totalVeWIK, wikPS, poolCount] = await Promise.all([
    c.totalLockedWIK(), c.totalVeWIK(), c.wikPerSecond(), c.poolCount()
  ]);
  res.json({ totalLockedWIK: fmt(totalLocked), totalVeWIK: fmt(totalVeWIK),
    wikPerSecond: fmt(wikPS), poolCount: Number(poolCount) });
}));

// GET /api/staking/pools
stakingRouter.get('/pools', safeCall(async (req, res) => {
  const c = staking(); if (!c) return res.json([]);
  const count = Number(await c.poolCount());
  const pools = [];
  for (let i = 0; i < count; i++) {
    const p = await c.pools(i);
    pools.push({ id: i, lpToken: p.lpToken, allocPoint: fmt(p.allocPoint),
      totalBoosted: fmt(p.totalBoosted), active: p.active });
  }
  res.json(pools);
}));

// GET /api/staking/user/:address
stakingRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = staking(); if (!c) return res.json({});
  const addr = req.params.address;
  const [lock, veWIK, pendingFees] = await Promise.all([
    c.getLock(addr), c.getCurrentVeWIK(addr), c.pendingFeesView(addr)
  ]);
  const count = Number(await c.poolCount());
  const userPools = [];
  for (let i = 0; i < count; i++) {
    const up  = await c.getUserPool(i, addr);
    const pending = await c.pendingWIK(i, addr);
    userPools.push({ pid: i, lpAmount: fmt(up.lpAmount),
      boostedAmount: fmt(up.boostedAmount), pendingWIK: fmt(pending) });
  }
  res.json({
    lock: { amount: fmt(lock.amount), unlockTime: fmt(lock.unlockTime), veWIK: fmt(lock.veWIK) },
    currentVeWIK: fmt(veWIK), pendingFees: fmt(pendingFees), pools: userPools
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  LAUNCHPAD ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const launchpadRouter = express.Router();

const STATUS = ['Pending','Active','Filled','Failed','Finalized'];

// GET /api/launchpad/sales
launchpadRouter.get('/sales', safeCall(async (req, res) => {
  const c = launchpad(); if (!c) return res.json([]);
  const count = Number(await c.saleCount());
  const sales = [];
  for (let i = 0; i < count; i++) {
    const s = await c.getSale(i);
    sales.push({
      id: i, name: s.name, projectOwner: s.projectOwner, saleToken: s.saleToken,
      pricePerToken: fmt(s.pricePerToken), hardcap: fmt(s.hardcap), softcap: fmt(s.softcap),
      totalRaised: fmt(s.totalRaised), startTime: fmt(s.startTime), endTime: fmt(s.endTime),
      tgeTime: fmt(s.tgeTime), status: STATUS[s.status], metaURI: s.metaURI,
      progress: Number(s.hardcap) > 0 ? (Number(s.totalRaised) / Number(s.hardcap) * 100).toFixed(2) : '0',
    });
  }
  res.json(sales);
}));

// GET /api/launchpad/sales/:id
launchpadRouter.get('/sales/:id', safeCall(async (req, res) => {
  const c = launchpad(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const s = await c.getSale(Number(req.params.id));
  res.json({ id: Number(req.params.id), ...s, status: STATUS[s.status] });
}));

// GET /api/launchpad/user/:address
launchpadRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = launchpad(); if (!c) return res.json({ tier: 0, sales: [] });
  const addr = req.params.address;
  const [tier, count] = await Promise.all([c.tierOf(addr), c.saleCount()]);
  const userSales = [];
  for (let i = 0; i < Number(count); i++) {
    const uc = await c.getUserCommit(i, addr);
    if (uc.committed > 0n) {
      const claimable = await c.claimableView(i, addr);
      userSales.push({ saleId: i, committed: fmt(uc.committed),
        tokensClaimed: fmt(uc.tokensClaimed), claimable: fmt(claimable), refunded: uc.refunded });
    }
  }
  res.json({ tier: Number(tier), sales: userSales });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  BRIDGE ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const bridgeRouter = express.Router();

const SUPPORTED_TOKENS = ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
                          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
                          '0x912CE59144191C1204E64559FE8253a0e49E6548']; // ARB

const CHAIN_NAMES = { 1: 'Ethereum', 42161: 'Arbitrum', 10: 'Optimism', 8453: 'Base', 137: 'Polygon' };

// GET /api/bridge/supported
bridgeRouter.get('/supported', safeCall(async (req, res) => {
  const c = bridge(); if (!c) return res.json({ tokens: [], chains: [] });
  const tokenConfigs = await Promise.all(
    SUPPORTED_TOKENS.map(async t => {
      const cfg = await c.getTokenConfig(t);
      const liq = await c.getLiquidity(t);
      return { token: t, enabled: cfg.enabled, feeBps: fmt(cfg.feeBps),
        dailyLimit: fmt(cfg.dailyLimit), available: fmt(liq.available) };
    })
  );
  const chains = Object.entries(CHAIN_NAMES).map(([id, name]) => ({ chainId: Number(id), name }));
  res.json({ tokens: tokenConfigs, chains });
}));

// GET /api/bridge/transfer/:transferId
bridgeRouter.get('/transfer/:transferId', safeCall(async (req, res) => {
  const c = bridge(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const t = await c.getTransfer(req.params.transferId);
  res.json({ sender: t.sender, token: t.token, amount: fmt(t.amount),
    destChain: fmt(t.destChain), destAddress: t.destAddress,
    status: ['Pending','Completed','Refunded'][t.status], timestamp: fmt(t.timestamp) });
}));

// GET /api/bridge/stats
bridgeRouter.get('/stats', safeCall(async (req, res) => {
  const c = bridge(); if (!c) return res.json({ totalVolume: '0', paused: false });
  const [vol, paused] = await Promise.all([c.totalVolume(), c.paused()]);
  res.json({ totalVolume: fmt(vol), paused });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  LENDING ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const lendingRouter = express.Router();

// GET /api/lending/markets
lendingRouter.get('/markets', safeCall(async (req, res) => {
  const c = lending(); if (!c) return res.json([]);
  const count = Number(await c.marketCount());
  const mkts = [];
  for (let i = 0; i < count; i++) {
    const m = await c.getMarket(i);
    const [supplyAPY, borrowAPY, util] = await Promise.all([
      c.getSupplyAPY(i), c.getBorrowAPY(i), c.getUtilization(i)
    ]);
    mkts.push({
      id: i, symbol: m.symbol, underlying: m.underlying,
      totalSupply: fmt(m.totalSupply), totalBorrows: fmt(m.totalBorrows),
      exchangeRate: fmt(m.exchangeRate), collateralFactor: fmt(m.collateralFactor),
      supplyEnabled: m.supplyEnabled, borrowEnabled: m.borrowEnabled,
      supplyAPY: fmt(supplyAPY), borrowAPY: fmt(borrowAPY),
      utilization: fmt(util),
      totalReserves: fmt(m.totalReserves),
    });
  }
  res.json(mkts);
}));

// GET /api/lending/user/:address
lendingRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = lending(); if (!c) return res.json({});
  const addr = req.params.address;
  const [health, count] = await Promise.all([c.healthFactor(addr), c.marketCount()]);
  const positions = [];
  for (let i = 0; i < Number(count); i++) {
    const [supply, borrow] = await Promise.all([
      c.getSupplyBalance(i, addr), c.getBorrowBalance(i, addr)
    ]);
    if (supply > 0n || borrow > 0n) {
      positions.push({ marketId: i, supplied: fmt(supply), borrowed: fmt(borrow) });
    }
  }
  res.json({ healthFactor: fmt(health), positions });
}));

// GET /api/lending/market/:id
lendingRouter.get('/market/:id', safeCall(async (req, res) => {
  const c = lending(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const mid = Number(req.params.id);
  const m = await c.getMarket(mid);
  const [supplyAPY, borrowAPY, util] = await Promise.all([
    c.getSupplyAPY(mid), c.getBorrowAPY(mid), c.getUtilization(mid)
  ]);
  res.json({ id: mid, ...m, supplyAPY: fmt(supplyAPY), borrowAPY: fmt(borrowAPY), utilization: fmt(util) });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  Export all routers
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  obRouter,
  stakingRouter,
  launchpadRouter,
  bridgeRouter,
  lendingRouter,
};
