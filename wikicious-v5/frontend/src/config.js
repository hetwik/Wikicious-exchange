/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS FRONTEND — App Config
 * ════════════════════════════════════════════════════════════════
 */
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum }         from 'wagmi/chains';
import { http }             from 'wagmi';

export const API_URL = process.env.REACT_APP_API_URL || 'https://api.wikicious.io';
export const WS_URL  = process.env.REACT_APP_WS_URL  || 'wss://api.wikicious.io/ws';

export const CONTRACTS = {
  // Layer 1
  WIKToken:           process.env.REACT_APP_WIK_TOKEN          || '',
  WikiOracle:         process.env.REACT_APP_WIKI_ORACLE         || '',
  WikiVault:          process.env.REACT_APP_WIKI_VAULT          || '',
  MarketRegistry:     process.env.REACT_APP_MARKET_REGISTRY     || '',
  // Layer 2
  WikiUserBotFactory: process.env.REACT_APP_USER_BOT_FACTORY    || '',
  WikiPropPoolYield:  process.env.REACT_APP_PROP_POOL_YIELD     || '',
  WikiPerp:           process.env.REACT_APP_WIKI_PERP           || '',
  WikiGMXBackstop:    process.env.REACT_APP_GMX_BACKSTOP        || '',
  WikiSpotRouter:     process.env.REACT_APP_SPOT_ROUTER         || '',
  // Layer 3
  WikiKeeperRegistry: process.env.REACT_APP_KEEPER_REGISTRY     || '',
  WikiLiquidator:     process.env.REACT_APP_LIQUIDATOR          || '',
  // Layer 4
  WikiOrderBook:      process.env.REACT_APP_ORDERBOOK           || '',
  WikiStaking:        process.env.REACT_APP_STAKING             || '',
  WikiBonus:          process.env.REACT_APP_WIKI_BONUS          || '',
  // Layer 5
  WikiLending:        process.env.REACT_APP_LENDING             || '',
  // Layer 6
  WikiFlashLoan:      process.env.REACT_APP_FLASH_LOAN          || '',
  WikiMarginLoan:     process.env.REACT_APP_MARGIN_LOAN         || '',
  WikiLPCollateral:   process.env.REACT_APP_LP_COLLATERAL       || '',
  WikiCrossChainLending: process.env.REACT_APP_CROSSCHAIN_LENDING || '',
  // Layer 7
  WikiBridge:         process.env.REACT_APP_BRIDGE              || '',
  WikiCrossChainRouter: process.env.REACT_APP_CROSSCHAIN_ROUTER || '',
  // Layer 8
  WikiLaunchpad:      process.env.REACT_APP_LAUNCHPAD           || '',
  WikiLaunchPool:     process.env.REACT_APP_LAUNCHPOOL          || '',
  // Layer 9
  WikiLP:             process.env.REACT_APP_LP                  || '',
  WikiLiquidStaking:  process.env.REACT_APP_LIQUID_STAKING      || '',
  // Layer 10
  WikiFeeDistributor: process.env.REACT_APP_FEE_DISTRIBUTOR     || '',
  WikiMEVHook:        process.env.REACT_APP_MEV_HOOK            || '',
  WikiRebalancer:     process.env.REACT_APP_REBALANCER          || '',
  // Layer 11
  WikiSocial:         process.env.REACT_APP_WIKI_SOCIAL         || '',
  WikiSocialRewards:  process.env.REACT_APP_SOCIAL_REWARDS      || '',
  PropPool:           process.env.REACT_APP_PROP_POOL           || '',
  PropEval:           process.env.REACT_APP_PROP_EVAL           || '',
  PropFunded:         process.env.REACT_APP_PROP_FUNDED         || '',
  // Layer 12
  WikiYieldSlice:     process.env.REACT_APP_YIELD_SLICE         || '',

  // Fixed Arbitrum addresses
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  ARB:  '0x912CE59144191C1204E64559FE8253a0e49E6548',
};

export const wagmiConfig = getDefaultConfig({
  appName:    'Wikicious Exchange',
  projectId:  process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
  chains:     [arbitrum],
  transports: { [arbitrum.id]: http() },
});

export const MARKET_SYMBOLS = [
  'BTCUSDT','ETHUSDT','ARBUSDT','OPUSDT','BNBUSDT','SOLUSDT',
  'ADAUSDT','XRPUSDT','DOGEUSDT','DOTUSDT','AVAXUSDT','LINKUSDT',
  'UNIUSDT','MATICUSDT','GMXUSDT',
];
