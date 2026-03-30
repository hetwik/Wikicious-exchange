'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — DEX Revenue Expansion Routes
 *  Insurance Yield · Volume Tiers · Funding Arb · POL
 *  Leveraged Tokens · Index Perps · Permissionless Markets · RWA
 * ════════════════════════════════════════════════════════════════
 */
const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

const fmt = v => { try { return v?.toString(); } catch { return '0'; } };
const safe = fn => async (req, res) => { try { await fn(req, res); } catch(e) { res.status(500).json({ error: e.message }); } };
const getC = (k, abi) => { const a = ADDRESSES[k]; return a ? new ethers.Contract(a, abi, getProvider()) : null; };

// ── Minimal ABIs ─────────────────────────────────────────────────────────

const IFY_ABI = [
  'function liquidBalance() view returns (uint256)',
  'function deployedValue() view returns (uint256)',
  'function pendingYield() view returns (uint256)',
  'function currentAPY() view returns (uint256)',
  'function totalDeployed() view returns (uint256)',
  'function totalYieldHarvested() view returns (uint256)',
  'function lastHarvestTime() view returns (uint256)',
];

const VT_ABI = [
  'function get30dVolume(address) view returns (uint256)',
  'function getDiscount(address) view returns (uint256 discountBps, uint8 tier)',
  'function getTierInfo(address) view returns (uint8 tier, string tierName, uint256 volume30d, uint256 discountBps, uint256 nextTierVolume, uint256 volumeToNextTier)',
  'function getAllTiers() view returns (tuple(uint256 minVolume, uint256 discountBps, string name)[5])',
  'function totalVolumeRecorded() view returns (uint256)',
];

const FAV_ABI = [
  'function totalAUM() view returns (uint256)',
  'function sharePrice() view returns (uint256)',
  'function totalProtocolFees() view returns (uint256)',
  'function currentFundingRate() view returns (int256)',
  'function isLongFunding() view returns (bool)',
  'function currentMarket() view returns (string)',
  'function activeLeverage() view returns (uint256)',
  'function lastRebalanceTime() view returns (uint256)',
  'function estimatedAPY() view returns (uint256)',
  'function userValue(address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function managementFeeBps() view returns (uint256)',
  'function performanceFeeBps() view returns (uint256)',
];

const POL_ABI = [
  'function stats() view returns (uint256 lpHeld, uint256 usdcDeployed, uint256 wikDeployed, uint256 feesEarned, uint256 pending)',
  'function positionValue() view returns (uint256 usdcValue, uint256 wikValue)',
];

const LT_ABI = [
  'function totalAUM() view returns (uint256)',
  'function sharePrice() view returns (uint256)',
  'function targetLeverage() view returns (uint256)',
  'function isLong() view returns (bool)',
  'function market() view returns (string)',
  'function totalProtocolFees() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function annualisedFeeRate() view returns (uint256)',
  'function lastRebalancePrice() view returns (uint256)',
  'function userValue(address) view returns (uint256)',
];

const IX_ABI = [
  'function indexCount() view returns (uint256)',
  'function getIndex(uint256) view returns (string name, string symbol, bytes32 marketId, uint256 lastPrice, uint256 lastUpdate, bool active)',
  'function getComponents(uint256) view returns (tuple(bytes32 oracleId, string symbol, uint256 weightBps)[])',
  'function computeIndexPrice(uint256) view returns (uint256)',
];

const PM_ABI = [
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256) view returns (tuple(address creator,string symbol,string name,bytes32 oracleId,address oracleProvider,uint256 bondPaid,uint256 createdAt,uint256 volume30d,uint256 totalVolume,uint256 totalFeesEarned,uint256 protocolFees,uint256 maxLeverage,uint256 takerFeeBps,uint8 status,bool volumeChecked))',
  'function totalBondRevenue() view returns (uint256)',
  'function totalProtocolFeeRevenue() view returns (uint256)',
  'function totalSlashRevenue() view returns (uint256)',
  'function BOND_AMOUNT() view returns (uint256)',
];

const RWA_ABI = [
  'function poolCount() view returns (uint256)',
  'function getPool(uint256) view returns (tuple(string name,string symbol,address rwaToken,uint256 totalDeposited,uint256 totalShares,uint256 highWaterMark,uint256 lastHarvest,uint256 accruedYield,uint256 protocolFees,uint256 totalFees,bool active))',
  'function totalTVL() view returns (uint256)',
  'function totalProtocolRevenue() view returns (uint256)',
  'function sharePrice(uint256) view returns (uint256)',
  'function userValue(uint256,address) view returns (uint256)',
  'function projectedAPY(uint256) view returns (uint256)',
];

