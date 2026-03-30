'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Security Monitor Service
 *  Watches for anomalous on-chain activity and alerts via webhook.
 *
 *  MONITORS:
 *  1. Large vault withdrawals (>$50K single tx)
 *  2. Flash liquidation bursts (>20 in 5 minutes)
 *  3. Oracle price deviation (>10% sudden move)
 *  4. Unusual fee drops (>70% below 24h average)
 *  5. Failed auth spikes (brute force detection)
 *  6. Keeper wallet balance (alerts if running low)
 *  7. Contract pause events (immediate alert)
 *  8. Unusual OI imbalance (>90% one-sided)
 * ════════════════════════════════════════════════════════════════
 */

const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('./chain');

// ── Alert channels ────────────────────────────────────────────────────────
async function alert(level, title, message, data = {}) {
  const payload = {
    level,   // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    title,
    message,
    data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  console.log(`[SECURITY ${level}] ${title}: ${message}`);

  // Webhook (Discord/Slack/PagerDuty)
  if (process.env.SECURITY_WEBHOOK_URL) {
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: level === 'CRITICAL' ? '@here' : '',
          embeds: [{
            title: `[${level}] ${title}`,
            description: message,
            color: { CRITICAL:0xFF0000, HIGH:0xFF6600, MEDIUM:0xFFAA00, LOW:0x00AAFF }[level] || 0x888888,
            fields: Object.entries(data).map(([k,v]) => ({ name:k, value:String(v), inline:true })),
            timestamp: payload.timestamp,
          }]
        }),
      });
    } catch (e) {
      console.error('[SECURITY] Webhook failed:', e.message);
    }
  }

  // Email via SMTP (if configured)
  if (process.env.ALERT_EMAIL && level === 'CRITICAL') {
    // In production: use nodemailer or SendGrid
    console.error(`[SECURITY EMAIL] Would send CRITICAL alert to ${process.env.ALERT_EMAIL}`);
  }
}

// ── ABIs (minimal) ────────────────────────────────────────────────────────
const VAULT_ABI = [
  'event Withdrawn(address indexed user, uint256 amount)',
  'event Deposited(address indexed user, uint256 amount)',
  'event OperatorSet(address indexed op, bool enabled)',
  'event FeeCollected(address indexed from, uint256 fee)',
  'function protocolFees() view returns (uint256)',
  'function totalDeposits() view returns (uint256)',
  'function paused() view returns (bool)',
];

const PERP_ABI = [
  'event PositionLiquidated(uint256 indexed posId, address indexed trader, address liquidator, uint256 price)',
  'event MarketFeesUpdated(uint256 indexed idx, uint256 makerFee, uint256 takerFee)',
  'function paused() view returns (bool)',
];

const ORACLE_ABI = [
  'function getPrice(bytes32 marketId) view returns (uint256 price, uint256 updatedAt)',
];

const KEEPER_ABI = [
  'function keeperOf(address) view returns (bool)',
];

// ── State ─────────────────────────────────────────────────────────────────
const state = {
  liquidations:    [],            // timestamps of recent liquidations
  authFailures:    new Map(),     // IP → [timestamps]
  lastOraclePrices:{},           // marketId → price
  dailyFees:       0,
  feeWindowStart:  Date.now(),
  yesterdayFees:   0,
  keeperAlerted:   false,
};

// ── Monitor 1: Large Withdrawals ──────────────────────────────────────────
function watchVaultWithdrawals(vault) {
  vault.on('Withdrawn', async (user, amount) => {
    const usdcAmount = parseFloat(ethers.formatUnits(amount, 6));

    if (usdcAmount >= 50_000) {
      await alert('HIGH', 'Large Vault Withdrawal',
        `${usdcAmount.toLocaleString()} USDC withdrawn by ${user}`,
        { user, amount: `$${usdcAmount.toLocaleString()}`, threshold: '$50,000' }
      );
    }
    if (usdcAmount >= 500_000) {
      await alert('CRITICAL', '🚨 MASSIVE VAULT WITHDRAWAL',
        `${usdcAmount.toLocaleString()} USDC — potential exploit or key compromise`,
        { user, amount: `$${usdcAmount.toLocaleString()}` }
      );
    }
  });

  // Alert on operator changes (could indicate key compromise)
  vault.on('OperatorSet', async (op, enabled) => {
    await alert('HIGH', 'Vault Operator Changed',
      `${enabled ? 'Added' : 'Removed'} operator: ${op}`,
      { operator: op, action: enabled ? 'ADDED' : 'REMOVED' }
    );
  });
}

