'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Advanced Lending Routes
 *  Flash Loan · Margin Loan · LP Collateral · Cross-Chain Lending
 * ════════════════════════════════════════════════════════════════
 */

const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// ── ABIs (minimal read-only) ──────────────────────────────────────────────

const FLASH_ABI = [
  'function maxFlashLoan(address token) view returns (uint256)',
  'function flashFee(address token, uint256 amount) view returns (uint256)',
  'function getReserve(address token) view returns (tuple(bool enabled, uint256 feeBps, uint256 totalDeposited, uint256 totalLP, uint256 accFeePerShare, uint256 protocolFees, uint256 insuranceFund, uint256 dailyBorrowed, uint256 dayStart, uint256 maxDailyBorrow, uint256 totalFlashVolume, uint256 totalFlashCount))',
  'function getSupportedTokens() view returns (address[])',
  'function pendingFeesView(address token, address user) view returns (uint256)',
  'function getLPBalance(address token, address user) view returns (uint256)',
  'function estimateAPY(address token, uint256 dailyVolumeHint) view returns (uint256)',
  'function whitelistMode() view returns (bool)',
  'event FlashLoan(address indexed borrower, address indexed token, uint256 amount, uint256 fee, bytes32 referenceId)',
];

const MARGIN_ABI = [
  'function getLoan(uint256) view returns (tuple(address borrower, uint256 principal, uint256 collateralLocked, uint256 borrowIndex, uint256 openedAt, uint256 dueAt, bool active))',
  'function currentDebt(uint256) view returns (uint256)',
  'function healthFactor(uint256) view returns (uint256)',
  'function isLiquidatable(uint256) view returns (bool)',
  'function getBorrowLoans(address) view returns (uint256[])',
  'function getLPBalance(address) view returns (uint256)',
  'function supplyAPY() view returns (uint256)',
  'function borrowAPY() view returns (uint256)',
  'function utilizationRate() view returns (uint256)',
  'function totalDeposited() view returns (uint256)',
  'function totalBorrowed() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function loanCount() view returns (uint256)',
];

const LPCOLL_ABI = [
  'function collateralTypeCount() view returns (uint256)',
  'function collateralTypes(uint256) view returns (tuple(bool enabled, uint8 method, address lpToken, address pool, uint256 poolId, bytes32 tokenAOracleId, bytes32 tokenBOracleId, uint256 ltvBps, uint256 liquidationThresholdBps, uint256 liquidationBonusBps, uint256 totalDeposited))',
  'function getVault(uint256) view returns (tuple(address borrower, uint256 collateralTypeId, uint256 lpAmount, uint256 debtPrincipal, uint256 debtIndex, bool active))',
  'function vaultDebt(uint256) view returns (uint256)',
  'function vaultHealthFactor(uint256) view returns (uint256)',
  'function getBorrowerVaults(address) view returns (uint256[])',
  'function getLPBalance(address) view returns (uint256)',
  'function valueLp(uint256 ctId, uint256 amount) view returns (uint256)',
  'function totalBorrowed() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
];

const CCL_ABI = [
  'function getPosition(uint256) view returns (tuple(address user, address supplyToken, uint256 supplyAmount, uint32 srcChain, uint256 depositedAt, bool active))',
  'function getBorrow(uint256) view returns (tuple(address borrower, address token, uint256 principal, uint256 debtIndex, uint256 crossChainPosId, bool active))',
  'function getUserPositions(address) view returns (uint256[])',
  'function getUserBorrows(address) view returns (uint256[])',
  'function positionCount() view returns (uint256)',
  'function borrowCount() view returns (uint256)',
  'function crossChainBorrowAPY() view returns (uint256)',
  'function userHealthFactor(address) view returns (uint256)',
  'function getAssets() view returns (address[])',
  'function totalBorrowed() view returns (uint256)',
  'function totalSuppliedUSD() view returns (uint256)',
  'function relayerThreshold() view returns (uint256)',
  'function relayerCount() view returns (uint256)',
  'function getPendingMessage(bytes32) view returns (tuple(address user, address token, uint256 amount, uint32 srcChain, uint256 nonce, uint8 msgType, bytes extraData), uint256 approvals)',
];

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(v) { try { return v?.toString(); } catch { return '0'; } }

