'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Revenue Engine Routes
 *  CrossChain Router · MEV Hook · Fee Distributor
 * ════════════════════════════════════════════════════════════════
 */

const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── ABIs ──────────────────────────────────────────────────────────────────

const CROSSCHAIN_ABI = [
  'function getIntent(uint256) view returns (tuple(address user, uint32 srcChain, uint32 destChain, address token, uint256 collateral, uint256 size, bool isLong, uint256 leverage, uint256 limitPrice, uint256 minPrice, uint256 maxPrice, bytes32 marketId, uint256 takeProfitPrice, uint256 stopLossPrice, uint8 intentType, uint8 status, uint256 nonce, uint256 createdAt, bytes32 bridgeTransferId, uint256 routingFee))',
  'function intentCount() view returns (uint256)',
  'function getUserIntents(address, uint256, uint256) view returns (uint256[])',
  'function estimateFee(uint256, uint256, address) view returns (uint256 total, uint256 fixedPart, uint256 variablePart, uint8 tier)',
  'function getBestRoute(uint256, uint256, address) view returns (uint32 bestChain, uint256 lowestFee)',
  'function protocolRevenue() view returns (uint256)',
  'function routingFeeBps() view returns (uint256)',
  'function bridgeFeeBps() view returns (uint256)',
  'function supportedChains(uint32) view returns (bool)',
];

const MEV_ABI = [
  'function getOpportunity(uint256) view returns (tuple(bytes32 marketId, address triggerTrader, uint256 triggerBlock, uint256 priceAtTrigger, uint256 ammPriceAtTrigger, uint256 triggerSize, bool fulfilled, address fulfiller, uint256 profitCaptured, uint256 createdAt))',
  'function opportunityCount() view returns (uint256)',
  'function revenueStats() view returns (uint256 captured, uint256 toStakers, uint256 toInsurance, uint256 toTriggers, uint256 toKeepers)',
  'function getOpenOpportunity(bytes32) view returns (bool exists, uint256 oppId, uint256 dislocBps, uint256 expiresAtBlock)',
  'function hasOpenOpportunity(bytes32) view returns (bool)',
  'event BackrunOpportunityCreated(uint256 indexed oppId, bytes32 indexed marketId, address indexed triggerTrader, uint256 priceAtTrigger, uint256 ammPrice, uint256 triggerSize, uint256 dislocBps)',
  'event BackrunFulfilled(uint256 indexed oppId, address indexed keeper, uint256 profitCaptured, uint256 toStakers, uint256 toInsurance, uint256 toTrigger, uint256 toKeeper)',
];

const FEEDIST_ABI = [
  'function totalAccumulated() view returns (uint256)',
  'function totalDistributed() view returns (uint256)',
  'function getFeesBySource() view returns (uint256[8])',
  'function getUserTier(address) view returns (uint8 tier, uint8 veTier, uint8 volTier, uint256 veWIK, uint256 vol30d)',
  'function computeAffineFee(address, uint256, uint256, uint256) view returns (uint256 totalFee, uint8 tier, uint256 effectiveBps)',
  'function getPendingAllocations() view returns (uint256 buyback, uint256 insurance, uint256 treasury)',
  'function totalBalance() view returns (uint256)',
  'function getStrategyCount() view returns (uint256)',
  'function getStrategy(uint256) view returns (tuple(address impl, uint8 stratType, uint256 allocatedUsdc, uint256 shares, bool active))',
  'function accumulatedBySource(uint8) view returns (uint256)',
  'function pendingBuyback() view returns (uint256)',
];

// ── Helpers ───────────────────────────────────────────────────────────────
function getC(abi, addrKey) {
  const addr = ADDRESSES[addrKey];
  if (!addr) return null;
  return new ethers.Contract(addr, abi, getProvider());
}

const cc   = () => getC(CROSSCHAIN_ABI, 'WikiCrossChainRouter');
const mev  = () => getC(MEV_ABI,        'WikiMEVHook');
const fed  = () => getC(FEEDIST_ABI,    'WikiFeeDistributor');

const safe = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error(e.message); res.status(500).json({ error: e.message }); }
};

const fmt = (v) => { try { return v?.toString(); } catch { return '0'; } };

const SOURCE_NAMES = ['Perp','Spot','OrderBook','Bridge','Lending','MEV','Launchpad','Misc'];

// ═══════════════════════════════════════════════════════════════════════════
//  CROSS-CHAIN ROUTER ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const crossChainRouter = express.Router();

// GET /api/crosschain/stats
crossChainRouter.get('/stats', safe(async (req, res) => {
  const c = cc(); if (!c) return res.json({ revenue: '0', intents: 0, routingFeeBps: 15, bridgeFeeBps: 10 });
  const [revenue, count, routeBps, bridgeBps] = await Promise.all([
    c.protocolRevenue(), c.intentCount(), c.routingFeeBps(), c.bridgeFeeBps()
  ]);
  res.json({
    revenue:       fmt(revenue),
    intents:       Number(count),
    routingFeeBps: fmt(routeBps),
    bridgeFeeBps:  fmt(bridgeBps),
  });
}));