// ═══ INSURANCE FUND YIELD ════════════════════════════════════════════════
const ifRouter = express.Router();

ifRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiInsuranceFundYield', IFY_ABI);
  if (!c) return res.json({ liquid:'0', deployed:'0', pendingYield:'0', apy:'0', harvested:'0' });
  const [liq, dep, py, harvested, lastHarvest] = await Promise.all([
    c.liquidBalance().catch(()=>0n),
    c.deployedValue().catch(()=>0n),
    c.pendingYield().catch(()=>0n),
    c.totalYieldHarvested().catch(()=>0n),
    c.lastHarvestTime().catch(()=>0n),
  ]);
  const apy = await c.currentAPY().catch(()=>0n);
  res.json({
    liquidBalance:       fmt(liq),
    deployedValue:       fmt(dep),
    pendingYield:        fmt(py),
    totalYieldHarvested: fmt(harvested),
    lastHarvestTime:     Number(lastHarvest),
    currentAPY:          fmt(apy),
    totalFundSize:       fmt(BigInt(fmt(liq)) + BigInt(fmt(dep))),
    deployRatio:         dep > 0n ? Number(dep * 10000n / (liq + dep)) : 0,
  });
}));

// ═══ VOLUME TIERS ════════════════════════════════════════════════════════
const vtRouter = express.Router();

vtRouter.get('/tiers', safe(async (req, res) => {
  const c = getC('WikiVolumeTiers', VT_ABI);
  if (!c) return res.json([
    { id:0, name:'Standard', minVolume:'0',                discountBps:0  },
    { id:1, name:'Advanced', minVolume:'100000000000',      discountBps:10 },
    { id:2, name:'Pro',      minVolume:'1000000000000',     discountBps:20 },
    { id:3, name:'Elite',    minVolume:'10000000000000',    discountBps:30 },
    { id:4, name:'VIP',      minVolume:'50000000000000',    discountBps:40 },
  ]);
  const tiers = await c.getAllTiers();
  res.json(tiers.map((t, i) => ({ id:i, name:t.name, minVolume:fmt(t.minVolume), discountBps:Number(t.discountBps) })));
}));

vtRouter.get('/user/:address', safe(async (req, res) => {
  const c = getC('WikiVolumeTiers', VT_ABI);
  if (!c) return res.json({ tier:0, tierName:'Standard', volume30d:'0', discountBps:0 });
  const info = await c.getTierInfo(req.params.address).catch(() => null);
  if (!info) return res.json({ tier:0, tierName:'Standard', volume30d:'0', discountBps:0 });
  res.json({
    tier:             Number(info.tier),
    tierName:         info.tierName,
    volume30d:        fmt(info.volume30d),
    discountBps:      Number(info.discountBps),
    nextTierVolume:   fmt(info.nextTierVolume),
    volumeToNextTier: fmt(info.volumeToNextTier),
  });
}));

vtRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiVolumeTiers', VT_ABI);
  if (!c) return res.json({ totalVolume:'0' });
  const total = await c.totalVolumeRecorded().catch(()=>0n);
  res.json({ totalVolumeRecorded: fmt(total) });
}));

// ═══ FUNDING ARB VAULT ═══════════════════════════════════════════════════
const favRouter = express.Router();

favRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiFundingArbVault', FAV_ABI);
  if (!c) return res.json({ aum:'0', sharePrice:'1000000000000000000', fees:'0' });
  const [aum, sp, fees, fr, isLong, mkt, lev, lastReb, apy, supply, mgmt, perf] = await Promise.all([
    c.totalAUM().catch(()=>0n), c.sharePrice().catch(()=>BigInt(1e18)),
    c.totalProtocolFees().catch(()=>0n), c.currentFundingRate().catch(()=>0n),
    c.isLongFunding().catch(()=>false), c.currentMarket().catch(()=>''),
    c.activeLeverage().catch(()=>0n), c.lastRebalanceTime().catch(()=>0n),
    c.estimatedAPY().catch(()=>0n), c.totalSupply().catch(()=>0n),
    c.managementFeeBps().catch(()=>50n), c.performanceFeeBps().catch(()=>1000n),
  ]);
  res.json({
    totalAUM: fmt(aum), sharePrice: fmt(sp), totalProtocolFees: fmt(fees),
    currentFundingRate: fmt(fr), isLongFunding: isLong, currentMarket: mkt,
    activeLeverage: Number(lev), lastRebalanceTime: Number(lastReb),
    estimatedAPY: fmt(apy), totalSupply: fmt(supply),
    managementFeeBps: Number(mgmt), performanceFeeBps: Number(perf),
  });
}));