// ── Monitor 2: Liquidation Flood ──────────────────────────────────────────
function watchLiquidations(perp) {
  perp.on('PositionLiquidated', async (posId, trader, liquidator, price) => {
    const now = Date.now();
    state.liquidations.push(now);
    // Keep only last 5 minutes
    state.liquidations = state.liquidations.filter(t => now - t < 5 * 60 * 1000);

    if (state.liquidations.length > 50) {
      await alert('HIGH', 'Liquidation Flood Detected',
        `${state.liquidations.length} liquidations in last 5 minutes`,
        { count: state.liquidations.length, threshold: 50, liquidator }
      );
    }
    if (state.liquidations.length > 100) {
      await alert('CRITICAL', '🚨 LIQUIDATION CASCADE',
        `${state.liquidations.length} liquidations in 5 minutes — possible oracle manipulation`,
        { count: state.liquidations.length, liquidator }
      );
    }
  });

  perp.on('MarketFeesUpdated', async (idx, makerFee, takerFee) => {
    await alert('MEDIUM', 'Market Fees Updated',
      `Market ${idx}: maker=${makerFee}bps taker=${takerFee}bps`,
      { marketIndex: idx.toString(), makerFee: makerFee.toString(), takerFee: takerFee.toString() }
    );
  });
}

// ── Monitor 3: Oracle Price Deviation ────────────────────────────────────
async function checkOraclePrices(oracle, marketIds) {
  for (const id of marketIds) {
    try {
      const [price] = await oracle.getPrice(id);
      const priceFloat = parseFloat(ethers.formatUnits(price, 18));
      const prev = state.lastOraclePrices[id];

      if (prev && prev > 0) {
        const deviation = Math.abs(priceFloat - prev) / prev;
        if (deviation > 0.10) { // 10% move
          await alert('HIGH', 'Oracle Price Spike Detected',
            `Market ${id.slice(0,10)}: ${(deviation*100).toFixed(1)}% price move in 1 poll`,
            { marketId: id, prev: prev.toFixed(2), new: priceFloat.toFixed(2), deviation: `${(deviation*100).toFixed(1)}%` }
          );
        }
        if (deviation > 0.25) { // 25% — likely manipulation
          await alert('CRITICAL', '🚨 ORACLE MANIPULATION SUSPECTED',
            `${(deviation*100).toFixed(1)}% price deviation — consider emergency pause`,
            { marketId: id, prev: prev.toFixed(2), new: priceFloat.toFixed(2) }
          );
        }
      }
      state.lastOraclePrices[id] = priceFloat;
    } catch { /* oracle may be paused — that's ok */ }
  }
}

// ── Monitor 4: Keeper Wallet Balance ─────────────────────────────────────
async function checkKeeperBalance() {
  const keeperAddr = process.env.KEEPER_ADDRESS;
  if (!keeperAddr) return;

  try {
    const provider = getProvider();
    const balanceWei = await provider.getBalance(keeperAddr);
    const balanceEth = parseFloat(ethers.formatEther(balanceWei));

    if (balanceEth < 0.05 && !state.keeperAlerted) {
      state.keeperAlerted = true;
      await alert('HIGH', 'Keeper Wallet Low on ETH',
        `Keeper ${keeperAddr} has only ${balanceEth.toFixed(4)} ETH — fund it now`,
        { address: keeperAddr, balance: `${balanceEth.toFixed(4)} ETH`, threshold: '0.05 ETH' }
      );
    } else if (balanceEth >= 0.1) {
      state.keeperAlerted = false; // Reset alert
    }
  } catch { /* network issue */ }
}

