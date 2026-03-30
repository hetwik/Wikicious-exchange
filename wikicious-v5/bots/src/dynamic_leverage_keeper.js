/**
 * dynamic_leverage_keeper.js
 *
 * Keeper bot that calls WikiDynamicLeverage.updateLeverageCaps() every 5 minutes.
 * If the insurance fund has crossed a tier boundary, this pushes the new
 * leverage caps to WikiPerp and WikiVirtualAMM automatically.
 *
 * Deploy: pm2 start src/dynamic_leverage_keeper.js --name wiki-dynlev
 */

'use strict';
const { ethers } = require('ethers');
require('dotenv').config();

// ── Config ───────────────────────────────────────────────────────────────────
const RPC_URL       = process.env.ARBITRUM_RPC_URL;
const KEEPER_KEY    = process.env.KEEPER_PRIVATE_KEY;
const DYNLEV_ADDR   = process.env.DYNLEV_ADDRESS;
const CHECK_INTERVAL= parseInt(process.env.DYNLEV_INTERVAL_MS || '300000'); // 5 min

if (!RPC_URL || !KEEPER_KEY || !DYNLEV_ADDR) {
  console.error('❌ Missing env vars: ARBITRUM_RPC_URL, KEEPER_PRIVATE_KEY, DYNLEV_ADDRESS');
  process.exit(1);
}

const ABI = [
  'function updateLeverageCaps() external',
  'function status() external view returns (uint256 fund, uint256 tier, string tierName, uint256 maxLev, uint256 maxPos, uint256 maxOI, uint256 nextFundNeeded, uint256 nextMaxLev, uint256 nextUpdateAllowed)',
  'function lastUpdateTime() external view returns (uint256)',
  'function updateCooldown() external view returns (uint256)',
  'event TierAdvanced(uint256 indexed newTierIdx, string tierName, uint256 maxLeverage, uint256 maxPosition, uint256 insuranceFund)',
  'event TierReduced(uint256 indexed newTierIdx, string tierName, uint256 maxLeverage, uint256 reason)',
  'event CapsUpdated(uint256 maxLeverage, uint256 maxPositionUsdc, uint256 maxOIPerMarket, uint256 insuranceFund, address caller)',
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(KEEPER_KEY, provider);
  const dynLev   = new ethers.Contract(DYNLEV_ADDR, ABI, wallet);

  console.log(`[DynLev Keeper] Started — ${new Date().toISOString()}`);
  console.log(`  Contract : ${DYNLEV_ADDR}`);
  console.log(`  Keeper   : ${wallet.address}`);
  console.log(`  Interval : ${CHECK_INTERVAL / 1000}s`);

  // Listen for tier events
  dynLev.on('TierAdvanced', (idx, name, lev, pos, fund) => {
    const levN  = Number(lev);
    const posN  = Number(pos) / 1e6;
    const fundN = Number(fund) / 1e6;
    console.log(`🚀 TIER UP → ${name}  |  Max Lev: ${levN}×  |  Max Pos: $${posN.toFixed(0)}  |  Fund: $${fundN.toFixed(2)}`);
    // In production: send Telegram/Discord notification here
  });

  dynLev.on('TierReduced', (idx, name, lev) => {
    console.log(`⬇  TIER DOWN → ${name}  |  Max Lev: ${Number(lev)}× (fund shrunk)`);
    // In production: send alert — something consumed the insurance fund
  });

  await runCheck(dynLev);
  setInterval(() => runCheck(dynLev), CHECK_INTERVAL);
}

async function runCheck(dynLev) {
  try {
    const s = await dynLev.status();
    const fund        = Number(s.fund)              / 1e6;
    const maxLev      = Number(s.maxLev);
    const maxPos      = Number(s.maxPos)             / 1e6;
    const nextNeeded  = Number(s.nextFundNeeded)     / 1e6;
    const nextMaxLev  = Number(s.nextMaxLev);
    const nextAllowed = Number(s.nextUpdateAllowed);
    const now         = Math.floor(Date.now() / 1000);

    console.log(`[${new Date().toISOString()}] Tier: ${s.tierName} | Lev: ${maxLev}× | Pos: $${maxPos.toFixed(0)} | Fund: $${fund.toFixed(2)}`);

    if (nextNeeded > 0) {
      console.log(`  → Next tier (${nextMaxLev}×) needs $${nextNeeded.toFixed(2)} more in fund`);
    } else if (nextMaxLev === maxLev) {
      console.log(`  → MAX TIER reached`);
    }

    // Can we call update?
    if (now < nextAllowed) {
      const wait = nextAllowed - now;
      console.log(`  → Cooldown: ${wait}s remaining`);
      return;
    }

    // Estimate gas before calling
    let gasEst;
    try {
      gasEst = await dynLev.updateLeverageCaps.estimateGas();
    } catch {
      console.log('  → updateLeverageCaps: nothing changed (revert = no-op), skipping');
      return;
    }

    const tx = await dynLev.updateLeverageCaps({
      gasLimit: gasEst * 120n / 100n, // 20% buffer
    });

    console.log(`  → Sent updateLeverageCaps tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);

  } catch (err) {
    console.error(`[DynLev Keeper] Error: ${err.message?.slice(0, 120)}`);
  }
}

main().catch(console.error);
