/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS CONTRACTS — Hardhat Config
 *
 *  Networks:
 *  - arbitrum          → Arbitrum One mainnet (Chain ID 42161)
 *  - arbitrum_sepolia  → Arbitrum Sepolia testnet (Chain ID 421614)
 *                        Free ETH faucet: https://faucet.quicknode.com/arbitrum/sepolia
 *
 *  Commands:
 *  - npm run compile        → compile all contracts
 *  - npm run deploy:testnet → deploy to Sepolia testnet
 *  - npm run deploy         → deploy to Arbitrum mainnet
 *  - npm run verify         → verify on Arbiscan
 * ════════════════════════════════════════════════════════════════
 */

require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,        // 200 = balanced size/speed for contracts called often
      },
      viaIR: true,        // enables Yul IR pipeline — required for complex contracts
    },
  },

  networks: {
    // ── Arbitrum One Mainnet ──────────────────────────────────
    arbitrum: {
      url:      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  42161,
      gasPrice: 'auto',
    },

    // ── Arbitrum Sepolia Testnet ──────────────────────────────
    // Free test ETH: https://faucet.quicknode.com/arbitrum/sepolia
    arbitrum_sepolia: {
      url:      'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  421614,
    },
  },

  // ── Arbiscan verification ─────────────────────────────────────
  // Get API key free at: https://arbiscan.io/register → My API Keys
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || '',
    },
  },

  gasReporter: {
    enabled:  true,
    currency: 'USD',
  },

    // ── Optimism Mainnet ──────────────────────────────────────────
    optimism: {
      url:      process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  10,
      gasPrice: 'auto',
    },
    // ── Base Mainnet ──────────────────────────────────────────────
    base: {
      url:      process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  8453,
      gasPrice: 'auto',
    },
    // ── Polygon Mainnet ───────────────────────────────────────────
    polygon: {
      url:      process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  137,
      gasPrice: 'auto',
    },
    // ── BNB Chain ─────────────────────────────────────────────────
    bnb: {
      url:      process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  56,
      gasPrice: 'auto',
    },
    // ── Ethereum Mainnet ──────────────────────────────────────────
    ethereum: {
      url:      process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  1,
      gasPrice: 'auto',
    },
    // ── Testnets ──────────────────────────────────────────────────
    optimism_sepolia: {
      url:      process.env.OP_SEPOLIA_RPC || 'https://sepolia.optimism.io',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  11155420,
    },
    base_sepolia: {
      url:      process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  84532,
    },
};
