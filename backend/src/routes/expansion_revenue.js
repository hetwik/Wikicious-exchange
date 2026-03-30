'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Expansion Revenue Routes
 *  Buyback/Burn · Prop Challenge · Liquidation Insurance
 *  Trader Pass · OTC Desk · Portfolio Margin · Fee Schedule
 * ════════════════════════════════════════════════════════════════
 */
const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── ABIs ──────────────────────────────────────────────────────────────────

const BUYBACK_ABI = [
  'function stats() view returns (uint256 totalUSDCSpent, uint256 totalWIKBurned, uint256 buybackCount, uint256 pendingUSDC, uint256 lastBuybackTime)',
  'function canExecute() view returns (bool)',
  'function nextBuybackTime() view returns (uint256)',
  'function maxBuybackPerTx() view returns (uint256)',
  'function cooldown() view returns (uint256)',
  'function paused() view returns (bool)',
];

const PROP_CHALLENGE_ABI = [
  'function challengeCount() view returns (uint256)',
  'function totalFeesCollected() view returns (uint256)',
  'function totalChallenges() view returns (uint256)',
  'function totalPassed() view returns (uint256)',
  'function totalFailed() view returns (uint256)',
  'function passRate() view returns (uint256)',
  'function getTier(uint8) view returns (tuple(uint256 accountSize,uint256 flatFee,uint256 passRefundBps,uint256 profitTargetBps,uint256 maxDailyDDBps,uint256 maxTotalDDBps,uint256 durationDays,uint8 evalTier,bool instant))',
  'function getChallenge(uint256) view returns (tuple(address trader,uint8 tier,uint256 feePaid,uint256 evalId,uint256 startTime,uint8 status,bool refundClaimed,uint256 fundedAccountId))',
  'function getTraderChallenges(address) view returns (uint256[])',
];

const LIQ_INS_ABI = [
  'function stats() view returns (uint256 totalPremiums, uint256 totalClaims, uint256 reserve, uint256 revenue, uint256 activePolicies, uint256 lossRatio)',
  'function reserveRatio() view returns (uint256)',
  'function PREMIUM_BPS(uint256) view returns (uint256)',
  'function COVERAGE_BPS(uint256) view returns (uint256)',
  'function previewPremium(uint256,uint8) view returns (uint256 premium, uint256 coverage)',
  'function getTraderPolicies(address) view returns (uint256[])',
  'function getPolicy(uint256) view returns (tuple(address trader,uint256 positionId,uint256 collateral,uint256 positionSize,uint256 premiumPaid,uint256 coverageAmount,uint8 level,uint8 status,uint256 createdAt,uint256 expiresAt))',
];

const TRADER_PASS_ABI = [
  'function totalSupply() view returns (uint256)',
  'function totalRevenue() view returns (uint256)',
  'function getDiscount(address) view returns (uint256)',
  'function getFarmBoost(address) view returns (uint256)',
  'function hasOTCAccess(address) view returns (bool)',
  'function tiers(uint256) view returns (tuple(uint256 price,uint256 discountBps,uint256 farmBoostBps,uint256 maxSupply,uint256 minted,bool otcAccess,bool priorityLiq,string name))',
  'function holderPass(address) view returns (uint256)',
];

const OTC_ABI = [
  'function otcStats() view returns (uint256 volume, uint256 fees, uint256 quotes, uint256 revenue)',
  'function feeBps() view returns (uint256)',
  'function getQuote(uint256) view returns (tuple(address trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 fee,uint256 feeBps,uint256 expiresAt,uint8 status,uint256 filledAt))',
  'function quoteCount() view returns (uint256)',
  'function reserveBalance(address) view returns (uint256)',
  'function previewFee(uint256) view returns (uint256)',
];

const PM_ABI = [
  'function getAccount(address) view returns (tuple(address trader,uint256 totalCollateral,uint256 unrealizedPnL,uint256 maintenanceMargin,uint256 lastFeeTime,uint256 totalFeePaid,bool active,uint256[] positionIds))',
  'function healthFactor(address) view returns (uint256)',
  'function freeCollateral(address) view returns (uint256)',
  'function isLiquidatable(address) view returns (bool)',
  'function totalRevenue() view returns (uint256)',
  'function totalAccounts() view returns (uint256)',
  'function MAINTENANCE_FEE() view returns (uint256)',
];