// GET /api/crosschain/estimate?collateral=1000&leverage=10&user=0x...
crossChainRouter.get('/estimate', safe(async (req, res) => {
  const c = cc(); if (!c) return res.json({ total: '2000000', fixed: '2000000', variable: '0', tier: 0 });
  const { collateral = '1000000000', leverage = '10', user = ethers.ZeroAddress } = req.query;
  const result = await c.estimateFee(BigInt(collateral), BigInt(leverage), user);
  res.json({
    total:    fmt(result.total),
    fixed:    fmt(result.fixedPart),
    variable: fmt(result.variablePart),
    tier:     Number(result.tier),
  });
}));

// GET /api/crosschain/best-route?collateral=1000&leverage=10&user=0x...
crossChainRouter.get('/best-route', safe(async (req, res) => {
  const c = cc(); if (!c) return res.json({ chain: 42161, fee: '2000000' });
  const { collateral = '1000000000', leverage = '10', user = ethers.ZeroAddress } = req.query;
  const result = await c.getBestRoute(BigInt(collateral), BigInt(leverage), user);
  res.json({ chain: Number(result.bestChain), fee: fmt(result.lowestFee) });
}));

// GET /api/crosschain/intents/:address
crossChainRouter.get('/intents/:address', safe(async (req, res) => {
  const c = cc(); if (!c) return res.json([]);
  const ids = await c.getUserIntents(req.params.address, 0, 50);
  const intents = await Promise.all(ids.map(async (id) => {
    const intent = await c.getIntent(id);
    return {
      id:          Number(id),
      destChain:   Number(intent.destChain),
      collateral:  fmt(intent.collateral),
      size:        fmt(intent.size),
      isLong:      intent.isLong,
      leverage:    fmt(intent.leverage),
      status:      ['Pending','Fulfilled','Cancelled','Expired'][intent.status],
      intentType:  ['Perp','Margin','Spot'][intent.intentType],
      routingFee:  fmt(intent.routingFee),
      createdAt:   fmt(intent.createdAt),
    };
  }));
  res.json(intents);
}));

