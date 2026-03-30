/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS BACKEND — Chain Service
 *
 *  Manages:
 *  - Ethers.js provider (HTTP + WebSocket)
 *  - Keeper & guardian wallets
 *  - Contract instances (lazy-loaded, cached)
 *
 *  All contracts are read-only by default.
 *  Use getKeeperContract() for write operations from the keeper bot.
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

const { ethers } = require('ethers');
const {
  ADDRESSES,
  VAULT_ABI, PERP_ABI, AMM_ABI,
  SPOT_ABI, ORACLE_ABI, ERC20_ABI,
  KEEPER_REGISTRY_ABI, LIQUIDATOR_ABI,
} = require('../config');

// ── RPC Config ───────────────────────────────────────────────────
// Falls back to public Arbitrum RPC if no Alchemy key is set.
// For production, always use Alchemy — the public RPC is rate-limited.
const RPC_URL    = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const WS_RPC_URL = process.env.ARBITRUM_WS_URL  || 'wss://arb1.arbitrum.io/ws';


// ── Internal singletons ──────────────────────────────────────────
// Cached once on first call — avoids creating new connections on every request.
let _provider;
let _wsProvider;
let _keeperWallet;
let _guardianWallet;

// Cached contract instances (read-only, connected to HTTP provider)
let _vault, _perp, _amm, _spot, _oracle, _usdc, _liquidator, _keeperRegistry;


// ── Provider ─────────────────────────────────────────────────────

/** HTTP provider — used for all read calls and most write calls */
function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return _provider;
}

/** WebSocket provider — used for live event listening */
function getWsProvider() {
  if (!_wsProvider) {
    try {
      _wsProvider = new ethers.WebSocketProvider(WS_RPC_URL);
      // If the WS connection drops, clear it so the next call reconnects
      _wsProvider.on('error', () => { _wsProvider = null; });
    } catch {
      // WS unavailable — fall back to HTTP polling
      _wsProvider = getProvider();
    }
  }
  return _wsProvider;
}


// ── Wallets ───────────────────────────────────────────────────────

/**
 * Keeper wallet — used by keeper.js to liquidate positions and
 * execute limit orders. Set KEEPER_PRIVATE_KEY in .env.
 */
function getKeeperWallet() {
  if (!process.env.KEEPER_PRIVATE_KEY) return null;
  if (!_keeperWallet) {
    _keeperWallet = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY, getProvider());
  }
  return _keeperWallet;
}

/**
 * Guardian wallet — used by guardian_keeper.js to push exotic
 * pair prices on-chain. Set GUARDIAN_PRIVATE_KEY in .env.
 */
function getGuardianWallet() {
  if (!process.env.GUARDIAN_PRIVATE_KEY) return null;
  if (!_guardianWallet) {
    _guardianWallet = new ethers.Wallet(process.env.GUARDIAN_PRIVATE_KEY, getProvider());
  }
  return _guardianWallet;
}

/**
 * Returns a contract instance connected to the keeper wallet
 * (allows the contract to send transactions).
 */
function getKeeperContract(abi, address) {
  const wallet = getKeeperWallet();
  if (!wallet) throw new Error('KEEPER_PRIVATE_KEY not set in .env');
  return new ethers.Contract(address, abi, wallet);
}


// ── Read-only Contract Instances ─────────────────────────────────
// These are connected to the HTTP provider — read-only.
// They are lazy-loaded and cached after the first call.

function getVault()  {
  if (!_vault)  _vault  = new ethers.Contract(ADDRESSES.WikiVault,  VAULT_ABI,  getProvider());
  return _vault;
}

function getPerp()   {
  if (!_perp)   _perp   = new ethers.Contract(ADDRESSES.WikiPerp,   PERP_ABI,   getProvider());
  return _perp;
}

function getAMM()    {
  if (!_amm)    _amm    = new ethers.Contract(ADDRESSES.WikiAMM,    AMM_ABI,    getProvider());
  return _amm;
}

function getSpot()   {
  if (!_spot)   _spot   = new ethers.Contract(ADDRESSES.WikiSpot,   SPOT_ABI,   getProvider());
  return _spot;
}

function getOracle() {
  if (!_oracle) _oracle = new ethers.Contract(ADDRESSES.WikiOracle, ORACLE_ABI, getProvider());
  return _oracle;
}

function getUSDC()   {
  if (!_usdc)   _usdc   = new ethers.Contract(ADDRESSES.USDC,       ERC20_ABI,  getProvider());
  return _usdc;
}

function getLiquidator() {
  if (!_liquidator) _liquidator = new ethers.Contract(ADDRESSES.WikiLiquidator, LIQUIDATOR_ABI, getProvider());
  return _liquidator;
}

function getKeeperRegistry() {
  if (!_keeperRegistry) _keeperRegistry = new ethers.Contract(ADDRESSES.WikiKeeperRegistry, KEEPER_REGISTRY_ABI, getProvider());
  return _keeperRegistry;
}


// ── Helpers ───────────────────────────────────────────────────────

async function getBlockNumber() {
  return getProvider().getBlockNumber();
}

async function getGasPrice() {
  const feeData = await getProvider().getFeeData();
  return feeData.gasPrice || ethers.parseUnits('0.1', 'gwei');
}


module.exports = {
  // Providers
  getProvider,
  getWsProvider,

  // Wallets
  getKeeperWallet,
  getGuardianWallet,
  getKeeperContract,

  // Contracts (read-only)
  getVault,
  getPerp,
  getAMM,
  getSpot,
  getOracle,
  getUSDC,
  getLiquidator,
  getKeeperRegistry,

  // Helpers
  getBlockNumber,
  getGasPrice,

  // Re-export config so importers only need one require()
  ADDRESSES,
  VAULT_ABI, PERP_ABI, AMM_ABI, SPOT_ABI, ORACLE_ABI, ERC20_ABI,
  KEEPER_REGISTRY_ABI, LIQUIDATOR_ABI,
};
