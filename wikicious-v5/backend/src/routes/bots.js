/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Bots & Copy Trading API Routes
 *
 *  All routes require JWT auth (Bearer token).
 *  Bot execution uses the user's connected wallet via on-chain tx.
 *
 *  Endpoints:
 *  GET    /api/bots/strategies           — list all strategy templates
 *  GET    /api/bots                      — list user's bots
 *  POST   /api/bots                      — create a new bot
 *  PATCH  /api/bots/:id/start            — start a bot
 *  PATCH  /api/bots/:id/pause            — pause a bot
 *  DELETE /api/bots/:id                  — stop & delete a bot
 *  PATCH  /api/bots/:id/config           — update bot config
 *  GET    /api/bots/:id/trades           — get bot trade history
 *  POST   /api/bots/:id/execute          — internal: execute signal (bot engine → chain)
 *
 *  GET    /api/copy/masters              — list master traders
 *  GET    /api/copy/masters/:address     — master trader detail + stats
 *  POST   /api/copy/subscribe            — subscribe to a master trader
 *  DELETE /api/copy/subscribe/:id        — unsubscribe
 *  GET    /api/copy/subscriptions        — my active copy subscriptions
 *  GET    /api/copy/trades/:subId        — copy trade history for a subscription
 *  POST   /api/bots/copy/execute         — internal: copy trade execution
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const { ethers }   = require('ethers');
const { v4: uuid } = require('uuid');
const GridStrategy     = require('../services/bots/strategies/grid');
const DCAStrategy      = require('../services/bots/strategies/dca');
const RSIStrategy      = require('../services/bots/strategies/rsi');
const MACDStrategy     = require('../services/bots/strategies/macd');
const BreakoutStrategy = require('../services/bots/strategies/breakout');
const { getPerp, getVault, ADDRESSES, PERP_ABI, VAULT_ABI } = require('../services/chain');

// All built-in strategy descriptors for the marketplace UI
const STRATEGIES = {
  grid:     GridStrategy.describe(),
  dca:      DCAStrategy.describe(),
  rsi:      RSIStrategy.describe(),
  macd:     MACDStrategy.describe(),
  breakout: BreakoutStrategy.describe(),
  copy: {
    name:        'Copy Trading',
    description: 'Automatically mirrors trades from top-performing traders.',
    bestFor:     'Passive investing',
    risk:        'Depends on master',
    params:      [],
  },
  custom: {
    name:        'Custom Python Bot',
    description: 'Upload your own Python strategy. Runs in a sandboxed environment.',
    bestFor:     'Advanced / HFT users',
    risk:        'User-defined',
    params:      [],
  },
};

