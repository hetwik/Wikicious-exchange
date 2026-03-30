'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — New Feature Routes v2
 *  Covers: LaunchPool · LiquidityPools · LiquidStaking · Rebalancer
 * ════════════════════════════════════════════════════════════════
 */

const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── Helper ────────────────────────────────────────────────────────────────
function fmt(v) { try { return v?.toString(); } catch { return '0'; } }
function contract(addr, abi) {
  if (!addr) return null;
  return new ethers.Contract(addr, abi, getProvider());
}
function safeCall(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error('Route error:', e.message); res.status(500).json({ error: e.message }); }
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  ABIs
// ─────────────────────────────────────────────────────────────────────────

const LAUNCHPOOL_ABI = [
  'function poolCount() view returns (uint256)',
  'function getPool(uint256) view returns (tuple(uint256 id, string projectName, string projectURL, address stakeToken, address rewardToken, address projectOwner, uint256 rewardPerSecond, uint256 startTime, uint256 endTime, uint256 rewardBudget, uint256 rewardPaid, uint256 totalStaked, uint256 accRewardPerShare, uint256 lastRewardTime, uint256 maxStakePerUser, uint256 minStakeDuration, bool active))',
  'function getUserInfo(uint256, address) view returns (tuple(uint256 staked, uint256 rewardDebt, uint256 pendingHarvest, uint256 stakedAt))',
  'function pendingReward(uint256, address) view returns (uint256)',
  'function allowedStakeTokens(address) view returns (bool)',
];

const WIKI_LP_ABI = [
  'function poolCount() view returns (uint256)',
  'function getPool(uint256) view returns (tuple(address tokenA, address tokenB, uint256 feeBps, uint256 reserveA, uint256 reserveB, uint256 totalLP, uint256 feeGrowthA, uint256 feeGrowthB, uint256 protocolFeeA, uint256 protocolFeeB, uint256 totalVolumeA, uint256 wikPerSecond, uint256 accWIKPerLP, uint256 lastWIKTime, bool active))',
  'function getPosition(uint256, address) view returns (tuple(uint256 lpBalance, uint256 feeDebtA, uint256 feeDebtB, uint256 wikDebt))',
  'function pendingFees(uint256, address) view returns (uint256 feeA, uint256 feeB)',
  'function getAmountOut(uint256, address, uint256) view returns (uint256)',
  'function price(uint256) view returns (uint256)',
];

const LIQUID_STAKING_ABI = [
  'function exchangeRate() view returns (uint256)',
  'function totalStakedWIK() view returns (uint256)',
  'function totalUnbonding() view returns (uint256)',
  'function instantLiqBuffer() view returns (uint256)',
  'function pendingProtocolFee() view returns (uint256)',
  'function sWIKAddress() view returns (address)',
  'function getUnbondRequests(address) view returns (tuple(uint256 id, uint256 wikAmount, uint256 unbondTime, bool claimed)[])',
  'function sWIKToWIK(uint256) view returns (uint256)',
  'function wikToSWIK(uint256) view returns (uint256)',
  'function protocolFeeBps() view returns (uint256)',
  'function UNBONDING_PERIOD() view returns (uint256)',
];

const REBALANCER_ABI = [
  'function vaultCount() view returns (uint256)',
  'function strategyCount() view returns (uint256)',
  'function getVault(uint256) view returns (tuple(uint256 id, string name, uint256 strategyId, address depositToken, uint256 totalShares, uint256 highWaterMark, uint256 lastRebalance, uint256 lastMgmtFeeTime, uint256 performanceFeeBps, uint256 mgmtFeeBps, uint256 protocolFeesBps, bool active))',
  'function getStrategy(uint256) view returns (uint256 id, string name, string description, address creator, uint256 driftBps, uint256 keeperTip, bool active, uint256 usage)',
  'function getStrategyAllocations(uint256) view returns (tuple(address token, bytes32 oracleId, uint256 targetBps)[])',
  'function getUserShares(uint256, address) view returns (uint256)',
  'function sharePrice(uint256) view returns (uint256)',
  'function drift(uint256) view returns (uint256)',
  'function userValue(uint256, address) view returns (uint256)',
];

// ─────────────────────────────────────────────────────────────────────────
//  Lazy contract instances
// ─────────────────────────────────────────────────────────────────────────
let _lp_inst, _ls_inst, _lpool_inst, _rb_inst;
const launchPoolC  = () => _lpool_inst || (_lpool_inst = contract(ADDRESSES.WikiLaunchPool,      LAUNCHPOOL_ABI));
const wikiLPC      = () => _lp_inst    || (_lp_inst    = contract(ADDRESSES.WikiLP,              WIKI_LP_ABI));
const liquidStakC  = () => _ls_inst    || (_ls_inst    = contract(ADDRESSES.WikiLiquidStaking,   LIQUID_STAKING_ABI));
const rebalancerC  = () => _rb_inst    || (_rb_inst    = contract(ADDRESSES.WikiRebalancer,      REBALANCER_ABI));

