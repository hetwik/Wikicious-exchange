'use strict';
const { ethers } = require('ethers');
const { getKeeperContract, getVault, getProvider, ADDRESSES } = require('../services/chain');

const PERP_ABI = [
  'function placeMarketOrder(uint256 marketIndex, bool isLong, uint256 collateral, uint256 leverage, uint256 takeProfit, uint256 stopLoss) returns (uint256)',
  'function placeMarketOrderFor(address trader, uint256 marketIndex, bool isLong, uint256 collateral, uint256 leverage, uint256 takeProfit, uint256 stopLoss) returns (uint256)',
  'function closePosition(uint256 posId)',
  'function closePositionFor(address trader, uint256 posId)',
  'function getAllPositions(address trader) view returns (tuple(uint256,uint256,bool,bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)[])',
];

const VAULT_ABI = [
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function freeMargin(address) view returns (uint256)',
  'function lockedMargin(address) view returns (uint256)',
];

module.exports = function(app) {
  // ── Get positions ──────────────────────────────────────────
  app.get('/api/account/:wallet/positions', async (req, res) => {
    try {
      const provider = getProvider();
      const perp = new ethers.Contract(ADDRESSES.WikiPerp, PERP_ABI, provider);
      const raw = await perp.getAllPositions(req.params.wallet);
      const positions = raw.map((p, i) => ({
        id:            Number(p[0]),
        marketIndex:   Number(p[1]),
        isLong:        p[2],
        open:          p[3],
        collateral:    Number(ethers.formatUnits(p[4], 6)),
        size:          Number(ethers.formatUnits(p[5], 6)),
        entryPrice:    Number(ethers.formatUnits(p[6], 8)),
        liqPrice:      Number(ethers.formatUnits(p[7], 8)),
        leverage:      Number(p[8]),
        unrealizedPnl: Number(ethers.formatUnits(p[9], 6)),
        takeProfit:    Number(ethers.formatUnits(p[10], 8)) || null,
        stopLoss:      Number(ethers.formatUnits(p[11], 8)) || null,
        openedAt:      0,
      })).filter(p => p.open);
      res.json(positions);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Get balance ─────────────────────────────────────────────
  app.get('/api/account/:wallet/balance', async (req, res) => {
    try {
      const provider = getProvider();
      const vault = new ethers.Contract(ADDRESSES.WikiVault, VAULT_ABI, provider);
      const [free, locked] = await Promise.all([
        vault.freeMargin(req.params.wallet),
        vault.lockedMargin(req.params.wallet),
      ]);
      res.json({
        free:   Number(ethers.formatUnits(free, 6)),
        locked: Number(ethers.formatUnits(locked, 6)),
        total:  Number(ethers.formatUnits(free + locked, 6)),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Place order (keeper submits on behalf) ──────────────────
  // NOTE: In production this uses ERC-4337 paymaster or relayer.
  // The trader signs the order off-chain, keeper submits on-chain.
  app.post('/api/trade/order', async (req, res) => {
    try {
      const { wallet, marketIndex, isLong, collateral, leverage, takeProfit, stopLoss } = req.body;
      if (!wallet || !marketIndex === undefined || !collateral) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const keeperPerp = await getKeeperContract(ADDRESSES.WikiPerp, PERP_ABI);
      const tx = await keeperPerp.placeMarketOrderFor(
        wallet,
        marketIndex,
        isLong,
        ethers.parseUnits(String(collateral), 6),
        leverage,
        takeProfit ? ethers.parseUnits(String(takeProfit), 8) : 0,
        stopLoss   ? ethers.parseUnits(String(stopLoss),   8) : 0,
      );
      const receipt = await tx.wait(1);
      res.json({ success: true, txHash: receipt.hash, orderId: null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Close position ──────────────────────────────────────────
  app.post('/api/trade/close', async (req, res) => {
    try {
      const { wallet, positionId } = req.body;
      const keeperPerp = await getKeeperContract(ADDRESSES.WikiPerp, PERP_ABI);
      const tx = await keeperPerp.closePositionFor(wallet, positionId);
      const receipt = await tx.wait(1);
      res.json({ success: true, txHash: receipt.hash });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Deposit USDC ────────────────────────────────────────────
  app.post('/api/account/deposit', async (req, res) => {
    try {
      const { wallet, amount } = req.body;
      const keeperVault = await getKeeperContract(ADDRESSES.WikiVault, VAULT_ABI);
      const tx = await keeperVault.depositFor(wallet, ethers.parseUnits(String(amount), 6));
      const receipt = await tx.wait(1);
      res.json({ success: true, txHash: receipt.hash });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Withdraw USDC ───────────────────────────────────────────
  app.post('/api/account/withdraw', async (req, res) => {
    try {
      const { wallet, amount } = req.body;
      const keeperVault = await getKeeperContract(ADDRESSES.WikiVault, VAULT_ABI);
      const tx = await keeperVault.withdrawFor(wallet, ethers.parseUnits(String(amount), 6));
      const receipt = await tx.wait(1);
      res.json({ success: true, txHash: receipt.hash });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
};

// ── Prop Pool Yield Stats ───────────────────────────────────────
app.get('/api/prop/pool/yield', async (req, res) => {
  try {
    const provider = getProvider();
    const YIELD_ABI = [
      'function totalDeployed() view returns (uint256)',
      'function deployedToAave() view returns (uint256)',
      'function deployedToLending() view returns (uint256)',
      'function estimatedAPY() view returns (uint256)',
      'function totalYieldGenerated() view returns (uint256)',
    ];
    const POOL_ABI = ['function availableCapital() view returns (uint256)', 'function totalDeposited() view returns (uint256)'];
    const yc = new ethers.Contract(ADDRESSES.WikiPropPoolYield || ethers.ZeroAddress, YIELD_ABI, provider);
    const pc = new ethers.Contract(ADDRESSES.WikiPropPool      || ethers.ZeroAddress, POOL_ABI, provider);
    const [td, dAave, dLend, apy, yg, avail, total] = await Promise.all([
      yc.totalDeployed(), yc.deployedToAave(), yc.deployedToLending(),
      yc.estimatedAPY(), yc.totalYieldGenerated(), pc.availableCapital(), pc.totalDeposited()
    ]);
    res.json({
      totalDeployed: Number(td), deployedToAave: Number(dAave), deployedToLending: Number(dLend),
      estimatedAPY: Number(apy), totalYieldGenerated: Number(yg),
      propPoolTVL: Number(total), idleCapacity: Number(avail),
      utilizationPct: Number(total) > 0 ? (Number(total) - Number(avail)) / Number(total) * 100 : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
