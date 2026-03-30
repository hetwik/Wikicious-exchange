/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS BACKEND — Contract Config
 *
 *  Reads contract addresses from environment variables.
 *  Fill all addresses in backend/.env after deployment.
 *  ABIs are minimal — just the functions the backend actually calls.
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

// ── Contract Addresses ───────────────────────────────────────────
// All populated from .env after running: cd contracts && npm run deploy
const ADDRESSES = {
  WikiVault:             process.env.WIKI_VAULT_ADDRESS              || '',
  WikiPerp:              process.env.WIKI_PERP_ADDRESS               || '',
  WikiAMM:               process.env.WIKI_AMM_ADDRESS                || '',
  WikiSpot:              process.env.WIKI_SPOT_ADDRESS               || '',
  WikiOracle:            process.env.WIKI_ORACLE_ADDRESS             || '',
  WikiGMXBackstop:       process.env.GMX_BACKSTOP_ADDRESS            || '',
  WikiSpotRouter:        process.env.SPOT_ROUTER_ADDRESS             || '',
  WIKToken:              process.env.WIK_TOKEN_ADDRESS               || '',
  // ── On-chain keeper + liquidator (new) ──
  WikiLiquidator:        process.env.WIKI_LIQUIDATOR_ADDRESS         || '',
  WikiKeeperRegistry:    process.env.WIKI_KEEPER_REGISTRY_ADDRESS    || '',
  // ── DeFi Suite (new) ────────────────────────────────────────
  WikiOrderBook:         process.env.WIKI_ORDERBOOK_ADDRESS          || '',
  WikiStaking:           process.env.WIKI_STAKING_ADDRESS            || '',
  WikiLaunchpad:         process.env.WIKI_LAUNCHPAD_ADDRESS          || '',
  WikiBridge:            process.env.WIKI_BRIDGE_ADDRESS             || '',
  WikiLending:           process.env.WIKI_LENDING_ADDRESS            || '',
  WikiYieldSlice:        process.env.WIKI_YIELD_SLICE_ADDRESS        || '',
  WikiLaunchPool:        process.env.WIKI_LAUNCHPOOL_ADDRESS         || '',
  WikiLP:                process.env.WIKI_LP_ADDRESS                 || '',
  WikiLiquidStaking:     process.env.WIKI_LIQUID_STAKING_ADDRESS     || '',
  WikiRebalancer:        process.env.WIKI_REBALANCER_ADDRESS         || '',
  // ── Revenue Engine (new) ────────────────────────────────────
  WikiCrossChainRouter:      process.env.WIKI_CROSSCHAIN_ROUTER_ADDRESS      || '',
  // ── Advanced Lending Suite ──────────────────────────────────
  WikiFlashLoan:             process.env.WIKI_FLASH_LOAN_ADDRESS            || '',
  WikiMarginLoan:            process.env.WIKI_MARGIN_LOAN_ADDRESS           || '',
  WikiLPCollateral:          process.env.WIKI_LP_COLLATERAL_ADDRESS         || '',
  WikiCrossChainLending:     process.env.WIKI_CROSSCHAIN_LENDING_ADDRESS    || '',
  WikiMEVHook:           process.env.WIKI_MEV_HOOK_ADDRESS           || '',
  WikiFeeDistributor:    process.env.WIKI_FEE_DISTRIBUTOR_ADDRESS    || '',
  WikiOptionsVault:      process.env.WIKI_OPTIONS_VAULT_ADDRESS      || '',
  WikiStrategyVaultYield:process.env.WIKI_STRATEGY_VAULT_YIELD_ADDRESS || '',
  WikiStrategyVaultNeutral:process.env.WIKI_STRATEGY_VAULT_NEUTRAL_ADDRESS || '',
  WikiStrategyVaultMomentum:process.env.WIKI_STRATEGY_VAULT_MOMENTUM_ADDRESS || '',
  WikiStrategyVaultMM:   process.env.WIKI_STRATEGY_VAULT_MM_ADDRESS   || '',
  WikiKeeperService:     process.env.WIKI_KEEPER_SERVICE_ADDRESS      || '',
  WikiPredictionMarket:  process.env.WIKI_PREDICTION_MARKET_ADDRESS   || '',
  WikiSocialMonetization:process.env.WIKI_SOCIAL_MONETIZATION_ADDRESS || '',
  WikiIEOPlatform:             process.env.WIKI_IEO_ADDRESS                || '',
  WikiExternalInsurance:       process.env.WIKI_EXT_INSURANCE_ADDRESS       || '',
  WikiGasRebate:               process.env.WIKI_GAS_REBATE_ADDRESS          || '',
  WikiStructuredLending:       process.env.WIKI_STRUCT_LENDING_ADDRESS      || '',
  WikiMakerRewards:            process.env.WIKI_MAKER_REWARDS_ADDRESS       || '',
  WikiYieldAggregator:         process.env.WIKI_YIELD_AGG_ADDRESS           || '',
  WikiNFTPerps:                process.env.WIKI_NFT_PERPS_ADDRESS           || '',
  WikiTraderSubscription:      process.env.WIKI_TRADER_SUB_ADDRESS          || '',
  WikiComposableVault:         process.env.WIKI_COMPOSABLE_VAULT_ADDRESS    || '',
  WikiDAOTreasury:             process.env.WIKI_DAO_TREASURY_ADDRESS        || '',
  WikiFundingRateDerivative:   process.env.WIKI_FUNDING_DERIV_ADDRESS      || '',
  WikiPerpOptions:             process.env.WIKI_PERP_OPTIONS_ADDRESS        || '',
  WikiInsuranceFundYield:    process.env.WIKI_INSURANCE_YIELD_ADDRESS      || '',
  WikiVolumeTiers:           process.env.WIKI_VOLUME_TIERS_ADDRESS         || '',
  WikiFundingArbVault:       process.env.WIKI_FUNDING_ARB_ADDRESS          || '',
  WikiPOL:                   process.env.WIKI_POL_ADDRESS                  || '',
  WikiLeveragedTokenBTC2L:   process.env.WIKI_LT_BTC2L_ADDRESS             || '',
  WikiLeveragedTokenBTC3L:   process.env.WIKI_LT_BTC3L_ADDRESS             || '',
  WikiLeveragedTokenETH2L:   process.env.WIKI_LT_ETH2L_ADDRESS             || '',
  WikiLeveragedTokenBTC2S:   process.env.WIKI_LT_BTC2S_ADDRESS             || '',
  WikiLeveragedTokenETH2S:   process.env.WIKI_LT_ETH2S_ADDRESS             || '',
  WikiIndexPerp:             process.env.WIKI_INDEX_PERP_ADDRESS           || '',
  WikiPermissionlessMarkets: process.env.WIKI_PERM_MARKETS_ADDRESS         || '',
  WikiRWAMarket:             process.env.WIKI_RWA_MARKET_ADDRESS           || '',
  WikiBuybackBurn:       process.env.WIKI_BUYBACK_BURN_ADDRESS          || '',
  WikiPropChallenge:     process.env.WIKI_PROP_CHALLENGE_ADDRESS       || '',
  WikiLiquidationInsurance: process.env.WIKI_LIQ_INSURANCE_ADDRESS     || '',
  WikiTraderPass:        process.env.WIKI_TRADER_PASS_ADDRESS           || '',
  WikiOTCDesk:           process.env.WIKI_OTC_DESK_ADDRESS             || '',
  WikiPortfolioMargin:   process.env.WIKI_PORTFOLIO_MARGIN_ADDRESS     || '',

  // Arbitrum token addresses (fixed — do not change)
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  ARB:  '0x912CE59144191C1204E64559FE8253a0e49E6548',
  // Multicall3 — fixed on all EVM chains
  Multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
};


