/**
 * internal_arb_bot.js  —  Wikicious V5
 *
 * Off-chain keeper that watches for internal price gaps and triggers
 * WikiInternalArb.executeArb() when profitable.
 *
 * ─── WHAT IT WATCHES ─────────────────────────────────────────────────────────
 *
 *   Gap Type A — vAMM vs Oracle
 *     Every 15 seconds: reads WikiVirtualAMM virtual price for each market
 *     and compares to WikiOracle. If gap > MIN_GAP_BPS (0.15%), checks
 *     profitability and executes.
 *
 *   Gap Type B — WikiSpot pool vs WikiSpot pool
 *     Same polling loop: checks two adjacent WikiSpot pools for the same
 *     base token. If pool A quotes a different price to pool B by > threshold,
 *     executes the cross-pool arb.
 *
 * ─── PROFITABILITY FORMULA ───────────────────────────────────────────────────
 *
 *   gross = arbSize × gapBps / 10000
 *   flashFee = arbSize × 9 / 10000    (0.09%)
 *   swapFees = arbSize × 10 / 10000   (0.10% two swaps)
 *   net = gross - flashFee - swapFees
 *
 *   Keeper receives 10% of net profit (WikiInternalArb.KEEPER_SHARE)
 *
 * ─── DEPLOY ──────────────────────────────────────────────────────────────────
 *
 *   pm2 start src/internal_arb_bot.js --name wiki-internal-arb
 *
 * ─── ENV VARS ─────────────────────────────────────────────────────────────────
 *
 *   ARBITRUM_RPC_URL         Alchemy/QuickNode RPC
 *   KEEPER_PRIVATE_KEY       Bot wallet private key (needs ETH for gas)
 *   INTERNAL_ARB_ADDRESS     WikiInternalArb deployed address
 *   VAMM_ADDRESS             WikiVirtualAMM deployed address
 *   SPOT_ADDRESS             WikiSpot deployed address
 *   ORACLE_ADDRESS           WikiOracle deployed address
 *   POLL_INTERVAL_MS         How often to scan (default: 15000 = 15s)
 *   MIN_KEEPER_PROFIT_USD    Skip arbs earning keeper less than this (default: 0.50)
 *   MAX_ARB_SIZE_USDC        Max USDC per arb (default: 10000)
 *   DRY_RUN                  Set to "true" to log without executing
 */

'use strict';

const { ethers } = require('ethers');
require('dotenv').config();

// ─── Config ───────────────────────────────────────────────────────────────────
const RPC_URL       = process.env.ARBITRUM_RPC_URL;
const KEEPER_KEY    = process.env.KEEPER_PRIVATE_KEY;
const ARB_ADDR      = process.env.INTERNAL_ARB_ADDRESS;
const VAMM_ADDR     = process.env.VAMM_ADDRESS;
const SPOT_ADDR     = process.env.SPOT_ADDRESS;
const ORACLE_ADDR   = process.env.ORACLE_ADDRESS;
const POLL_MS       = parseInt(process.env.POLL_INTERVAL_MS   || '15000');
const MIN_KEEPER_P  = parseFloat(process.env.MIN_KEEPER_PROFIT_USD || '0.50');
const MAX_SIZE      = BigInt(process.env.MAX_ARB_SIZE_USDC ? Number(process.env.MAX_ARB_SIZE_USDC) * 1e6 : 10_000 * 1e6);
const DRY_RUN       = process.env.DRY_RUN === 'true';

if (!RPC_URL || !KEEPER_KEY || !ARB_ADDR) {
  console.error('❌  Missing env vars: ARBITRUM_RPC_URL, KEEPER_PRIVATE_KEY, INTERNAL_ARB_ADDRESS');
  process.exit(1);
}