// ── Contract getters ────────────────────────────────────────────────────────
function getC(key, abi) {
  const addr = ADDRESSES[key];
  if (!addr) return null;
  return new ethers.Contract(addr, abi, getProvider());
}
const getBuyback = () => getC('WikiBuybackBurn',          BUYBACK_ABI);
const getChallenge = () => getC('WikiPropChallenge',      PROP_CHALLENGE_ABI);
const getLiqIns = () => getC('WikiLiquidationInsurance',  LIQ_INS_ABI);
const getPass = () => getC('WikiTraderPass',              TRADER_PASS_ABI);
const getOTC = () => getC('WikiOTCDesk',                  OTC_ABI);
const getPM = () => getC('WikiPortfolioMargin',           PM_ABI);

const f = v => { try { return v?.toString(); } catch { return '0'; } };
const safe = fn => async (req,res) => { try { await fn(req,res); } catch(e) { res.status(500).json({ error: e.message }); } };

// ═══════════════════════════════════════════════════════════════
//  BUYBACK & BURN
// ═══════════════════════════════════════════════════════════════
const buybackRouter = express.Router();

buybackRouter.get('/stats', safe(async (req,res) => {
  const c = getBuyback();
  if (!c) return res.json({ totalUSDCSpent:'0', totalWIKBurned:'0', buybackCount:0, pendingUSDC:'0' });
  const [s, can, next] = await Promise.all([c.stats(), c.canExecute(), c.nextBuybackTime()]);
  res.json({
    totalUSDCSpent:  f(s.totalUSDCSpent),
    totalWIKBurned:  f(s.totalWIKBurned),
    buybackCount:    Number(s.buybackCount),
    pendingUSDC:     f(s.pendingUSDC),
    lastBuybackTime: Number(s.lastBuybackTime),
    canExecute:      can,
    nextBuybackTime: Number(next),
    paused:          await c.paused(),
  });
}));

// ═══════════════════════════════════════════════════════════════
//  PROP CHALLENGES
// ═══════════════════════════════════════════════════════════════
const propChallengeRouter = express.Router();

propChallengeRouter.get('/stats', safe(async (req,res) => {
  const c = getChallenge();
  if (!c) return res.json({ totalFees:'0', totalChallenges:0, totalPassed:0, totalFailed:0, passRate:0 });
  const [fees, total, passed, failed, rate] = await Promise.all([
    c.totalFeesCollected(), c.totalChallenges(), c.totalPassed(), c.totalFailed(), c.passRate(),
  ]);
  res.json({
    totalFees:       f(fees),
    totalChallenges: Number(total),
    totalPassed:     Number(passed),
    totalFailed:     Number(failed),
    passRate:        Number(rate),
    failRate:        10000 - Number(rate),
  });
}));

propChallengeRouter.get('/tiers', safe(async (req,res) => {
  const c = getChallenge();
  const tiers = [];
  for (let i = 0; i < 5; i++) {
    const t = c ? await c.getTier(i).catch(() => null) : null;
    tiers.push(t ? {
      id: i,
      name: ['STARTER','TRADER','FUNDED','ELITE','INSTANT'][i],
      accountSize: f(t.accountSize),
      flatFee: f(t.flatFee),
      passRefundBps: Number(t.passRefundBps),
      profitTargetBps: Number(t.profitTargetBps),
      durationDays: Number(t.durationDays),
      instant: t.instant,
    } : {
      id: i,
      name: ['STARTER','TRADER','FUNDED','ELITE','INSTANT'][i],
      accountSize: [10000,25000,50000,100000,0][i] + '000000',
      flatFee: [99,199,299,499,0][i] + '000000',
      passRefundBps: 5000,
      profitTargetBps: i < 3 ? 800 : 1000,
      durationDays: [30,30,45,60,0][i],
      instant: i === 4,
    });
  }
  res.json(tiers);
}));

propChallengeRouter.get('/user/:address', safe(async (req,res) => {
  const c = getChallenge(); if (!c) return res.json({ challenges:[] });
  const ids = await c.getTraderChallenges(req.params.address).catch(()=>[]);
  const challenges = await Promise.all(ids.map(id => c.getChallenge(id)));
  res.json({ challenges: challenges.map((ch,i) => ({
    id: Number(ids[i]),
    tier: Number(ch.tier),
    feePaid: f(ch.feePaid),
    status: ['ACTIVE','PASSED','FAILED','REFUNDED'][Number(ch.status)],
    startTime: Number(ch.startTime),
  }))});
}));