// ── Vault ABI ────────────────────────────────────────────────────
// WikiVault.sol — USDC collateral vault
const VAULT_ABI = [
  // User actions
  'function deposit(uint256 amount) external',
  'function withdraw(uint256 amount) external',

  // Read balances
  'function freeMargin(address user) view returns (uint256)',
  'function lockedMargin(address user) view returns (uint256)',
  'function accounts(address) view returns (uint256 balance, uint256 locked, uint256 totalDeposited, uint256 totalWithdrawn)',

  // Protocol stats
  'function protocolFees() view returns (uint256)',
  'function insuranceFund() view returns (uint256)',
  'function totalDeposits() view returns (uint256)',

  // Owner only
  'function withdrawProtocolFees(address token, uint256 amount, address to) external',
  'function setOperator(address op, bool enabled) external',
  'function pause() external',
  'function unpause() external',

  // Events
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)',
  'event FeeCollected(address indexed user, uint256 fee)',
];


// ── Perp ABI ─────────────────────────────────────────────────────
// WikiPerp.sol — perpetuals engine
const PERP_ABI = [
  // Trader actions
  'function placeMarketOrder(uint256 marketIndex, bool isLong, uint256 collateral, uint256 leverage, uint256 takeProfit, uint256 stopLoss) external returns (uint256 orderId)',
  'function placeLimitOrder(uint256 marketIndex, bool isLong, uint256 collateral, uint256 leverage, uint256 limitPrice, uint256 takeProfit, uint256 stopLoss) external returns (uint256 orderId)',
  'function cancelOrder(uint256 orderId) external',
  'function closePosition(uint256 posId) external',

  // Keeper actions (called by keeper bot)
  'function liquidate(uint256 posId) external',
  'function executeTPSL(uint256 posId) external',
  'function settleFunding(uint256 marketIndex) external',
  'function executeLimitOrders(uint256 marketIndex, uint256[] calldata orderIds) external',

  // Read positions & orders
  'function getPosition(uint256 posId) view returns (tuple(address trader, uint256 marketIndex, bool isLong, uint256 size, uint256 collateral, uint256 entryPrice, uint256 entryFunding, uint256 leverage, uint256 liquidationPrice, uint256 takeProfit, uint256 stopLoss, uint256 openedAt, bool open))',
  'function getOrder(uint256 orderId) view returns (tuple(address trader, uint256 marketIndex, bool isLong, bool isLimit, uint256 size, uint256 collateral, uint256 limitPrice, uint256 leverage, uint256 takeProfit, uint256 stopLoss, bool reduceOnly, uint256 createdAt, bool open))',
  'function getTraderPositions(address trader) view returns (uint256[])',
  'function getTraderOrders(address trader) view returns (uint256[])',
  'function getUnrealizedPnL(uint256 posId) view returns (int256)',

  // Read markets
  'function getMarket(uint256 idx) view returns (tuple(bytes32 marketId, string symbol, uint256 maxLeverage, uint256 makerFeeBps, uint256 takerFeeBps, uint256 maintenanceMarginBps, uint256 maxOpenInterestLong, uint256 maxOpenInterestShort, uint256 openInterestLong, uint256 openInterestShort, int256 fundingRate, uint256 lastFundingTime, uint256 cumulativeFundingLong, uint256 cumulativeFundingShort, bool active))',
  'function marketCount() view returns (uint256)',

  // Events
  'event PositionOpened(uint256 indexed positionId, address indexed trader, bool isLong, uint256 size, uint256 price)',
  'event PositionClosed(uint256 indexed positionId, address indexed trader, int256 pnl, uint256 closePrice)',
  'event PositionLiquidated(uint256 indexed positionId, address indexed trader, address liquidator, uint256 price)',
  'event FundingSettled(uint256 indexed marketIndex, int256 rate, uint256 timestamp)',
  'event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 marketIndex, bool isLong, uint256 size)',
  'event OrderFilled(uint256 indexed orderId, uint256 indexed positionId, uint256 fillPrice)',
];