// ═══════════════════════════════════════════════════════════════════════════
//  LAUNCH POOL ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const launchPoolRouter = express.Router();

// GET /api/launchpool/pools
launchPoolRouter.get('/pools', safeCall(async (req, res) => {
  const c = launchPoolC();
  if (!c) return res.json([]);
  const count = Number(await c.poolCount());
  const pools = [];
  for (let i = 0; i < count; i++) {
    const p = await c.getPool(i);
    const now = Math.floor(Date.now() / 1000);
    const total = Number(p.endTime) - Number(p.startTime);
    const elapsed = Math.max(0, Math.min(now, Number(p.endTime)) - Number(p.startTime));
    pools.push({
      id: i,
      projectName:  p.projectName,
      projectURL:   p.projectURL,
      stakeToken:   p.stakeToken,
      rewardToken:  p.rewardToken,
      projectOwner: p.projectOwner,
      rewardPerSecond: fmt(p.rewardPerSecond),
      startTime:    fmt(p.startTime),
      endTime:      fmt(p.endTime),
      rewardBudget: fmt(p.rewardBudget),
      rewardPaid:   fmt(p.rewardPaid),
      totalStaked:  fmt(p.totalStaked),
      maxStakePerUser: fmt(p.maxStakePerUser),
      active: p.active,
      status: now < Number(p.startTime) ? 'upcoming'
              : now > Number(p.endTime) ? 'ended'
              : 'live',
      progress: total > 0 ? (elapsed / total * 100).toFixed(1) : '0',
    });
  }
  res.json(pools);
}));

// GET /api/launchpool/pools/:id
launchPoolRouter.get('/pools/:id', safeCall(async (req, res) => {
  const c = launchPoolC();
  if (!c) return res.status(404).json({ error: 'not deployed' });
  const p = await c.getPool(Number(req.params.id));
  res.json({ id: Number(req.params.id), ...p });
}));

// GET /api/launchpool/user/:address
launchPoolRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = launchPoolC();
  if (!c) return res.json([]);
  const addr  = req.params.address;
  const count = Number(await c.poolCount());
  const positions = [];
  for (let i = 0; i < count; i++) {
    const ui      = await c.getUserInfo(i, addr);
    const pending = await c.pendingReward(i, addr);
    if (Number(ui.staked) > 0 || Number(pending) > 0) {
      positions.push({ pid: i, staked: fmt(ui.staked), pendingHarvest: fmt(ui.pendingHarvest),
        stakedAt: fmt(ui.stakedAt), pending: fmt(pending) });
    }
  }
  res.json(positions);
}));

// ═══════════════════════════════════════════════════════════════════════════
//  LIQUIDITY POOL ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const lpRouter = express.Router();

// GET /api/lp/pools
lpRouter.get('/pools', safeCall(async (req, res) => {
  const c = wikiLPC();
  if (!c) return res.json([]);
  const count = Number(await c.poolCount());
  const pools = [];
  for (let i = 0; i < count; i++) {
    const p   = await c.getPool(i);
    const mid = await c.price(i).catch(() => 0n);
    pools.push({
      id: i,
      tokenA: p.tokenA, tokenB: p.tokenB,
      feeBps: fmt(p.feeBps),
      reserveA: fmt(p.reserveA), reserveB: fmt(p.reserveB),
      totalLP: fmt(p.totalLP),
      totalVolumeA: fmt(p.totalVolumeA),
      price: fmt(mid),
      active: p.active,
      wikPerSecond: fmt(p.wikPerSecond),
    });
  }
  res.json(pools);
}));

// GET /api/lp/pools/:id
lpRouter.get('/pools/:id', safeCall(async (req, res) => {
  const c   = wikiLPC();
  if (!c) return res.status(404).json({ error: 'not deployed' });
  const pid = Number(req.params.id);
  const p   = await c.getPool(pid);
  const mid = await c.price(pid).catch(() => 0n);
  res.json({ id: pid, ...p, price: fmt(mid) });
}));

// GET /api/lp/quote?pid=0&tokenIn=0x...&amtIn=1000000
lpRouter.get('/quote', safeCall(async (req, res) => {
  const c = wikiLPC();
  if (!c) return res.json({ amtOut: '0' });
  const { pid, tokenIn, amtIn } = req.query;
  const out = await c.getAmountOut(Number(pid), tokenIn, BigInt(amtIn));
  res.json({ amtOut: fmt(out) });
}));