// ═══════════════════════════════════════════════════════════════
//  LIQUIDATION INSURANCE
// ═══════════════════════════════════════════════════════════════
const liqInsRouter = express.Router();

liqInsRouter.get('/stats', safe(async (req,res) => {
  const c = getLiqIns(); if (!c) return res.json({ totalPremiums:'0', totalClaims:'0', activePolicies:0 });
  const [s, ratio] = await Promise.all([c.stats(), c.reserveRatio()]);
  res.json({
    totalPremiums:  f(s.totalPremiums),
    totalClaims:    f(s.totalClaims),
    reserve:        f(s.reserve),
    revenue:        f(s.revenue),
    activePolicies: Number(s.activePolicies),
    lossRatio:      Number(s.lossRatio),
    reserveRatio:   Number(ratio),
  });
}));

liqInsRouter.get('/preview', safe(async (req,res) => {
  const c = getLiqIns(); if (!c) return res.json({});
  const { size, level = 0 } = req.query;
  if (!size) return res.status(400).json({ error: 'size required' });
  const [premium, coverage] = await c.previewPremium(size, Number(level));
  res.json({ premium: f(premium), coverage: f(coverage), level: Number(level) });
}));

liqInsRouter.get('/user/:address', safe(async (req,res) => {
  const c = getLiqIns(); if (!c) return res.json({ policies:[] });
  const ids = await c.getTraderPolicies(req.params.address).catch(()=>[]);
  const policies = await Promise.all(ids.map(id => c.getPolicy(id)));
  res.json({ policies: policies.map((p,i) => ({
    id: Number(ids[i]),
    positionId: f(p.positionId),
    collateral: f(p.collateral),
    coverageAmount: f(p.coverageAmount),
    premiumPaid: f(p.premiumPaid),
    level: ['BASIC','STANDARD','PREMIUM'][Number(p.level)],
    status: ['ACTIVE','CLAIMED','EXPIRED','CANCELLED'][Number(p.status)],
    expiresAt: Number(p.expiresAt),
  }))});
}));

// ═══════════════════════════════════════════════════════════════
//  TRADER PASS
// ═══════════════════════════════════════════════════════════════
const traderPassRouter = express.Router();

traderPassRouter.get('/stats', safe(async (req,res) => {
  const c = getPass(); if (!c) return res.json({ totalSupply:0, totalRevenue:'0' });
  const [supply, revenue] = await Promise.all([c.totalSupply(), c.totalRevenue()]);
  const tiers = [];
  for (let i = 0; i < 4; i++) {
    const t = await c.tiers(i).catch(()=>null);
    if (t) tiers.push({ id:i, name:t.name, price:f(t.price), discountBps:Number(t.discountBps), farmBoostBps:Number(t.farmBoostBps), maxSupply:Number(t.maxSupply), minted:Number(t.minted), otcAccess:t.otcAccess, priorityLiq:t.priorityLiq });
  }
  res.json({ totalSupply: Number(supply), totalRevenue: f(revenue), tiers });
}));

traderPassRouter.get('/user/:address', safe(async (req,res) => {
  const c = getPass(); if (!c) return res.json({ hasPass: false });
  const [discount, boost, otc] = await Promise.all([
    c.getDiscount(req.params.address).catch(()=>0n),
    c.getFarmBoost(req.params.address).catch(()=>BigInt(10000)),
    c.hasOTCAccess(req.params.address).catch(()=>false),
  ]);
  const passIdx = await c.holderPass(req.params.address).catch(()=>0n);
  res.json({
    hasPass:     Number(passIdx) > 0,
    discount:    Number(discount),
    farmBoost:   Number(boost),
    hasOTC:      otc,
    tokenId:     Number(passIdx) > 0 ? Number(passIdx) - 1 : null,
  });
}));

// ═══════════════════════════════════════════════════════════════
//  OTC DESK
// ═══════════════════════════════════════════════════════════════
const otcRouter = express.Router();

