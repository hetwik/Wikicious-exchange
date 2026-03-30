'use strict';
require('dotenv').config();
const { ethers } = require('ethers');
const { getPerp, getOracle, getKeeperContract, getGasPrice, ADDRESSES, PERP_ABI, ORACLE_ABI } = require('./chain');
const prices = require('./prices');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/wikicious.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Track open positions and orders
db.exec(`
  CREATE TABLE IF NOT EXISTS tracked_positions (
    pos_id INTEGER PRIMARY KEY, market_index INTEGER, trader TEXT,
    is_long INTEGER, entry_price REAL, liq_price REAL,
    take_profit REAL, stop_loss REAL, size REAL
  );
  CREATE TABLE IF NOT EXISTS tracked_orders (
    order_id INTEGER PRIMARY KEY, market_index INTEGER, is_long INTEGER,
    limit_price REAL, size REAL
  );
  CREATE TABLE IF NOT EXISTS funding_schedule (
    market_index INTEGER PRIMARY KEY, last_funding INTEGER
  );
`);

const KEEPER_INTERVAL   = 15000;  // 15s
const FUNDING_INTERVAL  = 28800;  // 8h
const MAX_BATCH_LIQ     = 10;
const MAX_BATCH_ORDERS  = 20;
const GAS_BUFFER        = 150n;   // 150% of estimate

class KeeperBot {
  constructor() {
    this.perp  = null;
    this.running = false;
  }

  async start() {
    console.log('🤖 Keeper bot starting...');
    try {
      this.perp = getKeeperContract(PERP_ABI, ADDRESSES.WikiPerp);
      console.log(`   Keeper address: ${await this.perp.runner.getAddress()}`);
    } catch (e) {
      console.error('❌ No keeper key configured. Set KEEPER_PRIVATE_KEY in .env');
      return;
    }
    prices.start();
    this.running = true;
    await this._syncState();
    this._loop();
    console.log('✅ Keeper bot running');
  }

  _loop() {
    if (!this.running) return;
    setTimeout(async () => {
      try { await this._tick(); } catch (e) { console.error('Keeper tick error:', e.message); }
      this._loop();
    }, KEEPER_INTERVAL);
  }

  async _tick() {
    await Promise.all([
      this._checkLiquidations(),
      this._executeTPSL(),
      this._executeLimitOrders(),
      this._settleFunding(),
    ]);
  }

  // ── Liquidations ──────────────────────────────────────────
  async _checkLiquidations() {
    const positions = db.prepare('SELECT * FROM tracked_positions').all();
    const toLiquidate = [];

    for (const pos of positions) {
      const markPrice = prices.getPrice(this._symbolByMarket(pos.market_index));
      if (!markPrice) continue;
      const isLiq = pos.is_long ? markPrice <= pos.liq_price : markPrice >= pos.liq_price;
      if (isLiq) toLiquidate.push(pos.pos_id);
    }

    if (!toLiquidate.length) return;
    console.log(`💥 Liquidating ${toLiquidate.length} positions...`);

    for (let i = 0; i < toLiquidate.length; i += MAX_BATCH_LIQ) {
      const batch = toLiquidate.slice(i, i + MAX_BATCH_LIQ);
      for (const posId of batch) {
        try {
          const gasEst = await this.perp.liquidate.estimateGas(posId);
          const tx = await this.perp.liquidate(posId, { gasLimit: gasEst * GAS_BUFFER / 100n });
          console.log(`   💥 Liquidated pos ${posId} | tx: ${tx.hash}`);
          db.prepare('DELETE FROM tracked_positions WHERE pos_id=?').run(posId);
          await tx.wait(1);
        } catch (e) { console.error(`   Liq ${posId} failed:`, e.message); }
      }
    }
  }

  // ── TP/SL ─────────────────────────────────────────────────
  async _executeTPSL() {
    const positions = db.prepare('SELECT * FROM tracked_positions WHERE take_profit>0 OR stop_loss>0').all();

    for (const pos of positions) {
      const price = prices.getPrice(this._symbolByMarket(pos.market_index));
      if (!price) continue;
      const tpHit = pos.take_profit > 0 && (pos.is_long ? price >= pos.take_profit : price <= pos.take_profit);
      const slHit = pos.stop_loss  > 0 && (pos.is_long ? price <= pos.stop_loss  : price >= pos.stop_loss);
      if (!tpHit && !slHit) continue;

      try {
        const gasEst = await this.perp.executeTPSL.estimateGas(pos.pos_id);
        const tx = await this.perp.executeTPSL(pos.pos_id, { gasLimit: gasEst * GAS_BUFFER / 100n });
        console.log(`   🎯 TP/SL pos ${pos.pos_id} | tx: ${tx.hash}`);
        db.prepare('DELETE FROM tracked_positions WHERE pos_id=?').run(pos.pos_id);
        await tx.wait(1);
      } catch (e) { console.error(`   TP/SL ${pos.pos_id} failed:`, e.message); }
    }
  }