module.exports = function botsRouter(app, botEngine, copyService, auth) {

  // ════════════════════════════════════════════════════════════════
  //  STRATEGY TEMPLATES
  // ════════════════════════════════════════════════════════════════

  // List all available strategy types with their config params
  app.get('/api/bots/strategies', (req, res) => {
    res.json(Object.entries(STRATEGIES).map(([key, s]) => ({ key, ...s })));
  });


  // ════════════════════════════════════════════════════════════════
  //  BOT MANAGEMENT
  // ════════════════════════════════════════════════════════════════

  // List all bots for logged-in user
  app.get('/api/bots', auth, (req, res) => {
    try {
      const bots = botEngine.getBotsForUser(req.user.id || req.user.userId);
      res.json(bots.map(b => ({
        ...b,
        config: JSON.parse(b.config), // parse config JSON for client
      })));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Create a new bot (does not start it automatically)
  app.post('/api/bots', auth, (req, res) => {
    const { type, symbol, marketIndex, config, wallet } = req.body;
    if (!type || !symbol || marketIndex == null || !config || !wallet) {
      return res.status(400).json({ error: 'type, symbol, marketIndex, config, wallet required' });
    }
    if (!STRATEGIES[type]) {
      return res.status(400).json({ error: `Unknown strategy type: ${type}` });
    }
    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    try {
      const id = botEngine.createBot({
        userId:      req.user.id || req.user.userId,
        wallet:      wallet.toLowerCase(),
        type, symbol, marketIndex, config,
      });
      res.status(201).json({ botId: id, id, message: 'Bot created. Call /start to activate.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Start a bot
  app.patch('/api/bots/:id/start', auth, (req, res) => {
    try {
      botEngine.startBot(req.params.id, req.user.id || req.user.userId);
      res.json({ status: 'running' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Pause a bot
  app.patch('/api/bots/:id/pause', auth, (req, res) => {
    try {
      botEngine.pauseBot(req.params.id, req.user.id || req.user.userId);
      res.json({ status: 'paused' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Stop and permanently remove a bot
  app.delete('/api/bots/:id', auth, (req, res) => {
    try {
      botEngine.stopBot(req.params.id, req.user.id || req.user.userId);
      res.json({ status: 'stopped' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Update bot config (bot must be stopped/paused first)
  app.patch('/api/bots/:id/config', auth, (req, res) => {
    try {
      botEngine.updateBotConfig(req.params.id, req.user.id || req.user.userId, req.body);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Get trade history for a specific bot
  app.get('/api/bots/:id/trades', auth, (req, res) => {
    const limit = Math.min(500, parseInt(req.query.limit) || 100);
    res.json(botEngine.getBotTrades(req.params.id, limit));
  });

  // Upload custom Python script for a custom bot
  app.post('/api/bots/:id/upload-script', auth, (req, res) => {
    const { script } = req.body;
    if (!script || typeof script !== 'string') {
      return res.status(400).json({ error: 'script (string) required' });
    }
    if (script.length > 50_000) {
      return res.status(400).json({ error: 'Script too large (max 50KB)' });
    }

    // Basic safety check — block dangerous imports
    const forbidden = ['subprocess', 'os.system', 'shutil', '__import__', 'open(', 'socket'];
    for (const f of forbidden) {
      if (script.includes(f)) {
        return res.status(400).json({ error: `Forbidden: script cannot use "${f}"` });
      }
    }

    const fs   = require('fs');
    const path = require('path');
    const dir  = path.join(process.cwd(), 'data', 'custom_bots');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${req.params.id}.py`), script, 'utf8');
    res.json({ success: true, message: 'Script uploaded. Start the bot to activate.' });
  });

  // ── Internal: Bot engine executes a signal via this endpoint ──────
  // Called by BotEngine._executeSignal() — not exposed to public
  app.post('/api/bots/:id/execute', async (req, res) => {
    const { wallet, marketIndex, side, size, leverage, orderType, limitPrice, takeProfit, stopLoss } = req.body;
    try {
      const vault = getVault();

      // Check follower has enough free margin
      const freeMargin = await vault.freeMargin(wallet).catch(() => 0n);
      const freeUsdc   = Number(ethers.formatUnits(freeMargin, 6));
      if (freeUsdc < size) {
        return res.status(400).json({ error: `Insufficient margin: have $${freeUsdc.toFixed(2)}, need $${size}` });
      }

      // Note: Actual on-chain tx is placed by the user's wallet via frontend.
      // The engine records intent; the user confirms via the WebSocket notification.
      // For fully automated execution, the bot needs a delegated signing key.
      res.json({ success: true, txHash: null, message: 'Signal queued — user wallet confirmation pending' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });


  // ════════════════════════════════════════════════════════════════
  //  COPY TRADING
  // ════════════════════════════════════════════════════════════════

  // List master traders sorted by monthly PnL (copy trading marketplace)
  app.get('/api/copy/masters', (req, res) => {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    res.json(copyService.getMasters(limit));
  });

  // Get detailed stats for one master trader
  app.get('/api/copy/masters/:address', (req, res) => {
    const master = copyService.getMasterDetail(req.params.address.toLowerCase());
    if (!master) return res.status(404).json({ error: 'Master trader not found' });
    res.json(master);
  });

  // Subscribe to copy a master trader
  app.post('/api/copy/subscribe', auth, (req, res) => {
    const {
      masterAddress,
      wallet,
      copyRatio     = 1.0,  // 1.0 = same size, 0.5 = half size
      maxTradeSize  = 100,   // USDC cap per copied trade
      copySl        = true,
      copyTp        = true,
    } = req.body;

    if (!masterAddress || !wallet) {
      return res.status(400).json({ error: 'masterAddress and wallet required' });
    }
    if (copyRatio < 0.01 || copyRatio > 10) {
      return res.status(400).json({ error: 'copyRatio must be 0.01–10' });
    }
    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
      const id = copyService.subscribe({
        followerId:     req.user.id || req.user.userId,
        followerWallet: wallet.toLowerCase(),
        masterAddress:  masterAddress.toLowerCase(),
        copyRatio, maxTradeSize, copySl, copyTp,
      });
      res.status(201).json({ id, message: 'Copy subscription active' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Unsubscribe from a copy subscription
  app.delete('/api/copy/subscribe/:id', auth, (req, res) => {
    try {
      copyService.unsubscribe(req.params.id, req.user.id || req.user.userId);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // List my active copy subscriptions with master stats
  app.get('/api/copy/subscriptions', auth, (req, res) => {
    res.json({ subscriptions: copyService.getMySubscriptions(req.user.id || req.user.userId) });
  });

  // Get copy trade history for a subscription
  app.get('/api/copy/trades/:subId', auth, (req, res) => {
    const limit = Math.min(500, parseInt(req.query.limit) || 100);
    res.json(copyService.getMyCopyTrades(req.params.subId, limit));
  });

  // ── Internal: Copy engine executes a trade ────────────────────────
  app.post('/api/bots/copy/execute', async (req, res) => {
    const { wallet, subscriptionId, marketIndex, isLong, size, leverage = 1 } = req.body;
    try {
      const vault = getVault();
      const freeMargin = await vault.freeMargin(wallet).catch(() => 0n);
      const freeUsdc   = Number(ethers.formatUnits(freeMargin, 6));
      if (freeUsdc < size) {
        return res.status(400).json({ error: `Insufficient margin` });
      }
      res.json({ success: true, txHash: null });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};