otcRouter.get('/stats', safe(async (req,res) => {
  const c = getOTC(); if (!c) return res.json({ volume:'0', fees:'0', quotes:0, revenue:'0' });
  const [s, fee] = await Promise.all([c.otcStats(), c.feeBps()]);
  res.json({ volume: f(s.volume), fees: f(s.fees), quotes: Number(s.quotes), revenue: f(s.revenue), feeBps: Number(fee) });
}));

otcRouter.get('/preview', safe(async (req,res) => {
  const c = getOTC(); if (!c) return res.json({ fee:'0' });
  const { amount } = req.query;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const fee = await c.previewFee(amount);
  res.json({ fee: f(fee), feeBps: Number(await c.feeBps()) });
}));

otcRouter.get('/quotes', safe(async (req,res) => {
  const c = getOTC(); if (!c) return res.json([]);
  const count = Number(await c.quoteCount().catch(()=>0n));
  const recent = [];
  for (let i = Math.max(0, count-20); i < count; i++) {
    const q = await c.getQuote(i).catch(()=>null);
    if (q) recent.push({ id:i, trader:q.trader, amountIn:f(q.amountIn), amountOut:f(q.amountOut), fee:f(q.fee), status:['PENDING','FILLED','EXPIRED','CANCELLED'][Number(q.status)], filledAt:Number(q.filledAt) });
  }
  res.json(recent.reverse());
}));

// ═══════════════════════════════════════════════════════════════
//  PORTFOLIO MARGIN
// ═══════════════════════════════════════════════════════════════
const pmRouter = express.Router();

pmRouter.get('/stats', safe(async (req,res) => {
  const c = getPM(); if (!c) return res.json({ totalAccounts:0, totalRevenue:'0' });
  const [accounts, revenue] = await Promise.all([c.totalAccounts(), c.totalRevenue()]);
  res.json({ totalAccounts: Number(accounts), totalRevenue: f(revenue), maintenanceFeeBps: 5 });
}));

pmRouter.get('/account/:address', safe(async (req,res) => {
  const c = getPM(); if (!c) return res.json({ active: false });
  const [acc, hf, free, liq] = await Promise.all([
    c.getAccount(req.params.address).catch(()=>null),
    c.healthFactor(req.params.address).catch(()=>0n),
    c.freeCollateral(req.params.address).catch(()=>0n),
    c.isLiquidatable(req.params.address).catch(()=>false),
  ]);
  if (!acc?.active) return res.json({ active: false });
  res.json({
    active: acc.active,
    totalCollateral: f(acc.totalCollateral),
    unrealizedPnL:   f(acc.unrealizedPnL),
    maintenanceMargin: f(acc.maintenanceMargin),
    healthFactor:    Number(hf),
    freeCollateral:  f(free),
    isLiquidatable:  liq,
    positionCount:   acc.positionIds?.length || 0,
  });
}));

// ═══════════════════════════════════════════════════════════════
//  FEE SCHEDULE (maker rebates summary)
// ═══════════════════════════════════════════════════════════════
const feeScheduleRouter = express.Router();

feeScheduleRouter.get('/current', safe(async (req,res) => {
  // Return the optimised fee schedule with negative maker fees
  res.json({
    perp: {
      makerFeeBps: 0,      // FREE for market makers
      takerFeeBps: 6,      // 0.06% takers (was 0.04-0.05%)
      makerRebateBps: -2,  // Negative: PAY makers 0.02% rebate
      description: 'Maker fee reduction drives volume 3-5×',
    },
    spot: {
      takerFeeBps: 7,
      makerRebateBps: -3,  // Pay market makers to provide liquidity
    },
    passDiscounts: {
      BRONZE:  '25% off taker fee',
      SILVER:  '40% off taker fee',
      GOLD:    '60% off taker fee',
      DIAMOND: '75% off taker fee',
    },
    volume30d: [
      { tier: '<$100K',    takerBps: 6, makerBps: -2 },
      { tier: '$100K–1M',  takerBps: 5, makerBps: -2 },
      { tier: '$1M–10M',   takerBps: 4, makerBps: -1 },
      { tier: '>$10M',     takerBps: 3, makerBps:  0 },
    ],
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  buybackRouter,
  propChallengeRouter,
  liqInsRouter,
  traderPassRouter,
  otcRouter,
  pmRouter,
  feeScheduleRouter,
};
