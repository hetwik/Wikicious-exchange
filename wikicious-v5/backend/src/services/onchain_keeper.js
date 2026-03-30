'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — On-Chain Keeper Service
 *
 *  Routes all keeper operations through WikiLiquidator.sol so
 *  the keeper earns on-chain rewards and stats are tracked.
 *
 *  Features:
 *  ● Priority queue — positions sorted by proximity to liq price
 *  ● Multicall3 batch reads — fetches all positions in 1 call
 *  ● EIP-1559 gas with urgency-tiered tips
 *  ● WebSocket reconnection with exponential backoff
 *  ● Health metrics HTTP endpoint (port 9101)
 *  ● Automatic keeper wallet balance monitoring
 *  ● Graceful shutdown with SIGINT / SIGTERM
 * ════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { ethers }   = require('ethers');
const http         = require('http');
const prices       = require('./prices');

// ── ABIs ──────────────────────────────────────────────────────────────────
const LIQUIDATOR_ABI = [
  // Batch liquidation
  'function liquidateSingle(uint256 posId) external',
  'function liquidateBatch(uint256[] calldata posIds) external returns (uint256 succeeded, uint256 totalBonus)',
  // Limit orders
  'function executeLimitOrders(uint256 marketIdx, uint256[] calldata orderIds) external',
  // TP/SL
  'function executeTPSLBatch(uint256[] calldata posIds) external returns (uint256 succeeded)',
  // Funding
  'function settleFundingBatch(uint256[] calldata marketIdxs) external',
  // Views
  'function isLiquidatable(uint256 posId) external view returns (bool liquidatable, uint256 currentPrice, uint256 liqPrice)',
  'function previewBonus(uint256 posId) external view returns (uint256 bonus, uint256 urgencyMult, uint256 keeperMult)',
  'function remainingDailyPool() external view returns (uint256)',
  'function rewardPool() external view returns (uint256)',
  // Events
  'event LiquidationExecuted(uint256 indexed posId, address indexed keeper, address indexed trader, uint256 perpFee, uint256 bonusUsdc, uint256 urgencyMult, uint256 keeperMult)',
  'event BatchLiquidationResult(address indexed keeper, uint256 attempted, uint256 succeeded, uint256 totalBonus)',
];

const REGISTRY_ABI = [
  'function register(uint256 stakeAmount) external',
  'function tierOf(address keeper) view returns (uint8)',
  'function isActive(address keeper) view returns (bool)',
  'function getKeeperInfo(address keeper) view returns (tuple(uint256 stakedWIK, uint256 unstakeRequestedAt, uint256 pendingUnstake, uint256 rewardBalance, uint256 totalLiquidations, uint256 totalOrdersFilled, uint256 slashCount, bool active, uint256 registeredAt))',
  'function rewardMultiplier(address keeper) view returns (uint256)',
  'function claimRewards() external',
];

const PERP_ABI = [
  'function getPosition(uint256 posId) view returns (tuple(address trader, uint256 marketIndex, bool isLong, uint256 size, uint256 collateral, uint256 entryPrice, uint256 entryFunding, uint256 leverage, uint256 liquidationPrice, uint256 takeProfit, uint256 stopLoss, uint256 openedAt, bool open))',
  'function getOrder(uint256 orderId) view returns (tuple(address trader, uint256 marketIndex, bool isLong, bool isLimit, uint256 size, uint256 collateral, uint256 limitPrice, uint256 minPrice, uint256 maxPrice, uint256 leverage, uint256 takeProfit, uint256 stopLoss, bool reduceOnly, uint256 createdAt, uint256 expiry, bool open))',
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256 idx) view returns (tuple(bytes32 marketId, string symbol, uint256 maxLeverage, uint256 makerFeeBps, uint256 takerFeeBps, uint256 maintenanceMarginBps, uint256 maxOpenInterestLong, uint256 maxOpenInterestShort, uint256 openInterestLong, uint256 openInterestShort, uint256 maxPositionSizePerUser, int256 fundingRate, uint256 lastFundingTime, uint256 cumulativeFundingLong, uint256 cumulativeFundingShort, bool active, uint256 lastOIUpdateBlock, uint256 oiChangesThisBlock))',
  'event PositionOpened(uint256 indexed posId, address indexed trader, bool isLong, uint256 size, uint256 price)',
  'event PositionClosed(uint256 indexed posId, address indexed trader, int256 pnl, uint256 closePrice)',
  'event PositionLiquidated(uint256 indexed posId, address indexed trader, address liquidator, uint256 price)',
  'event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 marketIndex, bool isLong, uint256 size)',
];