// ─── ABIs (minimal) ───────────────────────────────────────────────────────────
const ARB_ABI = [
  'function executeArb(uint8 arbType, bytes32 marketId, uint256 poolId, uint256 arbSize, uint256 minProfit) external',
  'function checkGap(uint8 arbType, bytes32 marketId, uint256 poolId) external view returns (uint256 gapBps, bool aIsCheaper)',
  'function estimateProfit(uint8 arbType, bytes32 marketId, uint256 poolId, uint256 arbSize) external view returns (bool profitable, uint256 estNetProfit, uint256 estGapBps, uint256 maxSafe)',
  'function lastArbTime(bytes32 marketId) external view returns (uint256)',
  'function stats() external view returns (uint256 totalProfit, uint256 arbCount, uint256 toStakers, uint256 toInsurance, uint256 toKeepers, uint256 lastArbTs)',
  'function keepers(address) external view returns (bool)',
  'event ArbExecuted(uint256 indexed arbId, uint8 arbType, bytes32 indexed marketId, uint256 arbSize, uint256 netProfit, uint256 toSplitter, uint256 toInsurance, uint256 toKeeper, address indexed keeper)',
  'event GapDetected(bytes32 indexed marketId, uint256 gapBps, bool vammCheaper)',
  'event ArbSkipped(bytes32 indexed marketId, string reason)',
];

const VAMM_ABI = [
  'function markets(bytes32 marketId) external view returns (bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)',
  'function marketsLength() external view returns (uint256)',
];

const ORACLE_ABI = [
  'function getPrice(bytes32 id) external view returns (uint256 price, uint256 updatedAt)',
];

const SPOT_ABI = [
  'function getAmountOut(uint256 poolId, address tokenIn, uint256 amtIn) external view returns (uint256 amtOut, uint256 priceImpactBps)',
];

// ─── Market definitions ───────────────────────────────────────────────────────
const MARKETS = [
  { id: ethers.id('BTCUSDT'),  symbol: 'BTC/USDT',  poolId: 1, type: 'vamm' },
  { id: ethers.id('ETHUSDT'),  symbol: 'ETH/USDT',  poolId: 2, type: 'vamm' },
  { id: ethers.id('SOLUSDT'),  symbol: 'SOL/USDT',  poolId: 3, type: 'vamm' },
  { id: ethers.id('ARBUTDT'),  symbol: 'ARB/USDT',  poolId: 4, type: 'vamm' },
];

// Spot pool pairs to check for cross-pool gaps
const SPOT_PAIRS = [
  { poolA: 0, poolB: 2, symbol: 'WETH/USDC pools 0 vs 2' },
  { poolA: 1, poolB: 3, symbol: 'WBTC/USDC pools 1 vs 3' },
];

const ARB_VAMM_VS_ORACLE = 1;
const ARB_SPOT_VS_VAMM   = 2;
const BPS = 10_000n;

// ─── State ────────────────────────────────────────────────────────────────────
let arbContract, vammContract, oracleContract, spotContract;
let provider, wallet;

let sessionProfit   = 0n; // USDC 6dec
let sessionArbs     = 0;
let sessionKeeper   = 0n;
let startTime       = Date.now();

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  provider       = new ethers.JsonRpcProvider(RPC_URL);
  wallet         = new ethers.Wallet(KEEPER_KEY, provider);
  arbContract    = new ethers.Contract(ARB_ADDR,   ARB_ABI,    wallet);
  if (VAMM_ADDR)   vammContract   = new ethers.Contract(VAMM_ADDR,  VAMM_ABI,   wallet);
  if (ORACLE_ADDR) oracleContract = new ethers.Contract(ORACLE_ADDR, ORACLE_ABI, wallet);
  if (SPOT_ADDR)   spotContract   = new ethers.Contract(SPOT_ADDR,  SPOT_ABI,   wallet);

  const keeperBal = await provider.getBalance(wallet.address);
  const isKeeper  = await arbContract.keepers(wallet.address).catch(() => false);

  console.log('');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│         WIKICIOUS INTERNAL ARB BOT  v2.0                │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│  Keeper wallet : ${wallet.address}  │`);
  console.log(`│  ETH balance   : ${ethers.formatEther(keeperBal)} ETH              │`);
  console.log(`│  Is registered : ${isKeeper ? '✅ YES' : '❌ NO — run setKeeper() first'}          │`);
  console.log(`│  Arb contract  : ${ARB_ADDR}  │`);
  console.log(`│  Poll interval : ${POLL_MS / 1000}s                              │`);
  console.log(`│  Min profit    : $${MIN_KEEPER_P.toFixed(2)} per arb (keeper share)     │`);
  console.log(`│  Dry run mode  : ${DRY_RUN ? '⚠️  YES — not executing' : '🟢 NO — live mode'}             │`);
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log('');

  if (!isKeeper && !DRY_RUN) {
    console.warn('⚠️  Keeper not registered. Call WikiInternalArb.setKeeper(yourAddress, true) first.');
    console.warn('   Running in observation mode only...');
  }

  // Listen for on-chain events
  arbContract.on('ArbExecuted', (arbId, arbType, marketId, arbSize, netProfit, toSplitter, toInsurance, toKeeper, keeper) => {
    const profit = Number(netProfit) / 1e6;
    const keeperShare = Number(toKeeper) / 1e6;
    console.log(`\n🚀 ARB EXECUTED #${arbId}  |  Net: $${profit.toFixed(4)}  |  Keeper: $${keeperShare.toFixed(4)}`);
  });

  // Start main poll loop
  await scanAndExecute();
  setInterval(scanAndExecute, POLL_MS);

  // Print stats every 5 minutes
  setInterval(printStats, 5 * 60 * 1000);
}