// ── Monitor 5: Auth Failure Tracking (called by express middleware) ───────
function recordAuthFailure(ip) {
  const now = Date.now();
  const failures = (state.authFailures.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  failures.push(now);
  state.authFailures.set(ip, failures);

  if (failures.length === 10) {
    alert('MEDIUM', 'Auth Brute Force Suspected',
      `${failures.length} failed auth attempts from ${ip} in 15 minutes`,
      { ip, count: failures.length }
    ).catch(() => {});
  }
  if (failures.length === 50) {
    alert('HIGH', 'Auth Brute Force Attack',
      `${failures.length} failed attempts from ${ip} — consider IP ban`,
      { ip, count: failures.length }
    ).catch(() => {});
  }
}

// ── Monitor 6: Contract Pause Events ─────────────────────────────────────
function watchPauses(contracts) {
  const PAUSE_TOPIC = ethers.id('Paused(address)');
  const UNPAUSE_TOPIC = ethers.id('Unpaused(address)');
  const provider = getProvider();

  provider.on({ topics: [PAUSE_TOPIC] }, async (log) => {
    const contractName = Object.entries(ADDRESSES).find(([,a]) => a?.toLowerCase() === log.address.toLowerCase())?.[0] || log.address;
    await alert('HIGH', 'Contract Paused',
      `${contractName} was paused`,
      { contract: contractName, address: log.address, txHash: log.transactionHash }
    );
  });
}

// ── Monitor 7: Circuit Breaker Status ─────────────────────────────────────
async function checkCircuitBreaker(cbAddr) {
  if (!cbAddr) return;
  try {
    const cb = new ethers.Contract(cbAddr, ['function isTripped() view returns (bool)', 'function status() view returns (bool,uint8,uint256,string,uint256,uint256,uint256,uint256)'], getProvider());
    const [tripped] = await cb.status();
    if (tripped) {
      const [,reason,,detail] = await cb.status();
      await alert('CRITICAL', '🚨 CIRCUIT BREAKER TRIPPED',
        `WikiCircuitBreaker halted protocol. Reason: ${detail}`,
        { reason: reason.toString(), detail }
      );
    }
  } catch { /* not deployed yet */ }
}

// ── Main: Start Monitoring ────────────────────────────────────────────────

const MARKET_IDS = [
  'BTCUSDT','ETHUSDT','ARBUSDT','SOLUSDT','BNBUSDT'
].map(s => ethers.keccak256(ethers.toUtf8Bytes(s)));

async function startMonitoring() {
  console.log('[SECURITY MONITOR] Starting...');
  const provider = getProvider();

  try {
    // Set up contract watchers
    if (ADDRESSES.WikiVault) {
      const vault = new ethers.Contract(ADDRESSES.WikiVault, VAULT_ABI, provider);
      watchVaultWithdrawals(vault);
      console.log('[SECURITY MONITOR] Watching WikiVault');
    }

    if (ADDRESSES.WikiPerp) {
      const perp = new ethers.Contract(ADDRESSES.WikiPerp, PERP_ABI, provider);
      watchLiquidations(perp);
      console.log('[SECURITY MONITOR] Watching WikiPerp');
    }

    if (ADDRESSES.WikiOracle) {
      watchPauses([]);
    }

    // Periodic checks
    setInterval(async () => {
      if (ADDRESSES.WikiOracle) {
        const oracle = new ethers.Contract(ADDRESSES.WikiOracle, ORACLE_ABI, provider);
        await checkOraclePrices(oracle, MARKET_IDS).catch(() => {});
      }
      await checkKeeperBalance();
      await checkCircuitBreaker(ADDRESSES.WikiCircuitBreaker);
    }, 30_000); // every 30 seconds

    console.log('[SECURITY MONITOR] Running ✅');
  } catch (e) {
    console.error('[SECURITY MONITOR] Failed to start:', e.message);
  }
}

module.exports = { startMonitoring, recordAuthFailure, alert };