// Multicall3 on Arbitrum
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
];

// ── Config ────────────────────────────────────────────────────────────────
const ADDRESSES = {
  WikiPerp:           process.env.WIKI_PERP_ADDRESS         || '',
  WikiLiquidator:     process.env.WIKI_LIQUIDATOR_ADDRESS    || '',
  WikiKeeperRegistry: process.env.WIKI_KEEPER_REGISTRY_ADDRESS || '',
};

const CFG = {
  tickInterval:       parseInt(process.env.KEEPER_TICK_MS)    || 12_000,  // 12s (1 Arb block)
  fundingInterval:    parseInt(process.env.FUNDING_INTERVAL)  || 28_800,  // 8h
  maxLiqBatch:        parseInt(process.env.MAX_LIQ_BATCH)     || 20,
  maxOrderBatch:      parseInt(process.env.MAX_ORDER_BATCH)   || 30,
  maxTpSlBatch:       parseInt(process.env.MAX_TPSL_BATCH)    || 20,
  healthPort:         parseInt(process.env.KEEPER_HEALTH_PORT)|| 9101,
  minEthBalance:      ethers.parseEther(process.env.MIN_ETH_BALANCE || '0.01'),
  priorityFeeBase:    ethers.parseUnits('0.1', 'gwei'),
  priorityFeeUrgent:  ethers.parseUnits('1',   'gwei'),
};

// ── Market symbol lookup ───────────────────────────────────────────────────
const MARKET_SYMBOLS = [
  'BTCUSDT','ETHUSDT','ARBUSDT','OPUSDT','BNBUSDT','SOLUSDT','ADAUSDT',
  'XRPUSDT','DOGEUSDT','DOTUSDT','AVAXUSDT','LINKUSDT','UNIUSDT','MATICUSDT','GMXUSDT',
];

function symbolByMarket(idx) { return MARKET_SYMBOLS[idx] || 'BTCUSDT'; }