function getContract(abi, addrKey) {
  const addr = ADDRESSES[addrKey];
  if (!addr) return null;
  return new ethers.Contract(addr, abi, getProvider());
}

let _flash, _margin, _lpcoll, _ccl;
const flash  = () => _flash  || (_flash  = getContract(FLASH_ABI,  'WikiFlashLoan'));
const margin = () => _margin || (_margin = getContract(MARGIN_ABI, 'WikiMarginLoan'));
const lpcoll = () => _lpcoll || (_lpcoll = getContract(LPCOLL_ABI, 'WikiLPCollateral'));
const ccl    = () => _ccl    || (_ccl    = getContract(CCL_ABI,    'WikiCrossChainLending'));

function safe(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error('Route error:', e.message?.slice(0, 120)); res.status(500).json({ error: e.message }); }
  };
}

const SUPPORTED_TOKENS = {
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': 'USDC',
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 'WETH',
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': 'WBTC',
  '0x912CE59144191C1204E64559FE8253a0e49E6548': 'ARB',
};

// ═══════════════════════════════════════════════════════════════════════════
//  FLASH LOAN ROUTES  /api/flash/*
// ═══════════════════════════════════════════════════════════════════════════
const flashRouter = express.Router();

// GET /api/flash/stats
flashRouter.get('/stats', safe(async (req, res) => {
  const c = flash();
  if (!c) return res.json({ supported: [], totalVolume: '0', whitelistMode: false });

  const tokens = await c.getSupportedTokens().catch(() => Object.keys(SUPPORTED_TOKENS));
  const reserves = await Promise.all(tokens.map(async t => {
    const r = await c.getReserve(t).catch(() => null);
    const maxLoan = await c.maxFlashLoan(t).catch(() => '0');
    return {
      token:           t,
      symbol:          SUPPORTED_TOKENS[t] || t.slice(0, 6),
      enabled:         r?.enabled ?? false,
      feeBps:          fmt(r?.feeBps),
      totalDeposited:  fmt(r?.totalDeposited),
      maxFlashLoan:    fmt(maxLoan),
      totalVolume:     fmt(r?.totalFlashVolume),
      totalCount:      fmt(r?.totalFlashCount),
      dailyBorrowed:   fmt(r?.dailyBorrowed),
    };
  }));

  res.json({ reserves, whitelistMode: await c.whitelistMode().catch(() => false) });
}));