// ── AMM ABI ──────────────────────────────────────────────────────
// WikiAMM.sol — internal liquidity pool (WLP token)
const AMM_ABI = [
  // LP actions
  'function addLiquidity(uint256 usdcAmount) external returns (uint256 wlpOut)',
  'function removeLiquidity(uint256 wlpAmount) external returns (uint256 usdcOut)',

  // Read pool state
  'function getAUM() view returns (uint256)',
  'function getWLPPrice() view returns (uint256)',
  'function getPoolStats() view returns (tuple(uint256 totalLiquidity, uint256 reservedForLongs, uint256 reservedForShorts, uint256 totalFeesEarned, uint256 totalPnlPaid, uint256 lastAUM))',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',

  // Events
  'event LiquidityAdded(address indexed lp, uint256 usdcAmount, uint256 wlpMinted)',
  'event LiquidityRemoved(address indexed lp, uint256 wlpBurned, uint256 usdcAmount)',
];


// ── Spot Router ABI ──────────────────────────────────────────────
// WikiSpotRouter.sol — routes spot trades through Uniswap V3
const SPOT_ABI = [
  // Trader actions
  'function swapExactIn(address tokenIn, address tokenOut, uint256 amtIn, uint256 minOut, address recipient) external returns (uint256 amtOut)',
  'function getQuote(address tokenIn, address tokenOut, uint256 amtIn) view returns (uint256 amtOut, uint256 priceImpactBps)',

  // Revenue stats (owner read)
  'function revenueStats() view returns (uint256 spreadEarned, uint256 volumeProcessed, uint256 currentSpreadBps, uint256 effectiveAPR)',

  // Events
  'event Swap(address indexed trader, address tokenIn, uint256 amtIn, address tokenOut, uint256 amtOut)',
];