favRouter.get('/user/:address', safe(async (req, res) => {
  const c = getC('WikiFundingArbVault', FAV_ABI);
  if (!c) return res.json({ value:'0', shares:'0' });
  const [val, shares] = await Promise.all([
    c.userValue(req.params.address).catch(()=>0n),
    c.balanceOf(req.params.address).catch(()=>0n),
  ]);
  res.json({ value: fmt(val), shares: fmt(shares) });
}));

// ═══ PROTOCOL-OWNED LIQUIDITY ════════════════════════════════════════════
const polRouter = express.Router();

polRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiPOL', POL_ABI);
  if (!c) return res.json({ lpHeld:'0', usdcDeployed:'0', wikDeployed:'0', feesEarned:'0', pending:'0' });
  const [stats, pos] = await Promise.all([c.stats(), c.positionValue()]);
  res.json({
    lpHeld: fmt(stats.lpHeld), usdcDeployed: fmt(stats.usdcDeployed),
    wikDeployed: fmt(stats.wikDeployed), feesEarned: fmt(stats.feesEarned),
    pendingFunding: fmt(stats.pending),
    currentUSDCValue: fmt(pos.usdcValue), currentWIKValue: fmt(pos.wikValue),
  });
}));

// ═══ LEVERAGED TOKENS ════════════════════════════════════════════════════
const ltRouter = express.Router();

const LT_TOKENS = [
  { key:'WikiLeveragedTokenBTC2L', name:'BTC 2× Long',  symbol:'wBTC2L', leverage:2, isLong:true,  market:'BTCUSDT' },
  { key:'WikiLeveragedTokenBTC3L', name:'BTC 3× Long',  symbol:'wBTC3L', leverage:3, isLong:true,  market:'BTCUSDT' },
  { key:'WikiLeveragedTokenETH2L', name:'ETH 2× Long',  symbol:'wETH2L', leverage:2, isLong:true,  market:'ETHUSDT' },
  { key:'WikiLeveragedTokenBTC2S', name:'BTC 2× Short', symbol:'wBTC2S', leverage:2, isLong:false, market:'BTCUSDT' },
  { key:'WikiLeveragedTokenETH2S', name:'ETH 2× Short', symbol:'wETH2S', leverage:2, isLong:false, market:'ETHUSDT' },
];

ltRouter.get('/tokens', safe(async (req, res) => {
  const tokens = await Promise.all(LT_TOKENS.map(async (meta, i) => {
    const c = getC(meta.key, LT_ABI);
    if (!c) return { ...meta, id:i, aum:'0', sharePrice:'1000000000000000000', fees:'0', supply:'0', connected:false };
    const [aum, sp, fees, supply, annFee] = await Promise.all([
      c.totalAUM().catch(()=>0n), c.sharePrice().catch(()=>BigInt(1e18)),
      c.totalProtocolFees().catch(()=>0n), c.totalSupply().catch(()=>0n),
      c.annualisedFeeRate().catch(()=>BigInt(10950)),
    ]);
    return { ...meta, id:i, aum:fmt(aum), sharePrice:fmt(sp), fees:fmt(fees), supply:fmt(supply), annualisedFeeRate:Number(annFee), connected:true };
  }));
  res.json(tokens);
}));

ltRouter.get('/user/:address', safe(async (req, res) => {
  const positions = await Promise.all(LT_TOKENS.map(async (meta, i) => {
    const c = getC(meta.key, LT_ABI);
    if (!c) return { id:i, symbol:meta.symbol, value:'0', shares:'0' };
    const [val, shares] = await Promise.all([
      c.userValue(req.params.address).catch(()=>0n),
      c.balanceOf?.(req.params.address).catch(()=>0n) ?? 0n,
    ]);
    return { id:i, symbol:meta.symbol, name:meta.name, value:fmt(val), shares:fmt(shares) };
  }));
  res.json(positions.filter(p => BigInt(p.shares) > 0n));
}));

// ═══ INDEX PERPS ═════════════════════════════════════════════════════════
const ixRouter = express.Router();

ixRouter.get('/indices', safe(async (req, res) => {
  const c = getC('WikiIndexPerp', IX_ABI);
  if (!c) return res.json([
    { id:0, name:'DeFi Index',    symbol:'WDEFI',  lastPrice:'0', active:true, components:5 },
    { id:1, name:'Layer 2 Index', symbol:'WL2',    lastPrice:'0', active:true, components:3 },
    { id:2, name:'Top 5 Crypto',  symbol:'WTOP5',  lastPrice:'0', active:true, components:5 },
  ]);
  const count = Number(await c.indexCount().catch(()=>3n));
  const indices = [];
  for (let i = 0; i < count; i++) {
    const idx = await c.getIndex(i).catch(()=>null);
    const comps = await c.getComponents(i).catch(()=>[]);
    if (idx) indices.push({
      id:i, name:idx.name, symbol:idx.symbol, marketId:idx.marketId,
      lastPrice:fmt(idx.lastPrice), lastUpdate:Number(idx.lastUpdate),
      active:idx.active, components:comps.length,
      componentList:comps.map(c=>({ symbol:c.symbol, weightBps:Number(c.weightBps) })),
    });
  }
  res.json(indices);
}));

