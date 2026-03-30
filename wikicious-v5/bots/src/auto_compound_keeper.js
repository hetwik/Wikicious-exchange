/**
 * WikiAutoCompounder Keeper Bot — Primary Trigger
 *
 * This bot is the PRIMARY trigger for compounding.
 * Chainlink Automation is the BACKUP (registered separately).
 *
 * Together they ensure compounding fires even if this server is down.
 *
 * Architecture:
 *   Your server (this script) → calls compound() hourly check, weekly execute
 *   Chainlink Automation       → calls performUpkeep() as backup if this misses
 *
 * Revenue: keeper earns 0.3% of all WIK compounded.
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

const COMPOUNDER_ABI = [
  'function compound(address user) external returns (uint256 wikStaked, uint256 newVeWIK)',
  'function batchCompound(address[] calldata users) external',
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function registeredUsers(uint256 index) external view returns (address)',
  'function growthDashboard(address user) external view returns (bool active, bool compoundFees, bool extendLock, uint256 currentVeWIK, uint256 nextCompoundAt, uint256 wikClaimableNow, uint256 usdcPendingNow, uint256 totalWIKCompounded, uint256 totalCompounds, uint256 daysActive, uint256 veWIKGrowthPct, string status)',
  'event Compounded(address indexed user, address indexed triggeredBy, uint256 wikFromVesting, uint256 usdcFeesClaimed, uint256 wikBoughtWithFees, uint256 wikStakedTotal, uint256 keeperFeeWIK, uint256 newLockExpiry, uint256 newVeWIK, uint256 veWIKGrowthPct)',
  'event AutoCompoundEnabled(address indexed user, bool compoundFees, bool extendLock, uint256 intervalDays)',
];

const RPC_URL         = process.env.ARBITRUM_RPC_URL;
const KEEPER_KEY      = process.env.KEEPER_PRIVATE_KEY;
const COMPOUNDER_ADDR = process.env.AUTO_COMPOUNDER_ADDRESS;
const POLL_MS         = parseInt(process.env.POLL_INTERVAL_MS || '3600000'); // 1 hour
const DRY_RUN         = process.env.DRY_RUN === 'true';
const MAX_GAS_GWEI    = 0.5;

let provider, signer, compounder;
let totalEarned = { wik: 0n, events: 0 };

async function init() {
  provider   = new ethers.JsonRpcProvider(RPC_URL);
  signer     = new ethers.Wallet(KEEPER_KEY, provider);
  compounder = new ethers.Contract(COMPOUNDER_ADDR, COMPOUNDER_ABI, signer);
  log('WikiAutoCompounder Keeper — Primary Trigger');
  log(`Keeper: ${signer.address}`);
  log(`Contract: ${COMPOUNDER_ADDR}`);
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log(`Backup: Chainlink Automation registered at automation.chain.link`);
}

async function runCycle() {
  log(`\n${'─'.repeat(55)}`);
  log(`Cycle: ${new Date().toISOString()}`);

  // Check gas
  const feeData = await provider.getFeeData();
  const gwei    = parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'));
  if (gwei > MAX_GAS_GWEI) { log(`Gas too high (${gwei} gwei). Skipping.`); return; }

  // Use Chainlink's own checkUpkeep to find who is ready
  // This avoids us needing to maintain our own user list
  const [needed, perfData] = await compounder.checkUpkeep('0x');

  if (!needed) { log('No compounds due this cycle.'); return; }

  const readyUser = ethers.AbiCoder.defaultAbiCoder().decode(['address'], perfData)[0];
  log(`Ready: ${readyUser.slice(0,8)}...`);

  // Get their dashboard
  const dash = await compounder.growthDashboard(readyUser);
  log(`  veWIK: ${fmt(dash.currentVeWIK)} | WIK claimable: ${fmt(dash.wikClaimableNow)} | USDC pending: $${fmtU(dash.usdcPendingNow)}`);

  if (DRY_RUN) { log('[DRY RUN] Would compound'); return; }

  try {
    const tx      = await compounder.compound(readyUser, { gasLimit: 600_000 });
    log(`Tx: ${tx.hash}`);
    const receipt = await tx.wait();

    for (const l of receipt.logs) {
      try {
        const parsed = compounder.interface.parseLog(l);
        if (parsed?.name === 'Compounded') {
          const { wikStakedTotal, keeperFeeWIK, newVeWIK, veWIKGrowthPct } = parsed.args;
          totalEarned.wik    += keeperFeeWIK;
          totalEarned.events++;
          log(`✅ Compounded: +${fmt(wikStakedTotal)} WIK staked`);
          log(`   New veWIK:  ${fmt(newVeWIK)} (+${(Number(veWIKGrowthPct)/100).toFixed(2)}%)`);
          log(`   Keeper fee: ${fmt(keeperFeeWIK)} WIK`);
          log(`   Total earned: ${fmt(totalEarned.wik)} WIK (${totalEarned.events} events)`);
        }
      } catch {}
    }
  } catch (e) {
    log(`Error: ${e.message?.slice(0,80)}`);
  }
}

const fmt  = v => (Number(v||0n)/1e18).toLocaleString('en',{maximumFractionDigits:2});
const fmtU = v => (Number(v||0n)/1e6).toFixed(2);
const log  = m => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

async function main() {
  await init();
  await runCycle();
  setInterval(runCycle, POLL_MS);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
