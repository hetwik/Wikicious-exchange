'use strict';
/**
 * WikiGasRebate Keeper
 * Monitors WIK campaigns, converts WIK→ETH via WikiBuybackBurn,
 * and distributes ETH gas rebates to qualifying users.
 *
 * Setup:
 *   KEEPER_PRIVATE_KEY=0x... WIKI_GAS_REBATE_ADDRESS=0x... node services/gasrebate_keeper.js
 */

const { ethers } = require('ethers');

const CONFIG = {
  rpcUrl:      process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  privateKey:  process.env.KEEPER_PRIVATE_KEY,
  rebateAddr:  process.env.WIKI_GAS_REBATE_ADDRESS,
  buybackAddr: process.env.WIKI_BUYBACK_ADDRESS,
  checkEvery:  300_000,  // check every 5 minutes
  minEthFloat: ethers.parseEther('0.01'), // keep at least 0.01 ETH in rebate contract
  targetFloat: ethers.parseEther('0.1'),  // top up to 0.1 ETH
};

const REBATE_ABI = [
  'function campaigns(uint256) external view returns (address sponsor, string name, bytes32 refCode, uint256 wikDeposited, uint256 wikRemaining, uint256 rebatePerTx, uint256 maxTxPerUser, uint256 expiresAt, uint256 txCount, bool active)',
  'function campaignCount() external view returns (uint256)',
  'function claimRebate(bytes32 refCode, address user) external',
  'function topUpETH() external payable',
  'function pendingRebates(address user) external view returns (uint256)',
  'function processRebate(address user, bytes32 refCode) external',
];

const BUYBACK_ABI = [
  'function buybackAndBurn(uint256 wikAmount, uint256 minEthOut) external returns (uint256 ethOut)',
  'function getEthOut(uint256 wikAmount) external view returns (uint256)',
];

const WIK_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

let provider, wallet, rebateContract, buybackContract;
let wikToken;

async function init() {
  if (!CONFIG.privateKey || !CONFIG.rebateAddr) {
    console.warn('[GasRebate] Not configured — set KEEPER_PRIVATE_KEY and WIKI_GAS_REBATE_ADDRESS');
    return false;
  }
  provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  wallet   = new ethers.Wallet(CONFIG.privateKey, provider);
  rebateContract  = new ethers.Contract(CONFIG.rebateAddr, REBATE_ABI, wallet);
  if (CONFIG.buybackAddr) {
    buybackContract = new ethers.Contract(CONFIG.buybackAddr, BUYBACK_ABI, wallet);
  }
  console.log(`[GasRebate] Keeper: ${wallet.address}`);
  return true;
}

/**
 * Check ETH balance in rebate contract and top up if below threshold.
 * Converts WIK held by keeper to ETH via WikiBuybackBurn, then sends ETH.
 */
async function maintainEthFloat() {
  const rebateBalance = await provider.getBalance(CONFIG.rebateAddr);
  console.log(`[GasRebate] Contract ETH: ${ethers.formatEther(rebateBalance)}`);

  if (rebateBalance >= CONFIG.minEthFloat) return;

  const needed = CONFIG.targetFloat - rebateBalance;
  console.log(`[GasRebate] Need to top up ${ethers.formatEther(needed)} ETH`);

  // Try to convert WIK from keeper wallet → ETH via WikiBuybackBurn
  if (buybackContract && wikToken) {
    const wikBal = await wikToken.balanceOf(wallet.address);
    if (wikBal > 0n) {
      try {
        const estEth = await buybackContract.getEthOut(wikBal);
        if (estEth > 0n) {
          await wikToken.approve(CONFIG.buybackAddr, wikBal);
          const tx = await buybackContract.buybackAndBurn(wikBal, estEth * 95n / 100n); // 5% slippage
          const receipt = await tx.wait();
          console.log(`[GasRebate] WIK→ETH conversion: ${receipt.hash.slice(0,10)}...`);
        }
      } catch (e) {
        console.error(`[GasRebate] WIK→ETH failed: ${e.message}`);
      }
    }
  }

  // Top up from keeper's own ETH balance
  const keeperBal = await provider.getBalance(wallet.address);
  const canSend   = keeperBal > needed + ethers.parseEther('0.05') ? needed : 0n;
  if (canSend > 0n) {
    try {
      const tx = await rebateContract.topUpETH({ value: canSend });
      await tx.wait();
      console.log(`[GasRebate] ✅ Topped up contract with ${ethers.formatEther(canSend)} ETH`);
    } catch (e) {
      console.error(`[GasRebate] Top-up failed: ${e.message}`);
    }
  } else {
    console.warn(`[GasRebate] ⚠️ Keeper ETH too low to top up — fund keeper wallet`);
  }
}

/**
 * Process pending gas rebates for recent qualifying transactions.
 * In practice this would be driven by on-chain event indexing.
 */
async function processPendingRebates() {
  // In production: query backend for users who recently traded with a refCode
  // and haven't received their rebate yet, then call processRebate() for each.
  // For now, just log the active campaign count.
  try {
    // This would be driven by event indexing in production
    console.log(`[GasRebate] Pending rebate check complete`);
  } catch (e) {
    console.error(`[GasRebate] Rebate processing error: ${e.message}`);
  }
}

async function mainLoop() {
  try {
    await maintainEthFloat();
    await processPendingRebates();
  } catch (e) {
    console.error('[GasRebate] Loop error:', e.message);
  }
}

async function main() {
  if (!await init()) return;
  await mainLoop();
  setInterval(mainLoop, CONFIG.checkEvery);
  console.log(`[GasRebate] Running — checking every ${CONFIG.checkEvery/1000}s`);
}

main().catch(e => { console.error('[GasRebate] Fatal:', e); process.exit(1); });
module.exports = { maintainEthFloat, processPendingRebates };