// ─── Main scan loop ───────────────────────────────────────────────────────────
async function scanAndExecute() {
  try {
    const block = await provider.getBlockNumber();
    const ts    = Math.floor(Date.now() / 1000);
    let   opportunities = 0;

    // ── Scan vAMM vs Oracle gaps ──────────────────────────────────────────
    for (const mkt of MARKETS) {
      try {
        const lastArb = Number(await arbContract.lastArbTime(mkt.id));
        const cooldownOk = ts >= lastArb + 30;
        if (!cooldownOk) continue;

        const [gapBps, vammCheaper] = await arbContract.checkGap(
          ARB_VAMM_VS_ORACLE, mkt.id, mkt.poolId
        );
        const gap = Number(gapBps);

        if (gap === 0) continue;

        console.log(`[${new Date().toISOString()}] ${mkt.symbol} — Gap: ${(gap/100).toFixed(3)}% (${vammCheaper ? 'vAMM cheap' : 'Spot cheap'})`);

        if (gap < 15) continue; // below MIN_GAP_BPS on-chain threshold

        // Estimate profitability
        const arbSize = MAX_SIZE;
        const [profitable, estNet, estGap, maxSafe] = await arbContract.estimateProfit(
          ARB_VAMM_VS_ORACLE, mkt.id, mkt.poolId, arbSize
        );

        const netUSD     = Number(estNet)    / 1e6;
        const keeperUSD  = netUSD * 0.10;
        const maxSafeUSD = Number(maxSafe)   / 1e6;

        if (!profitable) {
          console.log(`   → Not profitable (gap ${(gap/100).toFixed(3)}% after fees: $${netUSD.toFixed(4)} net)`);
          continue;
        }
        if (keeperUSD < MIN_KEEPER_P) {
          console.log(`   → Keeper profit too low: $${keeperUSD.toFixed(4)} < $${MIN_KEEPER_P}`);
          continue;
        }

        opportunities++;
        console.log(`   💰 OPPORTUNITY: gap=${(gap/100).toFixed(3)}% | net=$${netUSD.toFixed(4)} | keeper=$${keeperUSD.toFixed(4)} | maxSafe=$${maxSafeUSD.toFixed(0)}`);

        if (!DRY_RUN) {
          await executeArb(ARB_VAMM_VS_ORACLE, mkt.id, mkt.poolId, arbSize, estNet);
        } else {
          console.log(`   [DRY RUN] Would execute: executeArb(${ARB_VAMM_VS_ORACLE}, ${mkt.id.slice(0,10)}..., ${mkt.poolId}, ${arbSize}, ${estNet})`);
        }

      } catch (err) {
        // Individual market errors shouldn't crash the whole loop
        if (!err.message?.includes('stale oracle') && !err.message?.includes('gap below')) {
          console.error(`   Error scanning ${mkt.symbol}: ${err.message?.slice(0, 80)}`);
        }
      }
    }

    // ── Scan Spot vs Spot gaps ────────────────────────────────────────────
    if (spotContract) {
      for (const pair of SPOT_PAIRS) {
        try {
          const testAmt = BigInt(1000 * 1e6); // $1000 test quote
          const USDC_ADDR = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

          const [outA] = await spotContract.getAmountOut(pair.poolA, USDC_ADDR, testAmt);
          const [outB] = await spotContract.getAmountOut(pair.poolB, USDC_ADDR, testAmt);

          if (outA === 0n || outB === 0n) continue;

          const hi = outA > outB ? outA : outB;
          const lo = outA > outB ? outB : outA;
          const gapBps = Number((hi - lo) * 10000n / lo);

          if (gapBps < 15) continue;

          const netEst = BigInt(Math.floor(Number(MAX_SIZE) * gapBps / 10000))
            - BigInt(Math.floor(Number(MAX_SIZE) * 19 / 10000)); // minus fees
          const keeperShare = Number(netEst) / 1e6 * 0.10;

          console.log(`[Spot] ${pair.symbol} — Gap: ${(gapBps/100).toFixed(3)}% | est keeper: $${keeperShare.toFixed(4)}`);

          if (Number(netEst) > 0 && keeperShare >= MIN_KEEPER_P && !DRY_RUN) {
            // poolId convention: use poolA as the "cheap" pool
            await executeArb(ARB_SPOT_VS_VAMM, ethers.id('SPOTARB'), pair.poolA, MAX_SIZE, netEst);
          }
        } catch { /* quiet */ }
      }
    }

    if (opportunities === 0) {
      process.stdout.write(`\r[${new Date().toISOString()}] Scanning ${MARKETS.length} markets... no gaps found  `);
    }

  } catch (err) {
    console.error(`[InternalArbBot] Scan error: ${err.message?.slice(0, 120)}`);
  }
}