// ═══ PERMISSIONLESS MARKETS ══════════════════════════════════════════════
const pmRouter = express.Router();

pmRouter.get('/markets', safe(async (req, res) => {
  const c = getC('WikiPermissionlessMarkets', PM_ABI);
  if (!c) return res.json([]);
  const count = Number(await c.marketCount().catch(()=>0n));
  const markets = [];
  for (let i = 0; i < Math.min(count, 50); i++) {
    const m = await c.getMarket(i).catch(()=>null);
    if (m) markets.push({
      id:i, creator:m.creator, symbol:m.symbol, name:m.name,
      bondPaid:fmt(m.bondPaid), createdAt:Number(m.createdAt),
      volume30d:fmt(m.volume30d), totalVolume:fmt(m.totalVolume),
      totalFees:fmt(m.totalFeesEarned), maxLeverage:Number(m.maxLeverage),
      takerFeeBps:Number(m.takerFeeBps),
      status:['PENDING','ACTIVE','SLASHED','CLOSED'][Number(m.status)],
    });
  }
  res.json(markets);
}));

pmRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiPermissionlessMarkets', PM_ABI);
  if (!c) return res.json({ bondRevenue:'0', feeRevenue:'0', slashRevenue:'0', bondAmount:'10000000000' });
  const [bond, fee, slash, bondAmt] = await Promise.all([
    c.totalBondRevenue().catch(()=>0n), c.totalProtocolFeeRevenue().catch(()=>0n),
    c.totalSlashRevenue().catch(()=>0n), c.BOND_AMOUNT().catch(()=>BigInt(10000*1e6)),
  ]);
  res.json({ bondRevenue:fmt(bond), feeRevenue:fmt(fee), slashRevenue:fmt(slash), bondAmount:fmt(bondAmt) });
}));

// ═══ RWA MARKET ══════════════════════════════════════════════════════════
const rwaRouter = express.Router();

rwaRouter.get('/pools', safe(async (req, res) => {
  const c = getC('WikiRWAMarket', RWA_ABI);
  if (!c) return res.json([
    { id:0, name:'Ondo OUSG',   symbol:'wOUSG',  deposited:'0', apy:500,  active:true },
    { id:1, name:'OpenEden T-Bill', symbol:'wTBILL', deposited:'0', apy:500, active:true },
  ]);
  const count = Number(await c.poolCount().catch(()=>0n));
  const pools = [];
  for (let i = 0; i < count; i++) {
    const p = await c.getPool(i).catch(()=>null);
    const sp = await c.sharePrice(i).catch(()=>BigInt(1e18));
    const apy = await c.projectedAPY(i).catch(()=>400n);
    if (p) pools.push({
      id:i, name:p.name, symbol:p.symbol, rwaToken:p.rwaToken,
      totalDeposited:fmt(p.totalDeposited), totalShares:fmt(p.totalShares),
      sharePrice:fmt(sp), protocolFees:fmt(p.protocolFees), totalFees:fmt(p.totalFees),
      lastHarvest:Number(p.lastHarvest), active:p.active, projectedAPY:Number(apy),
    });
  }
  res.json(pools);
}));

rwaRouter.get('/stats', safe(async (req, res) => {
  const c = getC('WikiRWAMarket', RWA_ABI);
  if (!c) return res.json({ tvl:'0', protocolRevenue:'0', pools:0 });
  const [tvl, rev, count] = await Promise.all([
    c.totalTVL().catch(()=>0n), c.totalProtocolRevenue().catch(()=>0n), c.poolCount().catch(()=>0n),
  ]);
  res.json({ tvl:fmt(tvl), protocolRevenue:fmt(rev), pools:Number(count) });
}));

rwaRouter.get('/user/:poolId/:address', safe(async (req, res) => {
  const c = getC('WikiRWAMarket', RWA_ABI);
  if (!c) return res.json({ value:'0' });
  const val = await c.userValue(Number(req.params.poolId), req.params.address).catch(()=>0n);
  res.json({ value: fmt(val) });
}));

// ── Export all routers ────────────────────────────────────────────────────
module.exports = {
  ifRouter, vtRouter, favRouter, polRouter,
  ltRouter, ixRouter, pmRouter, rwaRouter,
};