// GET /api/flash/pool/:token
flashRouter.get('/pool/:token', safe(async (req, res) => {
  const c = flash(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const t = req.params.token;
  const [r, maxLoan] = await Promise.all([c.getReserve(t), c.maxFlashLoan(t)]);
  res.json({ token: t, symbol: SUPPORTED_TOKENS[t] || 'UNKNOWN',
    feeBps: fmt(r.feeBps), totalLP: fmt(r.totalLP),
    maxFlashLoan: fmt(maxLoan), totalVolume: fmt(r.totalFlashVolume),
    dailyBorrowed: fmt(r.dailyBorrowed), maxDailyBorrow: fmt(r.maxDailyBorrow) });
}));

// GET /api/flash/user/:address
flashRouter.get('/user/:address', safe(async (req, res) => {
  const c = flash(); if (!c) return res.json({ positions: [] });
  const addr   = req.params.address;
  const tokens = await c.getSupportedTokens().catch(() => Object.keys(SUPPORTED_TOKENS));
  const positions = await Promise.all(tokens.map(async t => {
    const [bal, pending] = await Promise.all([
      c.getLPBalance(t, addr).catch(() => '0'),
      c.pendingFeesView(t, addr).catch(() => '0'),
    ]);
    return { token: t, symbol: SUPPORTED_TOKENS[t] || t.slice(0,6),
      lpBalance: fmt(bal), pendingFees: fmt(pending) };
  }));
  res.json({ positions: positions.filter(p => p.lpBalance !== '0') });
}));

// GET /api/flash/fee?token=0x...&amount=1000000
flashRouter.get('/fee', safe(async (req, res) => {
  const c = flash(); if (!c) return res.json({ fee: '0' });
  const { token, amount } = req.query;
  const fee = await c.flashFee(token, amount);
  res.json({ fee: fmt(fee), feeBps: fmt(await c.getReserve(token).then(r => r.feeBps)) });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  MARGIN LOAN ROUTES  /api/margin/*
// ═══════════════════════════════════════════════════════════════════════════
const marginRouter = express.Router();

// GET /api/margin/stats
marginRouter.get('/stats', safe(async (req, res) => {
  const c = margin(); if (!c) return res.json({});
  const [deposited, borrowed, reserves, supplyAPY, borrowAPY, utilization, count] = await Promise.all([
    c.totalDeposited(), c.totalBorrowed(), c.totalReserves(),
    c.supplyAPY(), c.borrowAPY(), c.utilizationRate(), c.loanCount(),
  ]);
  res.json({
    totalDeposited:  fmt(deposited),
    totalBorrowed:   fmt(borrowed),
    totalReserves:   fmt(reserves),
    supplyAPY:       fmt(supplyAPY),
    borrowAPY:       fmt(borrowAPY),
    utilization:     fmt(utilization),
    loanCount:       fmt(count),
  });
}));

// GET /api/margin/user/:address
marginRouter.get('/user/:address', safe(async (req, res) => {
  const c = margin(); if (!c) return res.json({ loans: [], lpBalance: '0' });
  const addr = req.params.address;
  const [loanIds, lpBal] = await Promise.all([c.getBorrowLoans(addr), c.getLPBalance(addr)]);

  const loans = await Promise.all(loanIds.map(async id => {
    const [loan, debt, hf, liquidatable] = await Promise.all([
      c.getLoan(id), c.currentDebt(id), c.healthFactor(id), c.isLiquidatable(id)
    ]);
    return {
      id:               fmt(id),
      principal:        fmt(loan.principal),
      collateralLocked: fmt(loan.collateralLocked),
      currentDebt:      fmt(debt),
      healthFactor:     fmt(hf),
      dueAt:            fmt(loan.dueAt),
      openedAt:         fmt(loan.openedAt),
      active:           loan.active,
      liquidatable,
    };
  }));
  res.json({ loans, lpBalance: fmt(lpBal) });
}));

// GET /api/margin/loan/:id
marginRouter.get('/loan/:id', safe(async (req, res) => {
  const c = margin(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const id = Number(req.params.id);
  const [loan, debt, hf, liq] = await Promise.all([
    c.getLoan(id), c.currentDebt(id), c.healthFactor(id), c.isLiquidatable(id)
  ]);
  res.json({ id, principal: fmt(loan.principal), collateralLocked: fmt(loan.collateralLocked),
    currentDebt: fmt(debt), healthFactor: fmt(hf), active: loan.active, liquidatable: liq,
    openedAt: fmt(loan.openedAt), dueAt: fmt(loan.dueAt) });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  LP COLLATERAL ROUTES  /api/lpcollateral/*
// ═══════════════════════════════════════════════════════════════════════════
const lpCollRouter = express.Router();

// GET /api/lpcollateral/types
lpCollRouter.get('/types', safe(async (req, res) => {
  const c = lpcoll(); if (!c) return res.json([]);
  const count = Number(await c.collateralTypeCount());
  const types = [];
  for (let i = 0; i < count; i++) {
    const ct = await c.collateralTypes(i);
    types.push({
      id:                     i,
      enabled:                ct.enabled,
      method:                 ['WLP','WikiSpot','UniV5','External'][ct.method],
      lpToken:                ct.lpToken,
      ltvBps:                 fmt(ct.ltvBps),
      liquidationThreshBps:   fmt(ct.liquidationThresholdBps),
      liquidationBonusBps:    fmt(ct.liquidationBonusBps),
      totalDeposited:         fmt(ct.totalDeposited),
    });
  }
  res.json(types);
}));

// GET /api/lpcollateral/user/:address
lpCollRouter.get('/user/:address', safe(async (req, res) => {
  const c = lpcoll(); if (!c) return res.json({ vaults: [], lpBalance: '0' });
  const addr = req.params.address;
  const [vaultIds, lpBal] = await Promise.all([c.getBorrowerVaults(addr), c.getLPBalance(addr)]);

  const vaults = await Promise.all(vaultIds.map(async id => {
    const [v, debt, hf] = await Promise.all([c.getVault(id), c.vaultDebt(id), c.vaultHealthFactor(id)]);
    return {
      id:               fmt(id),
      collateralTypeId: fmt(v.collateralTypeId),
      lpAmount:         fmt(v.lpAmount),
      debtPrincipal:    fmt(v.debtPrincipal),
      currentDebt:      fmt(debt),
      healthFactor:     fmt(hf),
      active:           v.active,
    };
  }));
  res.json({ vaults, lpBalance: fmt(lpBal) });
}));

// GET /api/lpcollateral/valueLp/:ctId/:amount
lpCollRouter.get('/valueLp/:ctId/:amount', safe(async (req, res) => {
  const c = lpcoll(); if (!c) return res.json({ value: '0' });
  const val = await c.valueLp(Number(req.params.ctId), req.params.amount);
  res.json({ value: fmt(val) });
}));

// GET /api/lpcollateral/stats
lpCollRouter.get('/stats', safe(async (req, res) => {
  const c = lpcoll(); if (!c) return res.json({});
  const [borrowed, reserves] = await Promise.all([c.totalBorrowed(), c.totalReserves()]);
  res.json({ totalBorrowed: fmt(borrowed), totalReserves: fmt(reserves) });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  CROSS-CHAIN LENDING ROUTES  /api/crosslending/*
// ═══════════════════════════════════════════════════════════════════════════
const cclRouter = express.Router();

const CHAIN_NAMES = { 1: 'Ethereum', 42161: 'Arbitrum', 10: 'Optimism', 8453: 'Base', 137: 'Polygon' };

// GET /api/crosslending/stats
cclRouter.get('/stats', safe(async (req, res) => {
  const c = ccl(); if (!c) return res.json({});
  const [borrowed, supplied, apy, posCount, borrowCount, threshold, relCount] = await Promise.all([
    c.totalBorrowed(), c.totalSuppliedUSD(), c.crossChainBorrowAPY(),
    c.positionCount(), c.borrowCount(), c.relayerThreshold(), c.relayerCount(),
  ]);
  res.json({
    totalBorrowed:    fmt(borrowed),
    totalSuppliedUSD: fmt(supplied),
    crossChainAPY:    fmt(apy),
    positionCount:    fmt(posCount),
    borrowCount:      fmt(borrowCount),
    relayerThreshold: fmt(threshold),
    relayerCount:     fmt(relCount),
  });
}));

// GET /api/crosslending/user/:address
cclRouter.get('/user/:address', safe(async (req, res) => {
  const c = ccl(); if (!c) return res.json({ positions: [], borrows: [], healthFactor: '0' });
  const addr = req.params.address;
  const [posIds, borrowIds, hf] = await Promise.all([
    c.getUserPositions(addr), c.getUserBorrows(addr), c.userHealthFactor(addr)
  ]);

  const positions = await Promise.all(posIds.map(async id => {
    const p = await c.getPosition(id);
    return {
      id:           fmt(id),
      supplyToken:  p.supplyToken,
      supplyAmount: fmt(p.supplyAmount),
      srcChain:     CHAIN_NAMES[Number(p.srcChain)] || fmt(p.srcChain),
      depositedAt:  fmt(p.depositedAt),
      active:       p.active,
    };
  }));

  const borrows = await Promise.all(borrowIds.map(async id => {
    const b = await c.getBorrow(id);
    return {
      id:              fmt(id),
      token:           b.token,
      principal:       fmt(b.principal),
      crossChainPosId: fmt(b.crossChainPosId),
      active:          b.active,
    };
  }));

  res.json({ positions, borrows, healthFactor: fmt(hf) });
}));

// GET /api/crosslending/assets
cclRouter.get('/assets', safe(async (req, res) => {
  const c = ccl(); if (!c) return res.json([]);
  const tokens = await c.getAssets().catch(() => []);
  res.json(tokens.map(t => ({ token: t, symbol: SUPPORTED_TOKENS[t] || t.slice(0, 8) })));
}));

// GET /api/crosslending/message/:msgId
cclRouter.get('/message/:msgId', safe(async (req, res) => {
  const c = ccl(); if (!c) return res.status(404).json({ error: 'not deployed' });
  const [msg, approvals] = await c.getPendingMessage(req.params.msgId);
  res.json({
    user:      msg.user,
    token:     msg.token,
    amount:    fmt(msg.amount),
    srcChain:  CHAIN_NAMES[Number(msg.srcChain)] || fmt(msg.srcChain),
    msgType:   ['Supply','Repay','LiquidationRequest'][msg.msgType],
    approvals: fmt(approvals),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { flashRouter, marginRouter, lpCollRouter, cclRouter };