// ── Oracle ABI ───────────────────────────────────────────────────
// WikiOracle.sol — Chainlink price feeds + guardian override
const ORACLE_ABI = [
  'function getPrice(bytes32 marketId) view returns (uint256 price, uint256 timestamp)',
  'function getPriceSafe(bytes32 marketId) view returns (uint256 price, bool valid)',
  'function submitGuardianPrice(bytes32 marketId, uint256 price) external',
  'function setGuardian(address guardian, bool enabled) external',
];


// ── ERC-20 ABI ───────────────────────────────────────────────────
// Standard ERC-20 — used for USDC approval and balance checks
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];


// ── KeeperRegistry ABI ───────────────────────────────────────────
// WikiKeeperRegistry.sol — keeper staking, tiers, reward accounting
const KEEPER_REGISTRY_ABI = [
  // Registration
  'function register(uint256 stakeAmount) external',
  'function increaseStake(uint256 amount) external',
  'function requestUnstake(uint256 amount) external',
  'function claimUnstake() external',
  'function claimRewards() external',

  // Views
  'function tierOf(address keeper) view returns (uint8)',
  'function isActive(address keeper) view returns (bool)',
  'function rewardMultiplier(address keeper) view returns (uint256)',
  'function getKeeperInfo(address keeper) view returns (tuple(uint256 stakedWIK, uint256 unstakeRequestedAt, uint256 pendingUnstake, uint256 rewardBalance, uint256 totalLiquidations, uint256 totalOrdersFilled, uint256 slashCount, bool active, uint256 registeredAt))',
  'function keeperCount() view returns (uint256)',
  'function getActiveKeepers(uint256 offset, uint256 limit) view returns (address[], uint256)',

  // Constants
  'function MIN_STAKE() view returns (uint256)',
  'function TIER2_STAKE() view returns (uint256)',
  'function TIER3_STAKE() view returns (uint256)',
  'function UNSTAKE_COOLDOWN() view returns (uint256)',

  // Events
  'event KeeperRegistered(address indexed keeper, uint256 stake, uint8 tier)',
  'event RewardClaimed(address indexed keeper, uint256 amount)',
  'event KeeperSlashed(address indexed keeper, address slasher, uint256 slashAmount, uint256 burned)',
];


// ── Liquidator ABI ───────────────────────────────────────────────
// WikiLiquidator.sol — on-chain batch liquidator with Dutch auction rewards
const LIQUIDATOR_ABI = [
  // Liquidation
  'function liquidateSingle(uint256 posId) external',
  'function liquidateBatch(uint256[] calldata posIds) external returns (uint256 succeeded, uint256 totalBonus)',

  // Order execution
  'function executeLimitOrders(uint256 marketIdx, uint256[] calldata orderIds) external',
  'function executeTPSL(uint256 posId) external',
  'function executeTPSLBatch(uint256[] calldata posIds) external returns (uint256 succeeded)',

  // Funding
  'function settleFunding(uint256 marketIdx) external',
  'function settleFundingBatch(uint256[] calldata marketIdxs) external',

  // Pool management (owner)
  'function fundRewardPool(uint256 amount) external',
  'function withdrawRewardPool(address to, uint256 amount) external',
  'function setPaused(bool paused) external',

  // Views
  'function isLiquidatable(uint256 posId) view returns (bool liquidatable, uint256 currentPrice, uint256 liqPrice)',
  'function previewBonus(uint256 posId) view returns (uint256 bonus, uint256 urgencyMult, uint256 keeperMult)',
  'function remainingDailyPool() view returns (uint256)',
  'function rewardPool() view returns (uint256)',
  'function totalLiquidations() view returns (uint256)',
  'function totalBonusPaid() view returns (uint256)',
  'function paused() view returns (bool)',

  // Events
  'event LiquidationExecuted(uint256 indexed posId, address indexed keeper, address indexed trader, uint256 perpFee, uint256 bonusUsdc, uint256 urgencyMult, uint256 keeperMult)',
  'event BatchLiquidationResult(address indexed keeper, uint256 attempted, uint256 succeeded, uint256 totalBonus)',
  'event RewardPoolFunded(address indexed from, uint256 amount)',
];


module.exports = {
  ADDRESSES,
  VAULT_ABI,
  PERP_ABI,
  AMM_ABI,
  SPOT_ABI,
  ORACLE_ABI,
  ERC20_ABI,
  KEEPER_REGISTRY_ABI,
  LIQUIDATOR_ABI,
};
// ── New Revenue Features (Layer 13) ────────────────────────────────────
// (appended to ADDRESSES object — add these to backend/.env after deploy)
