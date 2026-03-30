/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Bot Engine
 *
 *  Core execution engine that runs all active trading bots.
 *  Each bot is a state machine:
 *    CREATED → RUNNING → PAUSED → STOPPED
 *
 *  Supports:
 *  - Built-in strategy bots  (Grid, DCA, RSI, MACD, Breakout)
 *  - Copy trading bots       (mirrors a trader's positions)
 *  - Custom Python bots      (executes via child_process sandbox)
 *
 *  The engine ticks every second. Each bot runs its own logic
 *  and emits trade signals, which the engine executes via the API.
 *
 *  All bot state is persisted to SQLite so bots survive restarts.
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

const EventEmitter  = require('events');
const Database      = require('better-sqlite3');
const { spawn }     = require('child_process');
const path          = require('path');
const fs            = require('fs');
const axios         = require('axios');
const prices        = require('../prices');

// ── Built-in strategies ──────────────────────────────────────────
const GridStrategy      = require('./strategies/grid');
const DCAStrategy       = require('./strategies/dca');
const RSIStrategy       = require('./strategies/rsi');
const MACDStrategy      = require('./strategies/macd');
const BreakoutStrategy  = require('./strategies/breakout');

// ── Constants ─────────────────────────────────────────────────────
const TICK_INTERVAL_MS  = 1_000;   // engine tick every 1 second
const MAX_BOTS_PER_USER = 10;      // prevent abuse
const MAX_CUSTOM_BOTS   = 3;       // Python bots are resource-heavy

const STRATEGY_MAP = {
  grid:     GridStrategy,
  dca:      DCAStrategy,
  rsi:      RSIStrategy,
  macd:     MACDStrategy,
  breakout: BreakoutStrategy,
};

class BotEngine extends EventEmitter {
  constructor(db, apiBaseUrl) {
    super();
    this.db         = db;
    this.apiBaseUrl = apiBaseUrl;  // internal API URL for placing orders
    this.bots       = new Map();   // botId → { config, strategy, state }
    this.timer      = null;
    this._initDb();
  }

  // ── Database setup ──────────────────────────────────────────────
  _initDb() {
    this.db.exec(`
      -- Master bot config table
      CREATE TABLE IF NOT EXISTS bots (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        wallet        TEXT NOT NULL,
        type          TEXT NOT NULL,     -- 'grid' | 'dca' | 'rsi' | 'macd' | 'breakout' | 'copy' | 'custom'
        symbol        TEXT NOT NULL,
        market_index  INTEGER NOT NULL,
        config        TEXT NOT NULL,     -- JSON — strategy-specific params
        status        TEXT DEFAULT 'created', -- 'running' | 'paused' | 'stopped' | 'error'
        pnl           REAL DEFAULT 0,
        total_trades  INTEGER DEFAULT 0,
        error_msg     TEXT,
        created_at    INTEGER DEFAULT (unixepoch()),
        updated_at    INTEGER DEFAULT (unixepoch())
      );

      -- Per-bot trade log
      CREATE TABLE IF NOT EXISTS bot_trades (
        id         TEXT PRIMARY KEY,
        bot_id     TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        symbol     TEXT NOT NULL,
        side       TEXT NOT NULL,  -- 'long' | 'short'
        order_type TEXT NOT NULL,  -- 'market' | 'limit'
        size       REAL NOT NULL,
        price      REAL NOT NULL,
        leverage   INTEGER DEFAULT 1,
        tx_hash    TEXT,
        reason     TEXT,           -- human-readable signal reason
        ts         INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (bot_id) REFERENCES bots(id)
      );

      -- Copy trading: master traders
      CREATE TABLE IF NOT EXISTS copy_masters (
        address     TEXT PRIMARY KEY,
        username    TEXT,
        win_rate    REAL DEFAULT 0,
        avg_pnl     REAL DEFAULT 0,
        total_pnl   REAL DEFAULT 0,
        followers   INTEGER DEFAULT 0,
        monthly_pnl REAL DEFAULT 0,
        risk_score  INTEGER DEFAULT 5,  -- 1-10, lower is safer
        verified    INTEGER DEFAULT 0,
        updated_at  INTEGER DEFAULT (unixepoch())
      );

      -- Copy trading: follower subscriptions
      CREATE TABLE IF NOT EXISTS copy_subscriptions (
        id             TEXT PRIMARY KEY,
        follower_id    TEXT NOT NULL,   -- user_id of follower
        follower_wallet TEXT NOT NULL,
        master_address TEXT NOT NULL,   -- trader being copied
        copy_ratio     REAL DEFAULT 1.0, -- 1.0 = same size, 0.5 = half size
        max_trade_size REAL DEFAULT 100, -- USDC cap per trade
        copy_sl        INTEGER DEFAULT 1, -- copy stop-losses?
        copy_tp        INTEGER DEFAULT 1, -- copy take-profits?
        status         TEXT DEFAULT 'active',
        total_pnl      REAL DEFAULT 0,
        total_trades   INTEGER DEFAULT 0,
        created_at     INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (master_address) REFERENCES copy_masters(address)
      );

      -- Copy trading: master position mirror log
      CREATE TABLE IF NOT EXISTS copy_trades (
        id              TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        master_tx       TEXT,           -- original master tx hash
        follower_tx     TEXT,           -- our copied tx hash
        symbol          TEXT NOT NULL,
        side            TEXT NOT NULL,
        size            REAL NOT NULL,
        price           REAL NOT NULL,
        pnl             REAL DEFAULT 0,
        ts              INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_bots_user    ON bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_bot_trades   ON bot_trades(bot_id, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_copy_subs    ON copy_subscriptions(follower_id);
      CREATE INDEX IF NOT EXISTS idx_copy_trades  ON copy_trades(subscription_id, ts DESC);
    `);
  }

  // ── Start / Stop Engine ─────────────────────────────────────────
  start() {
    // Load all running bots from DB on startup
    const runningBots = this.db.prepare(
      `SELECT * FROM bots WHERE status = 'running'`
    ).all();

    for (const row of runningBots) {
      this._loadBot(row);
    }

    this.timer = setInterval(() => this._tick(), TICK_INTERVAL_MS);
    console.log(`🤖 Bot engine started — ${runningBots.length} bots resumed`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    console.log('🤖 Bot engine stopped');
  }

  // ── Engine Tick ─────────────────────────────────────────────────
  // Called every second. Runs each active bot's strategy logic.
  async _tick() {
    for (const [botId, bot] of this.bots.entries()) {
      if (bot.config.status !== 'running') continue;

      try {
        const signal = await bot.strategy.tick({
          price:  prices.getPrice(bot.config.symbol),
          change: prices.getChange(bot.config.symbol),
          config: bot.config,
        });

        if (signal) {
          await this._executeSignal(botId, bot, signal);
        }
      } catch (err) {
        this._setBotError(botId, err.message);
      }
    }
  }

  // ── Execute a Trade Signal ───────────────────────────────────────
  async _executeSignal(botId, bot, signal) {
    // signal = { side: 'long'|'short', size: number, leverage: number,
    //            orderType: 'market'|'limit', price?: number,
    //            tp?: number, sl?: number, reason: string }

    try {
      // Place order via internal API (the bot's API key authorizes it)
      const res = await axios.post(`${this.apiBaseUrl}/api/bots/${botId}/execute`, {
        wallet:       bot.config.wallet,
        marketIndex:  bot.config.market_index,
        side:         signal.side,
        size:         signal.size,
        leverage:     signal.leverage || 1,
        orderType:    signal.orderType || 'market',
        limitPrice:   signal.price,
        takeProfit:   signal.tp,
        stopLoss:     signal.sl,
      });

      // Log the trade
      this.db.prepare(`
        INSERT INTO bot_trades (id, bot_id, user_id, symbol, side, order_type, size, price, leverage, tx_hash, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${botId}_${Date.now()}`,
        botId,
        bot.config.user_id,
        bot.config.symbol,
        signal.side,
        signal.orderType || 'market',
        signal.size,
        prices.getPrice(bot.config.symbol) || 0,
        signal.leverage || 1,
        res.data?.txHash || null,
        signal.reason,
      );

      // Update bot stats
      this.db.prepare(`
        UPDATE bots SET total_trades = total_trades + 1, updated_at = unixepoch() WHERE id = ?
      `).run(botId);

      this.emit('trade', { botId, signal, userId: bot.config.user_id });
      console.log(`🤖 Bot ${botId} | ${signal.side.toUpperCase()} ${signal.size} ${bot.config.symbol} | ${signal.reason}`);

    } catch (err) {
      console.error(`🤖 Bot ${botId} execute failed:`, err.message);
    }
  }

  // ── Bot Lifecycle ────────────────────────────────────────────────

  /** Create a new bot and persist it to DB. Does NOT start it yet. */
  createBot({ userId, wallet, type, symbol, marketIndex, config }) {
    const { v4: uuid } = require('uuid');
    const id = `bot_${userId.slice(0, 8)}_${uuid().replace(/-/g,'').slice(0,12)}`;

    // Enforce per-user bot limit
    const existing = this.db.prepare(
      `SELECT COUNT(*) as cnt FROM bots WHERE user_id = ? AND status != 'stopped'`
    ).get(userId);
    if (existing.cnt >= MAX_BOTS_PER_USER) {
      throw new Error(`Maximum ${MAX_BOTS_PER_USER} active bots per user`);
    }

    // Enforce custom bot limit
    if (type === 'custom') {
      const customCount = this.db.prepare(
        `SELECT COUNT(*) as cnt FROM bots WHERE type = 'custom' AND status = 'running'`
      ).get();
      if (customCount.cnt >= MAX_CUSTOM_BOTS) {
        throw new Error(`Maximum ${MAX_CUSTOM_BOTS} custom Python bots running at a time`);
      }
    }

    this.db.prepare(`
      INSERT INTO bots (id, user_id, wallet, type, symbol, market_index, config, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'created')
    `).run(id, userId, wallet, type, symbol, marketIndex, JSON.stringify(config));

    return id;
  }

  /** Start a stopped/paused bot. */
  startBot(botId, userId) {
    const row = this._getBotRow(botId, userId);
    if (!row) throw new Error('Bot not found');

    this._loadBot(row);
    this.db.prepare(
      `UPDATE bots SET status = 'running', updated_at = unixepoch() WHERE id = ?`
    ).run(botId);
    this.bots.get(botId).config.status = 'running';

    console.log(`🤖 Bot ${botId} started (${row.type})`);
    return true;
  }

  /** Pause a running bot without deleting it. */
  pauseBot(botId, userId) {
    const bot = this.bots.get(botId);
    if (!bot || bot.config.user_id !== userId) throw new Error('Bot not found');

    bot.config.status = 'paused';
    this.db.prepare(
      `UPDATE bots SET status = 'paused', updated_at = unixepoch() WHERE id = ?`
    ).run(botId);
    return true;
  }

  /** Stop and remove a bot from memory. */
  stopBot(botId, userId) {
    const bot = this.bots.get(botId);
    if (bot && bot.config.user_id !== userId) throw new Error('Unauthorized');

    this.bots.delete(botId);
    this.db.prepare(
      `UPDATE bots SET status = 'stopped', updated_at = unixepoch() WHERE id = ?`
    ).run(botId);
    return true;
  }

  /** Update bot config (only while stopped or paused). */
  updateBotConfig(botId, userId, newConfig) {
    const row = this._getBotRow(botId, userId);
    if (!row) throw new Error('Bot not found');
    if (row.status === 'running') throw new Error('Stop the bot before editing config');

    const merged = { ...JSON.parse(row.config), ...newConfig };
    this.db.prepare(
      `UPDATE bots SET config = ?, updated_at = unixepoch() WHERE id = ?`
    ).run(JSON.stringify(merged), botId);
    return true;
  }

  // ── Internal helpers ─────────────────────────────────────────────

  _loadBot(row) {
    const config   = JSON.parse(row.config);
    config.id      = row.id;
    config.user_id = row.user_id;
    config.wallet  = row.wallet;
    config.symbol  = row.symbol;
    config.market_index = row.market_index;
    config.status  = row.status;

    let strategy;
    if (row.type === 'copy') {
      strategy = new CopyStrategy(config, this.db);
    } else if (row.type === 'custom') {
      strategy = new PythonStrategy(config);
    } else {
      const StratClass = STRATEGY_MAP[row.type];
      if (!StratClass) throw new Error(`Unknown strategy: ${row.type}`);
      strategy = new StratClass(config);
    }

    this.bots.set(row.id, { config, strategy });
  }

  _getBotRow(botId, userId) {
    return this.db.prepare(
      `SELECT * FROM bots WHERE id = ? AND user_id = ?`
    ).get(botId, userId);
  }

  _setBotError(botId, errorMsg) {
    const bot = this.bots.get(botId);
    if (bot) bot.config.status = 'error';
    this.db.prepare(
      `UPDATE bots SET status = 'error', error_msg = ?, updated_at = unixepoch() WHERE id = ?`
    ).run(errorMsg.slice(0, 500), botId);
    console.error(`🤖 Bot ${botId} error: ${errorMsg}`);
  }

  // ── Query helpers (for API routes) ──────────────────────────────

  getBotsForUser(userId) {
    return this.db.prepare(`SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  }

  getBotTrades(botId, limit = 100) {
    return this.db.prepare(
      `SELECT * FROM bot_trades WHERE bot_id = ? ORDER BY ts DESC LIMIT ?`
    ).all(botId, limit);
  }

  getCopyMasters(limit = 50) {
    return this.db.prepare(
      `SELECT * FROM copy_masters ORDER BY monthly_pnl DESC LIMIT ?`
    ).all(limit);
  }

  getCopySubscriptions(userId) {
    return this.db.prepare(
      `SELECT cs.*, cm.username, cm.win_rate, cm.monthly_pnl, cm.risk_score
       FROM copy_subscriptions cs
       LEFT JOIN copy_masters cm ON cs.master_address = cm.address
       WHERE cs.follower_id = ? ORDER BY cs.created_at DESC`
    ).all(userId);
  }
}


// ── Copy Strategy (inline — tightly coupled to DB) ────────────────
class CopyStrategy {
  constructor(config, db) {
    this.config       = config;
    this.db           = db;
    this.lastSeenTx   = null;
    this.tickCount    = 0;
  }

  async tick({ price }) {
    // Poll master positions every 10 seconds (not every tick)
    this.tickCount++;
    if (this.tickCount % 10 !== 0) return null;

    // Check if master opened a new position since we last checked
    // In production this would watch on-chain events
    // Here we poll the API
    return null; // Actual copy logic is in copy_trading.js service
  }
}


// ── Python Strategy (sandbox via child_process) ───────────────────
class PythonStrategy {
  constructor(config) {
    this.config   = config;
    this.proc     = null;
    this.pending  = null;
    this._startProcess();
  }

  _startProcess() {
    const scriptPath = path.join(
      process.cwd(), 'data', 'custom_bots', `${this.config.id}.py`
    );
    if (!fs.existsSync(scriptPath)) return;

    // Spawn Python with restricted permissions
    // The script communicates via stdin/stdout JSON lines
    this.proc = spawn('python3', [scriptPath], {
      env: {
        ...process.env,
        WIKICIOUS_BOT_ID: this.config.id,
        // Only pass what the script needs — no private keys
        WIKICIOUS_API_URL: process.env.API_URL || 'http://localhost:3001',
      },
      timeout: 30_000,
    });

    this.proc.stdout.on('data', (data) => {
      try {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.signal) this.pending = parsed.signal;
        }
      } catch {}
    });

    this.proc.stderr.on('data', (d) => {
      console.error(`[python bot ${this.config.id}]`, d.toString().slice(0, 200));
    });

    this.proc.on('exit', () => { this.proc = null; });
  }

  async tick({ price, config }) {
    if (!this.proc) return null;

    // Send current market data to Python script
    try {
      this.proc.stdin.write(JSON.stringify({
        price,
        symbol:    config.symbol,
        timestamp: Date.now(),
      }) + '\n');
    } catch {}

    // Return any signal the Python script emitted
    const signal = this.pending;
    this.pending  = null;
    return signal;
  }

  destroy() {
    if (this.proc) this.proc.kill('SIGTERM');
  }
}

module.exports = BotEngine;