// GET /api/lp/user/:address
lpRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = wikiLPC();
  if (!c) return res.json([]);
  const addr  = req.params.address;
  const count = Number(await c.poolCount());
  const positions = [];
  for (let i = 0; i < count; i++) {
    const pos = await c.getPosition(i, addr);
    if (Number(pos.lpBalance) > 0) {
      const [feeA, feeB] = await c.pendingFees(i, addr);
      positions.push({ pid: i, lpBalance: fmt(pos.lpBalance),
        pendingFeeA: fmt(feeA), pendingFeeB: fmt(feeB) });
    }
  }
  res.json(positions);
}));

// ═══════════════════════════════════════════════════════════════════════════
//  LIQUID STAKING ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const liquidStakingRouter = express.Router();

// GET /api/liquid-staking/stats
liquidStakingRouter.get('/stats', safeCall(async (req, res) => {
  const c = liquidStakC();
  if (!c) return res.json({});
  const [rate, total, unbonding, buffer, protofee, sWIKAddr, feeBps, period] = await Promise.all([
    c.exchangeRate(), c.totalStakedWIK(), c.totalUnbonding(), c.instantLiqBuffer(),
    c.pendingProtocolFee(), c.sWIKAddress(), c.protocolFeeBps(), c.UNBONDING_PERIOD(),
  ]);
  res.json({
    exchangeRate: fmt(rate),
    totalStakedWIK: fmt(total),
    totalUnbonding: fmt(unbonding),
    instantBuffer: fmt(buffer),
    pendingProtocolFee: fmt(protofee),
    sWIKAddress: sWIKAddr,
    protocolFeeBps: fmt(feeBps),
    unbondingPeriodDays: Number(period) / 86400,
    apy: '12.4', // static estimate — update from keeper
  });
}));

// GET /api/liquid-staking/user/:address
liquidStakingRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = liquidStakC();
  if (!c) return res.json({});
  const [reqs, rate] = await Promise.all([
    c.getUnbondRequests(req.params.address),
    c.exchangeRate(),
  ]);
  res.json({
    exchangeRate: fmt(rate),
    unbondRequests: reqs.map(r => ({
      id: fmt(r.id), wikAmount: fmt(r.wikAmount),
      unbondTime: fmt(r.unbondTime), claimed: r.claimed,
    })),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  REBALANCER ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const rebalancerRouter = express.Router();

// GET /api/rebalancer/strategies
rebalancerRouter.get('/strategies', safeCall(async (req, res) => {
  const c = rebalancerC();
  if (!c) return res.json([]);
  const count = Number(await c.strategyCount());
  const strats = [];
  for (let i = 0; i < count; i++) {
    const [id, name, description, creator, driftBps, keeperTip, active, usage] = await c.getStrategy(i);
    const allocs = await c.getStrategyAllocations(i);
    strats.push({ id: fmt(id), name, description, creator, driftBps: fmt(driftBps),
      keeperTip: fmt(keeperTip), active, usage: fmt(usage),
      allocations: allocs.map(a => ({ token: a.token, targetBps: fmt(a.targetBps) })) });
  }
  res.json(strats);
}));

// GET /api/rebalancer/vaults
rebalancerRouter.get('/vaults', safeCall(async (req, res) => {
  const c = rebalancerC();
  if (!c) return res.json([]);
  const count = Number(await c.vaultCount());
  const vaults = [];
  for (let i = 0; i < count; i++) {
    const v = await c.getVault(i);
    const sp = await c.sharePrice(i).catch(() => 0n);
    const dr = await c.drift(i).catch(() => 0n);
    vaults.push({ id: i, name: v.name, strategyId: fmt(v.strategyId),
      depositToken: v.depositToken, totalShares: fmt(v.totalShares),
      sharePrice: fmt(sp), drift: fmt(dr),
      performanceFeeBps: fmt(v.performanceFeeBps),
      mgmtFeeBps: fmt(v.mgmtFeeBps),
      lastRebalance: fmt(v.lastRebalance),
      active: v.active });
  }
  res.json(vaults);
}));

// GET /api/rebalancer/user/:address
rebalancerRouter.get('/user/:address', safeCall(async (req, res) => {
  const c = rebalancerC();
  if (!c) return res.json([]);
  const addr  = req.params.address;
  const count = Number(await c.vaultCount());
  const positions = [];
  for (let i = 0; i < count; i++) {
    const shares = await c.getUserShares(i, addr);
    if (Number(shares) > 0) {
      const value = await c.userValue(i, addr);
      positions.push({ vaultId: i, shares: fmt(shares), valueUSDC: fmt(value) });
    }
  }
  res.json(positions);
}));

// ═══════════════════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { launchPoolRouter, lpRouter, liquidStakingRouter, rebalancerRouter };
