'use strict';
/**
 * WikiPropPoolYield Keeper
 * Runs every 6 hours — deploys idle prop pool capital to yield strategies
 * Runs every 24 hours — harvests yield and sends to prop pool
 * Runs before every funded account creation — recalls deployed capital
 */
const { ethers } = require('ethers');
const { getProvider } = require('./chain');

const PROP_POOL_YIELD_ABI = [
  'function deployIdle(uint256 amount) external',
  'function recall(uint256 amountNeeded, string calldata reason) external',
  'function harvestYield() external',
  'function totalDeployed() view returns (uint256)',
  'function idleCapacityToDeply(uint256 propPoolIdleBalance) view returns (uint256)',
  'function estimatedAPY() view returns (uint256)',
];

const PROP_POOL_ABI = [
  'function availableCapital() view returns (uint256)',
  'function totalDeposited() view returns (uint256)',
];

const USDC_ABI = ['function balanceOf(address) view returns (uint256)'];

class PropPoolYieldKeeper {
  constructor(keeperPrivateKey) {
    const provider = getProvider();
    this.wallet = new ethers.Wallet(keeperPrivateKey, provider);
    this.yieldContract = null;
    this.propPool      = null;
    this.usdc          = null;
  }

  init(yieldAddr, propPoolAddr, usdcAddr) {
    this.yieldContract = new ethers.Contract(yieldAddr,   PROP_POOL_YIELD_ABI, this.wallet);
    this.propPool      = new ethers.Contract(propPoolAddr, PROP_POOL_ABI, this.wallet);
    this.usdc          = new ethers.Contract(usdcAddr,    USDC_ABI, this.wallet);
    console.log('[PropPoolYield] Keeper initialized');
  }

  // ── Every 6 hours: deploy idle capital ──────────────────────
  async deployIdle() {
    try {
      const available    = await this.propPool.availableCapital();
      const totalDep     = await this.propPool.totalDeposited();
      if (totalDep === 0n) return;

      // Only deploy if utilization < 70%
      const utilization  = (totalDep - available) * 10000n / totalDep;
      if (utilization >= 7000n) {
        console.log(`[PropPoolYield] Skipping deploy — utilization ${Number(utilization)/100}% > 70%`);
        return;
      }

      // How much can we deploy?
      const yieldBal     = await this.usdc.balanceOf(await this.yieldContract.getAddress());
      const deployable   = await this.yieldContract.idleCapacityToDeply(yieldBal);
      
      if (deployable < ethers.parseUnits('1000', 6)) {
        console.log('[PropPoolYield] Less than $1K idle — skipping deploy');
        return;
      }

      const tx = await this.yieldContract.deployIdle(deployable);
      await tx.wait();
      console.log(`[PropPoolYield] Deployed $${ethers.formatUnits(deployable, 6)} to yield strategies`);
    } catch (e) {
      console.error('[PropPoolYield] Deploy error:', e.message?.slice(0,80));
    }
  }

  // ── Every 24 hours: harvest yield ───────────────────────────
  async harvestYield() {
    try {
      const tx = await this.yieldContract.harvestYield();
      await tx.wait();
      console.log('[PropPoolYield] Yield harvested and sent to prop pool');
    } catch (e) {
      console.error('[PropPoolYield] Harvest error:', e.message?.slice(0,80));
    }
  }

  // ── Called before funded account creation: recall capital ───
  async recallForFunding(amountNeeded) {
    try {
      const deployed = await this.yieldContract.totalDeployed();
      if (deployed === 0n) return;
      const tx = await this.yieldContract.recall(amountNeeded, 'trader_funding');
      await tx.wait();
      console.log(`[PropPoolYield] Recalled $${ethers.formatUnits(amountNeeded, 6)} for trader funding`);
    } catch (e) {
      console.error('[PropPoolYield] Recall error:', e.message?.slice(0,80));
    }
  }

  // ── Stats for API ────────────────────────────────────────────
  async getStats() {
    try {
      const [deployed, apy, totalPool, available] = await Promise.all([
        this.yieldContract.totalDeployed(),
        this.yieldContract.estimatedAPY(),
        this.propPool.totalDeposited(),
        this.propPool.availableCapital(),
      ]);
      return {
        totalDeployed:    Number(deployed),
        estimatedAPY:     Number(apy),
        propPoolTVL:      Number(totalPool),
        idleCapacity:     Number(available),
        utilizationPct:   totalPool > 0n ? Number((totalPool - available) * 10000n / totalPool) / 100 : 0,
      };
    } catch { return {}; }
  }
}

module.exports = PropPoolYieldKeeper;