// GET /api/crosschain/intent/:id
crossChainRouter.get('/intent/:id', safe(async (req, res) => {
  const c = cc(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const intent = await c.getIntent(Number(req.params.id));
  res.json({
    id:               Number(req.params.id),
    user:             intent.user,
    srcChain:         Number(intent.srcChain),
    destChain:        Number(intent.destChain),
    collateral:       fmt(intent.collateral),
    size:             fmt(intent.size),
    isLong:           intent.isLong,
    leverage:         fmt(intent.leverage),
    status:           ['Pending','Fulfilled','Cancelled','Expired'][intent.status],
    intentType:       ['Perp','Margin','Spot'][intent.intentType],
    routingFee:       fmt(intent.routingFee),
    bridgeTransferId: intent.bridgeTransferId,
    createdAt:        fmt(intent.createdAt),
    marketId:         intent.marketId,
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  MEV HOOK ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const mevRouter = express.Router();

// GET /api/mev/stats
mevRouter.get('/stats', safe(async (req, res) => {
  const c = mev(); if (!c) {
    return res.json({ captured: '0', toStakers: '0', toInsurance: '0', toTriggers: '0', toKeepers: '0', opportunities: 0 });
  }
  const [stats, count] = await Promise.all([c.revenueStats(), c.opportunityCount()]);
  res.json({
    captured:     fmt(stats.captured),
    toStakers:    fmt(stats.toStakers),
    toInsurance:  fmt(stats.toInsurance),
    toTriggers:   fmt(stats.toTriggers),
    toKeepers:    fmt(stats.toKeepers),
    opportunities: Number(count),
  });
}));

// GET /api/mev/opportunities?limit=20&offset=0
mevRouter.get('/opportunities', safe(async (req, res) => {
  const c = mev(); if (!c) return res.json([]);
  const count = Number(await c.opportunityCount());
  const limit  = Math.min(Number(req.query.limit  || 20), 50);
  const offset = Number(req.query.offset || 0);
  const end    = Math.min(offset + limit, count);

  const opps = [];
  for (let i = Math.max(0, count - end); i < count - offset; i++) {
    const opp = await c.getOpportunity(i);
    opps.push({
      id:             count - 1 - i,
      marketId:       opp.marketId,
      triggerTrader:  opp.triggerTrader,
      triggerBlock:   fmt(opp.triggerBlock),
      priceAtTrigger: fmt(opp.priceAtTrigger),
      ammPrice:       fmt(opp.ammPriceAtTrigger),
      triggerSize:    fmt(opp.triggerSize),
      fulfilled:      opp.fulfilled,
      profitCaptured: fmt(opp.profitCaptured),
      createdAt:      fmt(opp.createdAt),
    });
  }
  res.json(opps.reverse());
}));

// GET /api/mev/opportunity/:id
mevRouter.get('/opportunity/:id', safe(async (req, res) => {
  const c = mev(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const opp = await c.getOpportunity(Number(req.params.id));
  res.json({
    id:             Number(req.params.id),
    marketId:       opp.marketId,
    triggerTrader:  opp.triggerTrader,
    priceAtTrigger: fmt(opp.priceAtTrigger),
    ammPrice:       fmt(opp.ammPriceAtTrigger),
    triggerSize:    fmt(opp.triggerSize),
    fulfilled:      opp.fulfilled,
    fulfiller:      opp.fulfiller,
    profitCaptured: fmt(opp.profitCaptured),
    createdAt:      fmt(opp.createdAt),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  FEE DISTRIBUTOR ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const feeRouter = express.Router();

// GET /api/fees/stats
feeRouter.get('/stats', safe(async (req, res) => {
  const c = fed(); if (!c) {
    return res.json({ total: '0', distributed: '0', balance: '0', pending: {} });
  }
  const [total, dist, bal, pending, bySource] = await Promise.all([
    c.totalAccumulated(), c.totalDistributed(), c.totalBalance(),
    c.getPendingAllocations(), c.getFeesBySource()
  ]);
  const sources = {};
  SOURCE_NAMES.forEach((name, i) => { sources[name] = fmt(bySource[i]); });
  res.json({
    total:       fmt(total),
    distributed: fmt(dist),
    balance:     fmt(bal),
    pending:     { buyback: fmt(pending.buyback), insurance: fmt(pending.insurance), treasury: fmt(pending.treasury) },
    bySource:    sources,
  });
}));

// GET /api/fees/user/:address
feeRouter.get('/user/:address', safe(async (req, res) => {
  const c = fed(); if (!c) return res.json({ tier: 0, veTier: 0, volTier: 0, veWIK: '0', vol30d: '0' });
  const data = await c.getUserTier(req.params.address);
  res.json({
    tier:    Number(data.tier),
    veTier:  Number(data.veTier),
    volTier: Number(data.volTier),
    veWIK:   fmt(data.veWIK),
    vol30d:  fmt(data.vol30d),
  });
}));

// GET /api/fees/compute?user=0x...&notional=1000000&baseBps=10&fixed=0
feeRouter.get('/compute', safe(async (req, res) => {
  const c = fed(); if (!c) return res.json({ fee: '500', tier: 0, effectiveBps: '10' });
  const { user = ethers.ZeroAddress, notional = '1000000', baseBps = '10', fixed = '0' } = req.query;
  const result = await c.computeAffineFee(user, BigInt(notional), BigInt(baseBps), BigInt(fixed));
  res.json({
    fee:          fmt(result.totalFee),
    tier:         Number(result.tier),
    effectiveBps: fmt(result.effectiveBps),
  });
}));

// GET /api/fees/strategies
feeRouter.get('/strategies', safe(async (req, res) => {
  const c = fed(); if (!c) return res.json([]);
  const count = Number(await c.getStrategyCount());
  const strats = [];
  const TYPE_NAMES = ['Idle','AaveSupply','UniswapV3LP','WikiLending'];
  for (let i = 0; i < count; i++) {
    const s = await c.getStrategy(i);
    strats.push({
      id:            i,
      impl:          s.impl,
      type:          TYPE_NAMES[s.stratType],
      allocatedUsdc: fmt(s.allocatedUsdc),
      shares:        fmt(s.shares),
      active:        s.active,
    });
  }
  res.json(strats);
}));

// ── Combined revenue summary (used by dashboard) ──────────────────────────
const revenueRouter = express.Router();

revenueRouter.get('/summary', safe(async (req, res) => {
  const [ccC, mevC, feC] = [cc(), mev(), fed()];
  const results = await Promise.allSettled([
    ccC  ? ccC.protocolRevenue()  : Promise.resolve(0n),
    mevC ? mevC.revenueStats()    : Promise.resolve({ captured: 0n }),
    feC  ? feC.totalAccumulated() : Promise.resolve(0n),
    feC  ? feC.getFeesBySource()  : Promise.resolve(Array(8).fill(0n)),
  ]);

  const ccRevenue   = results[0].status === 'fulfilled' ? results[0].value : 0n;
  const mevStats    = results[1].status === 'fulfilled' ? results[1].value : { captured: 0n };
  const feeTotal    = results[2].status === 'fulfilled' ? results[2].value : 0n;
  const feeBySrc    = results[3].status === 'fulfilled' ? results[3].value : Array(8).fill(0n);

  const sources = {};
  SOURCE_NAMES.forEach((name, i) => { sources[name] = fmt(feeBySrc[i] || 0n); });

  res.json({
    crosschain: { revenue: fmt(ccRevenue) },
    mev:        { captured: fmt(mevStats.captured || 0n) },
    fees:       { total: fmt(feeTotal), bySource: sources },
    total:      fmt(BigInt(fmt(ccRevenue)) + BigInt(fmt(mevStats.captured || 0n)) + BigInt(fmt(feeTotal))),
  });
}));

module.exports = { crossChainRouter, mevRouter, feeRouter, revenueRouter };