// ─── Execute ──────────────────────────────────────────────────────────────────
async function executeArb(arbType, marketId, poolId, arbSize, minProfit) {
  try {
    console.log(`\n   → Executing arb: type=${arbType} size=$${Number(arbSize)/1e6} minProfit=$${Number(minProfit)/1e6}`);

    // Gas estimate first
    const gasEst = await arbContract.executeArb.estimateGas(
      arbType, marketId, poolId, arbSize, minProfit
    );
    const gasWithBuffer = gasEst * 130n / 100n;

    const tx = await arbContract.executeArb(
      arbType, marketId, poolId, arbSize, minProfit,
      { gasLimit: gasWithBuffer }
    );

    console.log(`   → Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed block ${receipt.blockNumber}  gas: ${receipt.gasUsed}`);

    sessionArbs++;

  } catch (err) {
    if (err.message?.includes('below min profit') || err.message?.includes('gap below')) {
      console.log(`   → Arb closed before execution (gap closed by another tx)`);
    } else {
      console.error(`   ❌ Arb failed: ${err.message?.slice(0, 120)}`);
    }
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
async function printStats() {
  try {
    const s = await arbContract.stats();
    const uptime = Math.floor((Date.now() - startTime) / 60000);
    const totalNet = Number(s.totalProfit) / 1e6;
    const keeperTotal = Number(s.toKeepers) / 1e6;
    const arbCt = Number(s.arbCount);

    console.log('\n────────────────────────────────────────────────');
    console.log(`📊 INTERNAL ARB STATS  (uptime: ${uptime}m)`);
    console.log(`   Total arbs:      ${arbCt}`);
    console.log(`   Total net profit: $${totalNet.toFixed(4)}`);
    console.log(`   Keeper earnings:  $${keeperTotal.toFixed(4)}`);
    console.log(`   → Stakers:        $${(Number(s.toStakers) / 1e6).toFixed(4)}`);
    console.log(`   → Insurance:      $${(Number(s.toInsurance) / 1e6).toFixed(4)}`);
    console.log(`   Session arbs:     ${sessionArbs}`);
    console.log('────────────────────────────────────────────────\n');
  } catch {}
}

main().catch(err => { console.error(err); process.exit(1); });