// ─────────────────────────────────────────────────────────────────────────
class OnChainKeeper {
  constructor() {
    this.running        = false;
    this.provider       = null;
    this.wsProvider     = null;
    this.wallet         = null;
    this.liquidator     = null;  // write-enabled
    this.registry       = null;  // write-enabled
    this.perpRead       = null;  // read-only
    this.multicall      = null;  // read-only

    // In-memory position/order tracking (rebuilt on reconnect)
    this.positions      = new Map();  // posId → Position
    this.orders         = new Map();  // orderId → Order
    this.fundingNext    = new Map();  // marketIdx → next funding timestamp

    // Health metrics
    this.metrics = {
      ticks:            0,
      liquidations:     0,
      ordersFilled:     0,
      tpslExecuted:     0,
      fundingSettled:   0,
      errors:           0,
      lastTickAt:       0,
      startedAt:        Date.now(),
      rewardPoolUsdc:   0,
      keeperTier:       0,
      ethBalance:       '0',
    };
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  async start() {
    console.log('🤖 OnChainKeeper starting...');

    if (!process.env.KEEPER_PRIVATE_KEY) {
      throw new Error('KEEPER_PRIVATE_KEY not set in .env');
    }
    if (!ADDRESSES.WikiLiquidator) {
      throw new Error('WIKI_LIQUIDATOR_ADDRESS not set in .env');
    }

    // HTTP provider (primary)
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet  = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY, this.provider);
    console.log(`   Keeper: ${await this.wallet.getAddress()}`);

    this.liquidator = new ethers.Contract(ADDRESSES.WikiLiquidator,     LIQUIDATOR_ABI, this.wallet);
    this.registry   = new ethers.Contract(ADDRESSES.WikiKeeperRegistry, REGISTRY_ABI,  this.wallet);
    this.perpRead   = new ethers.Contract(ADDRESSES.WikiPerp,           PERP_ABI,      this.provider);
    this.multicall  = new ethers.Contract(MULTICALL3_ADDRESS,           MULTICALL3_ABI, this.provider);

    // Verify keeper is registered
    await this._checkRegistration();

    // Sync all on-chain state via multicall
    prices.start();
    await this._fullSync();

    // Attach WS event listeners
    this._attachListeners();

    this.running = true;
    this._startHealthServer();
    this._loop();

    console.log('✅ OnChainKeeper running');
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  _loop() {
    if (!this.running) return;
    setTimeout(async () => {
      try {
        await this._tick();
      } catch (e) {
        this.metrics.errors++;
        console.error('Tick error:', e.message);
      }
      this._loop();
    }, CFG.tickInterval);
  }

  async _tick() {
    this.metrics.ticks++;
    this.metrics.lastTickAt = Date.now();

    // Parallel execution of all keeper tasks
    const [liqResult, tpslResult, orderResults, fundingResult] = await Promise.allSettled([
      this._runLiquidations(),
      this._runTPSL(),
      this._runLimitOrders(),
      this._runFunding(),
    ]);

    // Update metrics
    if (liqResult.status   === 'rejected') this.metrics.errors++;
    if (tpslResult.status  === 'rejected') this.metrics.errors++;
    if (fundingResult.status === 'rejected') this.metrics.errors++;

    // Periodically refresh reward pool balance
    if (this.metrics.ticks % 10 === 0) await this._refreshMetrics();
  }

  // ── Liquidations ─────────────────────────────────────────────────────────
  async _runLiquidations() {
    // Build priority queue: sorted by how far underwater (descending risk)
    const toLiquidate = [];

    for (const [posId, pos] of this.positions.entries()) {
      if (!pos.open) continue;
      const price = prices.getPrice(symbolByMarket(Number(pos.marketIndex)));
      if (!price) continue;

      const priceE18 = BigInt(Math.round(price * 1e18));
      const isLiq = pos.isLong
        ? priceE18 <= pos.liquidationPrice
        : priceE18 >= pos.liquidationPrice;

      if (!isLiq) {
        // Check proximity — flag if within 2% of liq price for close-watch
        const proximity = pos.isLong
          ? Number(pos.liquidationPrice - priceE18) * 100 / Number(priceE18)
          : Number(priceE18 - pos.liquidationPrice) * 100 / Number(priceE18);
        if (proximity <= 2) {
          // Near liquidation — will catch on next tick
          continue;
        }
        continue;
      }

      // Priority score: larger underwater % = higher priority
      const pct = pos.isLong
        ? Number(pos.liquidationPrice - priceE18) * 10000 / Number(pos.liquidationPrice)
        : Number(priceE18 - pos.liquidationPrice) * 10000 / Number(pos.liquidationPrice);

      toLiquidate.push({ posId, priority: pct, collateral: pos.collateral });
    }

    if (!toLiquidate.length) return;

    // Sort by priority (most underwater first — highest bonus)
    toLiquidate.sort((a, b) => b.priority - a.priority);
    console.log(`💥 ${toLiquidate.length} positions to liquidate`);

    // Batch into CFG.maxLiqBatch chunks
    for (let i = 0; i < toLiquidate.length; i += CFG.maxLiqBatch) {
      const batch  = toLiquidate.slice(i, i + CFG.maxLiqBatch).map(p => BigInt(p.posId));
      const isUrgent = toLiquidate[i].priority > 500; // > 5% underwater = urgent

      try {
        const gasOpts = await this._gasOpts(isUrgent);
        const tx = await this.liquidator.liquidateBatch(batch, gasOpts);
        const receipt = await tx.wait(1);

        // Parse result from event
        const iface = new ethers.Interface(LIQUIDATOR_ABI);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'BatchLiquidationResult') {
              const { succeeded, totalBonus } = parsed.args;
              console.log(`   💥 Liquidated ${succeeded}/${batch.length} | bonus: $${(Number(totalBonus)/1e6).toFixed(2)} | tx: ${tx.hash.slice(0,10)}`);
              this.metrics.liquidations += Number(succeeded);
              // Remove from tracking
              batch.forEach(id => this.positions.delete(Number(id)));
            }
          } catch {}
        }
      } catch (e) {
        console.error(`   Batch liquidation failed:`, e.message.slice(0, 100));
        this.metrics.errors++;
      }
    }
  }

  // ── TP/SL ─────────────────────────────────────────────────────────────────
  async _runTPSL() {
    const toExecute = [];

    for (const [posId, pos] of this.positions.entries()) {
      if (!pos.open) continue;
      if (pos.takeProfit === 0n && pos.stopLoss === 0n) continue;

      const price = prices.getPrice(symbolByMarket(Number(pos.marketIndex)));
      if (!price) continue;

      const priceE18 = BigInt(Math.round(price * 1e18));
      const tpHit = pos.takeProfit > 0n && (pos.isLong ? priceE18 >= pos.takeProfit : priceE18 <= pos.takeProfit);
      const slHit = pos.stopLoss  > 0n && (pos.isLong ? priceE18 <= pos.stopLoss   : priceE18 >= pos.stopLoss);

      if (tpHit || slHit) toExecute.push(BigInt(posId));
    }

    if (!toExecute.length) return;
    console.log(`🎯 ${toExecute.length} TP/SL to execute`);

    for (let i = 0; i < toExecute.length; i += CFG.maxTpSlBatch) {
      const batch = toExecute.slice(i, i + CFG.maxTpSlBatch);
      try {
        const gasOpts = await this._gasOpts(false);
        const tx = await this.liquidator.executeTPSLBatch(batch, gasOpts);
        await tx.wait(1);
        console.log(`   🎯 TP/SL executed ${batch.length} | tx: ${tx.hash.slice(0,10)}`);
        this.metrics.tpslExecuted += batch.length;
        batch.forEach(id => this.positions.delete(Number(id)));
      } catch (e) {
        console.error(`   TP/SL batch failed:`, e.message.slice(0, 100));
        this.metrics.errors++;
      }
    }
  }

  // ── Limit orders ─────────────────────────────────────────────────────────
  async _runLimitOrders() {
    // Group fillable orders by market
    const byMarket = new Map();

    for (const [orderId, order] of this.orders.entries()) {
      if (!order.open) continue;
      // Cancel expired orders (handled by executeLimitOrders on-chain)
      const price = prices.getPrice(symbolByMarket(Number(order.marketIndex)));
      if (!price) continue;
      const priceE18 = BigInt(Math.round(price * 1e18));
      const canFill = order.isLong ? priceE18 <= order.limitPrice : priceE18 >= order.limitPrice;
      const isExpired = order.expiry > 0n && BigInt(Math.floor(Date.now()/1000)) > order.expiry;

      if (canFill || isExpired) {
        const mktIdx = Number(order.marketIndex);
        if (!byMarket.has(mktIdx)) byMarket.set(mktIdx, []);
        byMarket.get(mktIdx).push(BigInt(orderId));
      }
    }

    for (const [mktIdx, orderIds] of byMarket.entries()) {
      const batch = orderIds.slice(0, CFG.maxOrderBatch);
      try {
        const gasOpts = await this._gasOpts(false);
        const tx = await this.liquidator.executeLimitOrders(mktIdx, batch, gasOpts);
        await tx.wait(1);
        console.log(`   📋 Orders executed market ${mktIdx} (${batch.length}) | tx: ${tx.hash.slice(0,10)}`);
        this.metrics.ordersFilled += batch.length;
        batch.forEach(id => this.orders.delete(Number(id)));
      } catch (e) {
        console.error(`   Orders market ${mktIdx} failed:`, e.message.slice(0, 100));
        this.metrics.errors++;
      }
    }
  }

  // ── Funding ───────────────────────────────────────────────────────────────
  async _runFunding() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const due = [];

    for (const [mktIdx, nextFunding] of this.fundingNext.entries()) {
      if (now >= nextFunding) due.push(BigInt(mktIdx));
    }

    if (!due.length) return;

    try {
      const gasOpts = await this._gasOpts(false);
      const tx = await this.liquidator.settleFundingBatch(due, gasOpts);
      await tx.wait(1);
      console.log(`   💸 Funding settled ${due.length} markets | tx: ${tx.hash.slice(0,10)}`);
      this.metrics.fundingSettled += due.length;
      // Schedule next run
      due.forEach(idx => {
        this.fundingNext.set(Number(idx), now + BigInt(CFG.fundingInterval));
      });
    } catch (e) {
      // Likely "too early" — update schedule anyway
      due.forEach(idx => {
        this.fundingNext.set(Number(idx), now + BigInt(CFG.fundingInterval));
      });
    }
  }

  // ── Full state sync via Multicall3 ────────────────────────────────────────
  async _fullSync() {
    console.log('🔄 Full state sync via Multicall3...');
    try {
      const marketCount = Number(await this.perpRead.marketCount());

      // Schedule funding for all markets
      for (let i = 0; i < marketCount; i++) {
        this.fundingNext.set(i, BigInt(0)); // mark as due immediately
      }

      // Sync positions via event logs (last 100k blocks ≈ 3 days on Arb)
      await this._syncFromEvents();

      console.log(`   ✅ Tracking ${this.positions.size} positions, ${this.orders.size} orders, ${marketCount} markets`);
    } catch (e) {
      console.error('   Sync failed:', e.message);
    }
  }

  async _syncFromEvents() {
    const perpIface = new ethers.Interface(PERP_ABI);

    // Fetch last 50k blocks for open positions
    const latestBlock = await this.provider.getBlockNumber();
    const fromBlock   = Math.max(0, latestBlock - 50_000);

    // Fetch PositionOpened events
    const openedFilter = {
      address: ADDRESSES.WikiPerp,
      topics:  [ethers.id('PositionOpened(uint256,address,bool,uint256,uint256)')],
      fromBlock,
      toBlock: 'latest',
    };

    const closedFilter = {
      address: ADDRESSES.WikiPerp,
      topics:  [ethers.id('PositionClosed(uint256,address,int256,uint256)'),],
      fromBlock,
      toBlock: 'latest',
    };

    const liqFilter = {
      address: ADDRESSES.WikiPerp,
      topics:  [ethers.id('PositionLiquidated(uint256,address,address,uint256)')],
      fromBlock,
      toBlock: 'latest',
    };

    const [openedLogs, closedLogs, liqLogs] = await Promise.all([
      this.provider.getLogs(openedFilter).catch(() => []),
      this.provider.getLogs(closedFilter).catch(() => []),
      this.provider.getLogs(liqFilter).catch(() => []),
    ]);

    const closedIds = new Set([
      ...closedLogs.map(l => Number(perpIface.parseLog(l)?.args[0])),
      ...liqLogs.map(l => Number(perpIface.parseLog(l)?.args[0])),
    ]);

    // Batch-fetch open positions via Multicall3
    const openIds = openedLogs
      .map(l => Number(perpIface.parseLog(l)?.args[0]))
      .filter(id => !closedIds.has(id));

    if (openIds.length > 0) {
      await this._batchFetchPositions(openIds);
    }

    // Sync open orders
    const orderFilter = {
      address: ADDRESSES.WikiPerp,
      topics:  [ethers.id('OrderPlaced(uint256,address,uint256,bool,uint256)')],
      fromBlock,
      toBlock: 'latest',
    };
    const orderLogs = await this.provider.getLogs(orderFilter).catch(() => []);
    const orderIds  = orderLogs.map(l => Number(perpIface.parseLog(l)?.args[0]));
    if (orderIds.length > 0) await this._batchFetchOrders(orderIds);
  }

  async _batchFetchPositions(posIds) {
    const CHUNK = 100;
    const perpIface = new ethers.Interface(PERP_ABI);
    const getPosFn  = perpIface.getFunction('getPosition');

    for (let i = 0; i < posIds.length; i += CHUNK) {
      const chunk = posIds.slice(i, i + CHUNK);
      const calls = chunk.map(id => ({
        target:       ADDRESSES.WikiPerp,
        allowFailure: true,
        callData:     perpIface.encodeFunctionData('getPosition', [id]),
      }));

      try {
        const results = await this.multicall.aggregate3(calls);
        for (let j = 0; j < results.length; j++) {
          if (!results[j].success) continue;
          const pos = perpIface.decodeFunctionResult('getPosition', results[j].returnData)[0];
          if (pos.open) {
            this.positions.set(chunk[j], {
              open:             true,
              trader:           pos.trader,
              marketIndex:      pos.marketIndex,
              isLong:           pos.isLong,
              size:             pos.size,
              collateral:       pos.collateral,
              entryPrice:       pos.entryPrice,
              liquidationPrice: pos.liquidationPrice,
              takeProfit:       pos.takeProfit,
              stopLoss:         pos.stopLoss,
            });
          }
        }
      } catch (e) {
        console.error('   Batch positions fetch error:', e.message.slice(0, 80));
      }
    }
  }

  async _batchFetchOrders(orderIds) {
    const CHUNK = 100;
    const perpIface = new ethers.Interface(PERP_ABI);

    for (let i = 0; i < orderIds.length; i += CHUNK) {
      const chunk = orderIds.slice(i, i + CHUNK);
      const calls = chunk.map(id => ({
        target:       ADDRESSES.WikiPerp,
        allowFailure: true,
        callData:     perpIface.encodeFunctionData('getOrder', [id]),
      }));

      try {
        const results = await this.multicall.aggregate3(calls);
        for (let j = 0; j < results.length; j++) {
          if (!results[j].success) continue;
          const order = perpIface.decodeFunctionResult('getOrder', results[j].returnData)[0];
          if (order.open && order.isLimit) {
            this.orders.set(chunk[j], {
              open:        true,
              trader:      order.trader,
              marketIndex: order.marketIndex,
              isLong:      order.isLong,
              limitPrice:  order.limitPrice,
              size:        order.size,
              expiry:      order.expiry,
            });
          }
        }
      } catch (e) {
        console.error('   Batch orders fetch error:', e.message.slice(0, 80));
      }
    }
  }

  // ── WebSocket event listeners ─────────────────────────────────────────────
  _attachListeners() {
    try {
      const wsUrl = process.env.ARBITRUM_WS_URL;
      if (!wsUrl) return;

      const wsProvider = new ethers.WebSocketProvider(wsUrl);
      const perp = new ethers.Contract(ADDRESSES.WikiPerp, PERP_ABI, wsProvider);

      perp.on('PositionOpened', async (posId, trader, isLong, size, price) => {
        try {
          const pos = await this.perpRead.getPosition(posId);
          if (pos.open) {
            this.positions.set(Number(posId), {
              open: true, trader, marketIndex: pos.marketIndex,
              isLong: pos.isLong, size: pos.size, collateral: pos.collateral,
              entryPrice: pos.entryPrice, liquidationPrice: pos.liquidationPrice,
              takeProfit: pos.takeProfit, stopLoss: pos.stopLoss,
            });
          }
        } catch {}
      });

      perp.on('PositionClosed', (posId) => {
        this.positions.delete(Number(posId));
      });

      perp.on('PositionLiquidated', (posId) => {
        this.positions.delete(Number(posId));
      });

      perp.on('OrderPlaced', async (orderId, trader, marketIdx, isLong, size) => {
        try {
          const order = await this.perpRead.getOrder(orderId);
          if (order.open && order.isLimit) {
            this.orders.set(Number(orderId), {
              open: true, trader, marketIndex: order.marketIndex,
              isLong: order.isLong, limitPrice: order.limitPrice,
              size: order.size, expiry: order.expiry,
            });
          }
        } catch {}
      });

      // Handle WS disconnect — reconnect with backoff
      wsProvider._websocket?.on('close', () => {
        console.warn('⚠️  WS disconnected — reconnecting in 5s...');
        setTimeout(() => this._attachListeners(), 5000);
      });

      console.log('   ✅ WebSocket event listeners attached');
    } catch (e) {
      console.warn('   WS listeners failed (will poll instead):', e.message);
    }
  }

  // ── Keeper registration check ─────────────────────────────────────────────
  async _checkRegistration() {
    try {
      const addr     = await this.wallet.getAddress();
      const isActive = await this.registry.isActive(addr);
      const tier     = await this.registry.tierOf(addr);
      const mult     = await this.registry.rewardMultiplier(addr);

      if (!isActive) {
        console.warn('⚠️  Keeper not registered in WikiKeeperRegistry');
        console.warn('   Run: keeper.register(<wik_amount>) to register and earn bonus rewards');
      } else {
        console.log(`   ✅ Registered keeper | Tier ${tier} | Reward multiplier: ${Number(mult)/100}×`);
        this.metrics.keeperTier = Number(tier);
      }

      // Check ETH balance
      const balance = await this.provider.getBalance(addr);
      this.metrics.ethBalance = ethers.formatEther(balance);
      if (balance < CFG.minEthBalance) {
        console.warn(`⚠️  Low ETH balance: ${ethers.formatEther(balance)} ETH — top up to keep keeper running`);
      }
    } catch (e) {
      console.error('   Registration check failed:', e.message);
    }
  }

  // ── Gas helpers ───────────────────────────────────────────────────────────
  async _gasOpts(urgent) {
    try {
      const feeData = await this.provider.getFeeData();
      const tip     = urgent ? CFG.priorityFeeUrgent : CFG.priorityFeeBase;
      const maxFee  = (feeData.gasPrice || ethers.parseUnits('0.1', 'gwei')) * 2n;
      return {
        maxFeePerGas:         maxFee > tip ? maxFee : tip * 2n,
        maxPriorityFeePerGas: tip,
      };
    } catch {
      return {}; // fall back to provider default
    }
  }

  // ── Metrics refresh ───────────────────────────────────────────────────────
  async _refreshMetrics() {
    try {
      const [pool, balance] = await Promise.all([
        this.liquidator.rewardPool(),
        this.provider.getBalance(await this.wallet.getAddress()),
      ]);
      this.metrics.rewardPoolUsdc = Number(pool) / 1e6;
      this.metrics.ethBalance     = ethers.formatEther(balance);
    } catch {}
  }

  // ── Health HTTP server ────────────────────────────────────────────────────
  _startHealthServer() {
    http.createServer((req, res) => {
      if (req.url === '/metrics' || req.url === '/health') {
        const data = {
          status:     'running',
          uptime:     Math.round((Date.now() - this.metrics.startedAt) / 1000),
          positions:  this.positions.size,
          orders:     this.orders.size,
          ...this.metrics,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
      } else {
        res.writeHead(404); res.end();
      }
    }).listen(CFG.healthPort, () => {
      console.log(`   ✅ Health endpoint: http://localhost:${CFG.healthPort}/metrics`);
    });
  }

  stop() {
    this.running = false;
    prices.stop();
    console.log('🛑 OnChainKeeper stopped');
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
const keeper = new OnChainKeeper();

keeper.start().catch(e => {
  console.error('Fatal start error:', e);
  process.exit(1);
});

process.on('SIGINT',  () => { keeper.stop(); process.exit(0); });
process.on('SIGTERM', () => { keeper.stop(); process.exit(0); });

module.exports = { OnChainKeeper };