  // ── Limit Orders ──────────────────────────────────────────
  async _executeLimitOrders() {
    const orders = db.prepare('SELECT * FROM tracked_orders').all();
    const byMarket = {};
    for (const o of orders) {
      const price = prices.getPrice(this._symbolByMarket(o.market_index));
      if (!price) continue;
      const canFill = o.is_long ? price <= o.limit_price : price >= o.limit_price;
      if (!canFill) continue;
      if (!byMarket[o.market_index]) byMarket[o.market_index] = [];
      byMarket[o.market_index].push(BigInt(o.order_id));
    }

    for (const [marketIdx, orderIds] of Object.entries(byMarket)) {
      const batch = orderIds.slice(0, MAX_BATCH_ORDERS);
      try {
        const gasEst = await this.perp.executeLimitOrders.estimateGas(marketIdx, batch);
        const tx = await this.perp.executeLimitOrders(marketIdx, batch, { gasLimit: gasEst * GAS_BUFFER / 100n });
        console.log(`   📋 Executed ${batch.length} limit orders market ${marketIdx} | tx: ${tx.hash}`);
        for (const id of batch) db.prepare('DELETE FROM tracked_orders WHERE order_id=?').run(Number(id));
        await tx.wait(1);
      } catch (e) { console.error(`   Limit orders market ${marketIdx} failed:`, e.message); }
    }
  }

  // ── Funding ───────────────────────────────────────────────
  async _settleFunding() {
    const now = Math.floor(Date.now() / 1000);
    const markets = db.prepare('SELECT * FROM funding_schedule').all();

    for (const m of markets) {
      if (now - m.last_funding < FUNDING_INTERVAL) continue;
      try {
        const gasEst = await this.perp.settleFunding.estimateGas(m.market_index);
        const tx = await this.perp.settleFunding(m.market_index, { gasLimit: gasEst * GAS_BUFFER / 100n });
        console.log(`   💸 Funding settled market ${m.market_index} | tx: ${tx.hash}`);
        db.prepare('UPDATE funding_schedule SET last_funding=? WHERE market_index=?').run(now, m.market_index);
        await tx.wait(1);
      } catch (e) { /* too early or no OI */ }
    }
  }

  // ── State Sync ────────────────────────────────────────────
  async _syncState() {
    console.log('🔄 Syncing on-chain state...');
    try {
      const count = await getPerp().marketCount();
      for (let i = 0; i < Number(count); i++) {
        db.prepare('INSERT OR IGNORE INTO funding_schedule VALUES(?,?)').run(i, 0);
      }
      console.log(`   ✅ ${count} markets tracked for funding`);
    } catch (e) { console.error('   Sync failed:', e.message); }

    // Subscribe to new events
    try {
      const perpWs = getKeeperContract(PERP_ABI, ADDRESSES.WikiPerp);
      perpWs.on('PositionOpened', (posId, trader, isLong, size, price) => {
        this._trackPosition(Number(posId), trader, isLong, size, price).catch(() => {});
      });
      perpWs.on('PositionClosed', (posId) => {
        db.prepare('DELETE FROM tracked_positions WHERE pos_id=?').run(Number(posId));
      });
      perpWs.on('OrderPlaced', (orderId, trader, marketIdx, isLong, size) => {
        // Will be synced on next tick
      });
      console.log('   ✅ Event listeners attached');
    } catch (e) { console.error('   Event listen failed:', e.message); }
  }

  async _trackPosition(posId, trader, isLong, size, price) {
    try {
      const pos = await getPerp().getPosition(posId);
      db.prepare(`INSERT OR REPLACE INTO tracked_positions VALUES(?,?,?,?,?,?,?,?,?)`)
        .run(posId, Number(pos.marketIndex), trader, isLong ? 1 : 0,
          Number(ethers.formatUnits(pos.entryPrice, 18)),
          Number(ethers.formatUnits(pos.liquidationPrice, 18)),
          pos.takeProfit > 0n ? Number(ethers.formatUnits(pos.takeProfit, 18)) : 0,
          pos.stopLoss  > 0n ? Number(ethers.formatUnits(pos.stopLoss, 18))  : 0,
          Number(ethers.formatUnits(pos.size, 6)));
    } catch {}
  }

  _symbolByMarket(marketIndex) {
    const MARKET_SYMBOLS = [
      'BTCUSDT','ETHUSDT','ARBUSDT','OPUSDT','BNBUSDT','SOLUSDT','ADAUSDT',
      'XRPUSDT','DOGEUSDT','DOTUSDT','AVAXUSDT','LINKUSDT','UNIUSDT','MATICUSDT','GMXUSDT',
    ];
    return MARKET_SYMBOLS[marketIndex] || 'BTCUSDT';
  }

  stop() { this.running = false; prices.stop(); }
}

const keeper = new KeeperBot();
keeper.start();
process.on('SIGINT', () => { keeper.stop(); process.exit(0); });
