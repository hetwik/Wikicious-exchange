'use strict';
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const morgan     = require('morgan');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const Database   = require('better-sqlite3');
const { ethers } = require('ethers');
const fs         = require('fs');
const path       = require('path');

const prices  = require('./services/prices');
const revenueRoutes  = require('./routes/revenue');
const tradeRoutes    = require('./routes/trade');
const socialRoutes   = require('./routes/social');
const botsRouter     = require('./routes/bots');
const bonusRouter    = require('./routes/bonus');
const SocialIndexer  = require('./services/social_indexer');
const BotEngine      = require('./services/bots/bot_engine');
const CopyTradingService = require('./services/bots/copy_trading');
const { getPerp, getVault, getAMM, getSpot, getProvider, ADDRESSES } = require('./services/chain');
const { PERP_ABI, VAULT_ABI, AMM_ABI } = require('./config');

const PORT       = parseInt(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'wikicious-secret-change-me';

// ── DB ────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || './data/wikicious.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, username TEXT UNIQUE,
    password TEXT, wallet_address TEXT, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS candles (
    market TEXT, interval TEXT, open_time INTEGER,
    open REAL, high REAL, low REAL, close REAL, volume REAL DEFAULT 0,
    PRIMARY KEY(market, interval, open_time)
  );
  CREATE TABLE IF NOT EXISTS trades_index (
    id TEXT PRIMARY KEY, market TEXT, price REAL, size REAL,
    side TEXT, tx_hash TEXT, ts INTEGER
  );
  CREATE TABLE IF NOT EXISTS leaderboard (
    address TEXT PRIMARY KEY, username TEXT, realized_pnl REAL DEFAULT 0,
    trade_count INTEGER DEFAULT 0, volume REAL DEFAULT 0, updated_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_candles ON candles(market, interval, open_time DESC);
  CREATE INDEX IF NOT EXISTS idx_trades ON trades_index(market, ts DESC);
`);

// ── Security Middleware ───────────────────────────────────────
const {
  corsOptions, globalLimiter, authLimiter, writeLimiter,
  requireAddress, requireSymbol, sanitiseCandles, sanitiseOrderbook,
  detectSuspicious, requestId, extraSecurityHeaders,
  validateJwtSecret, validateKeeperKey,
} = require('./middleware/security');

// Validate secrets on startup — exits in production if insecure
validateJwtSecret();
validateKeeperKey();

// Start security monitoring
require('./services/security_monitor').startMonitoring().catch(e =>
  console.warn('[SECURITY MONITOR] Non-fatal startup error:', e.message)
);

// ── App ───────────────────────────────────────────────────────
const app = express();
app.use(requestId);
app.use(cors(corsOptions));                              // locked-down CORS
app.use(helmet({ contentSecurityPolicy: false }));
app.use(extraSecurityHeaders);
app.use(express.json({ limit: '512kb' }));              // reduced from 2mb
app.use(morgan('tiny'));
app.use(globalLimiter);                                  // 200/min global (was 500)
app.use(detectSuspicious);                               // SQLi/XSS detection

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── Auth ──────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password?.length >= 8) return res.status(400).json({ error: 'Invalid input' });
  try {
    const pw = await bcrypt.hash(password, 10);
    const id = uuid();
    db.prepare('INSERT INTO users(id,email,username,password) VALUES(?,?,?,?)').run(id, email.toLowerCase(), username, pw);
    const token = jwt.sign({ userId:id, username, email }, JWT_SECRET, { expiresIn:'30d' });
    res.status(201).json({ token, user: { id, email, username } });
  } catch(e) { res.status(409).json({ error: 'Email or username taken' }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email?.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId:user.id, username:user.username, email:user.email }, JWT_SECRET, { expiresIn:'30d' });
  res.json({ token, user: { id:user.id, email:user.email, username:user.username, walletAddress:user.wallet_address } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const u = db.prepare('SELECT id,email,username,wallet_address,created_at FROM users WHERE id=?').get(req.user.userId);
  res.json(u);
});

app.patch('/api/auth/wallet', auth, (req, res) => {
  const { address } = req.body;
  if (!ethers.isAddress(address)) return res.status(400).json({ error: 'Invalid address' });
  db.prepare('UPDATE users SET wallet_address=? WHERE id=?').run(address.toLowerCase(), req.user.userId);
  // Upsert leaderboard
  const u = db.prepare('SELECT username FROM users WHERE id=?').get(req.user.userId);
  db.prepare('INSERT OR IGNORE INTO leaderboard(address,username) VALUES(?,?)').run(address.toLowerCase(), u?.username);
  res.json({ success: true });
});

// ── Markets ───────────────────────────────────────────────────
app.get('/api/markets', async (req, res) => {
  try {
    const allPrices = prices.getAllPrices();
    // Build market list from contracts if available, else from price data
    const marketList = Object.entries(allPrices).slice(0, 300).map(([symbol, price]) => ({
      symbol,
      base: symbol.replace('USDT','').replace('1000',''),
      quote: 'USDT',
      markPrice: price,
      indexPrice: price,
      change24h: prices.getChange(symbol),
      volume24h: prices.getVolume(symbol),
      openInterestLong: 0,
      openInterestShort: 0,
    }));
    res.json(marketList);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/markets/:symbol/price', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const price = prices.getPrice(sym);
  if (!price) return res.status(404).json({ error: 'Symbol not found' });
  res.json({ symbol:sym, price, change24h:prices.getChange(sym), ts:Date.now() });
});

app.get('/api/markets/:symbol/candles', requireSymbol, sanitiseCandles, (req, res) => {
  const symbol   = req.params.symbol.toUpperCase();
  const interval = req.query.interval; // already sanitised to safe whitelist by sanitiseCandles
  const limit    = req.query.limit;    // already clamped to 1-1000
  const rows = db.prepare('SELECT * FROM candles WHERE market=? AND interval=? ORDER BY open_time DESC LIMIT ?').all(symbol, interval, limit);
  if (rows.length >= 10) return res.json(rows.reverse());

  // Generate synthetic candles
  const base = prices.getPrice(symbol) || 100;
  const itvMs = { '1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000,'1w':604800000 };
  const ms = itvMs[interval] || 3600000;
  const now = Date.now();
  const synth = []; let p = base * 0.88;
  for (let i = limit; i >= 0; i--) {
    const mv = (Math.random()-0.485)*p*0.018;
    const o=p, c=Math.max(0.000001,p+mv);
    synth.push({ market:symbol, interval, open_time:now-i*ms, open:+o.toFixed(8), high:+(Math.max(o,c)*(1+Math.random()*0.007)).toFixed(8), low:+(Math.min(o,c)*(1-Math.random()*0.007)).toFixed(8), close:+c.toFixed(8), volume:+(Math.random()*1e6).toFixed(2) });
    p=c;
  }
  res.json(synth);
});

app.get('/api/markets/:symbol/orderbook', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const depth  = Math.min(50, parseInt(req.query.depth) || 25);
  const price  = prices.getPrice(symbol) || 1;
  // Synthetic orderbook based on mark price
  const bids = Array.from({length:depth}, (_,i) => ({
    price: +(price*(1-(i+1)*0.00015)).toFixed(8),
    size:  +(Math.random()*8+0.1).toFixed(4),
  }));
  const asks = Array.from({length:depth}, (_,i) => ({
    price: +(price*(1+(i+1)*0.00015)).toFixed(8),
    size:  +(Math.random()*8+0.1).toFixed(4),
  }));
  res.json({ symbol, bids, asks, ts: Date.now() });
});

app.get('/api/markets/:symbol/trades', (req, res) => {
  const rows = db.prepare('SELECT * FROM trades_index WHERE market=? ORDER BY ts DESC LIMIT 50').all(req.params.symbol.toUpperCase());
  res.json(rows);
});

app.get('/api/markets/:symbol/funding', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price  = prices.getPrice(symbol) || 0;
  // Synthetic funding rate based on market conditions
  res.json({ symbol, rate: (Math.random()-0.5)*0.002, markPrice: price, nextFundingTime: Math.floor(Date.now()/1000) + 28800 });
});

// ── On-chain Account / Portfolio ──────────────────────────────
app.get('/api/account/:address/balance', async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: 'Invalid address' });
    const vault = getVault();
    const [free, locked] = await Promise.all([
      vault.freeMargin(addr).catch(() => 0n),
      vault.lockedMargin(addr).catch(() => 0n),
    ]);
    res.json({
      address: addr,
      freeMargin:   ethers.formatUnits(free,  6),
      lockedMargin: ethers.formatUnits(locked, 6),
      totalMargin:  ethers.formatUnits(free + locked, 6),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/account/:address/positions', async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: 'Invalid address' });
    const perp = getPerp();
    const ids = await perp.getTraderPositions(addr).catch(() => []);
    const positions = await Promise.all(
      ids.slice(0, 50).map(async (id) => {
        const p = await perp.getPosition(id);
        if (!p.open) return null;
        const upnl = await perp.getUnrealizedPnL(id).catch(() => 0n);
        return {
          id: Number(id), marketIndex: Number(p.marketIndex), isLong: p.isLong,
          size:        ethers.formatUnits(p.size, 6),
          collateral:  ethers.formatUnits(p.collateral, 6),
          entryPrice:  ethers.formatUnits(p.entryPrice, 18),
          liqPrice:    ethers.formatUnits(p.liquidationPrice, 18),
          leverage:    Number(p.leverage),
          takeProfit:  p.takeProfit > 0n ? ethers.formatUnits(p.takeProfit, 18) : null,
          stopLoss:    p.stopLoss  > 0n ? ethers.formatUnits(p.stopLoss, 18)  : null,
          unrealizedPnl: ethers.formatUnits(upnl, 6),
          openedAt:    Number(p.openedAt),
        };
      })
    );
    res.json(positions.filter(Boolean));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/account/:address/orders', async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: 'Invalid address' });
    const perp = getPerp();
    const ids = await perp.getTraderOrders(addr).catch(() => []);
    const orders = await Promise.all(
      ids.slice(0, 50).map(async (id) => {
        const o = await perp.getOrder(id);
        if (!o.open) return null;
        return {
          id: Number(id), marketIndex: Number(o.marketIndex), isLong: o.isLong,
          isLimit: o.isLimit, size: ethers.formatUnits(o.size, 6),
          collateral: ethers.formatUnits(o.collateral, 6),
          limitPrice: o.limitPrice > 0n ? ethers.formatUnits(o.limitPrice, 18) : null,
          leverage: Number(o.leverage),
          createdAt: Number(o.createdAt),
        };
      })
    );
    res.json(orders.filter(Boolean));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── AMM Pool ──────────────────────────────────────────────────
app.get('/api/pool/stats', async (req, res) => {
  try {
    const amm = getAMM();
    const [stats, price, supply] = await Promise.all([
      amm.getPoolStats().catch(() => null),
      amm.getWLPPrice().catch(() => 0n),
      amm.totalSupply().catch(() => 0n),
    ]);
    res.json({
      wlpPrice:       stats ? ethers.formatUnits(price, 6) : '1.00',
      totalSupply:    stats ? ethers.formatUnits(supply, 18) : '0',
      totalLiquidity: stats ? ethers.formatUnits(stats.totalLiquidity, 6) : '0',
      feesEarned:     stats ? ethers.formatUnits(stats.totalFeesEarned, 6) : '0',
    });
  } catch(e) { res.json({ wlpPrice:'1.00', totalLiquidity:'0', feesEarned:'0' }); }
});

// ── Oracle Prices ─────────────────────────────────────────────
app.get('/api/oracle/prices', (req, res) => res.json(prices.getAllPrices()));

// ── Leaderboard ───────────────────────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare('SELECT * FROM leaderboard ORDER BY realized_pnl DESC LIMIT 100').all();
  if (rows.length < 10) {
    // Mock data until real data accumulates
    const mock = Array.from({length:20}, (_,i) => ({
      address: `0x${Math.random().toString(16).slice(2,42).padStart(40,'0')}`,
      username: ['SatoshiWave','CryptoTiger','MoonRocket','BullRunner','ApeKing','DiamondGrip','PerpGod','DeltaWolf','GammaBull','VegaVault'][i%10],
      realized_pnl: 50000 - i*2000 + (i*137)%800,
      trade_count: 200 - i*7,
      volume: 5000000 - i*180000,
      win_rate: 72 - i*1.2,
    }));
    return res.json(mock);
  }
  res.json(rows);
});

// ── Social ────────────────────────────────────────────────────
const socialAddr = process.env.SOCIAL_ADDRESS || '';
let socialIndexer = null;
if (socialAddr) {
  socialIndexer = new SocialIndexer(provider, socialAddr, process.env.REWARDS_ADDRESS || null);
  socialIndexer.startListening();
  socialRoutes(app, socialIndexer, null);
}

// ── Revenue ──────────────────────────────────────────────────
revenueRoutes(app, db);

// ── Feature Routes v1 (OrderBook, Staking, Launchpad, Bridge, Lending) ──
const {
  obRouter, stakingRouter, launchpadRouter, bridgeRouter, lendingRouter
} = require('./routes/features');
tradeRoutes(app);
app.use('/api/orderbook',  obRouter);
app.use('/api/staking',    stakingRouter);
app.use('/api/launchpad',  launchpadRouter);
app.use('/api/bridge',     bridgeRouter);
app.use('/api/lending',    lendingRouter);

// ── Feature Routes v2 (LaunchPool, LP, LiquidStaking, Rebalancer) ──
const {
  launchPoolRouter, lpRouter, liquidStakingRouter, rebalancerRouter
} = require('./routes/features2');
app.use('/api/launchpool',      launchPoolRouter);
app.use('/api/lp',              lpRouter);
app.use('/api/liquid-staking',  liquidStakingRouter);
app.use('/api/rebalancer',      rebalancerRouter);

// ── Revenue Engine (new) ──────────────────────────────────────
const { crossChainRouter, mevRouter, feeRouter, revenueRouter: revEngineRouter } = require('./routes/revenue_engine');
app.use('/api/crosschain',      crossChainRouter);
app.use('/api/mev',             mevRouter);
app.use('/api/fees',            feeRouter);
app.use('/api/revenue-engine',  revEngineRouter);

// ── Yield Slicing ─────────────────────────────────────────────
const { yieldSliceRouter } = require('./routes/yield_slice');
app.use('/api/yield-slice', yieldSliceRouter);
app.use('/api/bonus',       bonusRouter);

// ── Revenue Features (new 10 streams) ────────────────────────
const {
  optionsRouter, strategyRouter, kaasRouter, predictionRouter,
  socialMonRouter, copyRevenueRouter, analyticsRouter, whitelabelRouter,
} = require('./routes/revenue_features');
app.use('/api/options-vaults',  optionsRouter);

// ── Expansion Revenue ─────────────────────────────────────────────────
const { buybackRouter, propChallengeRouter, liqInsRouter, traderPassRouter, otcRouter, pmRouter, feeScheduleRouter } = require('./routes/expansion_revenue');
app.use('/api/buyback',           buybackRouter);
app.use('/api/prop-challenge',    propChallengeRouter);
app.use('/api/liq-insurance',     liqInsRouter);
app.use('/api/trader-pass',       traderPassRouter);
app.use('/api/otc',               otcRouter);
app.use('/api/portfolio-margin',  pmRouter);
app.use('/api/fee-schedule',      feeScheduleRouter);
// ── New Revenue Features ──────────────────────────────────────────────────
const { ieoRouter, eiRouter, grRouter, slRouter, mrRouter, yaRouter, nftpRouter, subRouter, cvRouter, daoRouter, frdRouter, poRouter } = require('./routes/new_revenue');
app.use('/api/ieo',               ieoRouter);
app.use('/api/ext-insurance',     eiRouter);
app.use('/api/gas-rebate',        grRouter);
app.use('/api/structured-lending',slRouter);
app.use('/api/maker-rewards',     mrRouter);
app.use('/api/yield-aggregator',  yaRouter);
app.use('/api/nft-perps',         nftpRouter);
app.use('/api/subscriptions',     subRouter);
app.use('/api/composable-vault',  cvRouter);
app.use('/api/dao-treasury',      daoRouter);
app.use('/api/funding-derivatives',frdRouter);
app.use('/api/perp-options',      poRouter);
// ── DEX Revenue Expansion ─────────────────────────────────────────────────
const { ifRouter, vtRouter, favRouter, polRouter, ltRouter, ixRouter, pmRouter: pmDexRouter, rwaRouter } = require('./routes/dex_revenue');
app.use('/api/insurance-yield',   ifRouter);
app.use('/api/volume-tiers',      vtRouter);
app.use('/api/funding-arb',       favRouter);
app.use('/api/pol',               polRouter);
app.use('/api/leveraged-tokens',  ltRouter);
app.use('/api/index-perps',       ixRouter);
app.use('/api/permissionless',    pmDexRouter);
app.use('/api/rwa',               rwaRouter);
app.use('/api/strategy-vaults', strategyRouter);
app.use('/api/kaas',            kaasRouter);
app.use('/api/predictions',     predictionRouter);
app.use('/api/social-mon',      socialMonRouter);
app.use('/api/copy-revenue',    copyRevenueRouter);
app.use('/api/analytics',       analyticsRouter);
app.use('/api/whitelabel',      whitelabelRouter);

// ── Advanced Lending Suite ────────────────────────────────────
const {
  flashRouter, marginRouter, lpCollRouter, cclRouter,
} = require('./routes/advanced_lending');
app.use('/api/flash',           flashRouter);
app.use('/api/margin',          marginRouter);
app.use('/api/lpcollateral',    lpCollRouter);
app.use('/api/crosslending',    cclRouter);

// ── Bots & Copy Trading ──────────────────────────────────────
const API_BASE = `http://localhost:${process.env.PORT || 3000}`;
const botEngine   = new BotEngine(db, API_BASE);
const copyService = new CopyTradingService(db, API_BASE);
botEngine.start();

// Forward bot trade events to WebSocket subscribers
botEngine.on('trade', ({ botId, signal, userId }) => {
  broadcastToChannel(`bot:${botId}`, { type: 'bot_trade', data: { botId, signal } });
});

botsRouter(app, botEngine, copyService, auth);

// ── Health ────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let chainOk = false;
  try { await getProvider().getBlockNumber(); chainOk = true; } catch {}
  res.json({ ok: true, chainConnected: chainOk, priceSymbols: Object.keys(prices.getAllPrices()).length });
});

// ── WebSocket ─────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.subscriptions = new Set(['ticker']);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'subscribe')   msg.channels?.forEach(c => ws.subscriptions?.add(c));
      if (msg.type === 'unsubscribe') msg.channels?.forEach(c => ws.subscriptions?.delete(c));
      if (msg.type === 'ping')        ws.send(JSON.stringify({ type:'pong', ts:Date.now() }));
    } catch {}
  });
  ws.send(JSON.stringify({ type:'connected', data:{ contracts: ADDRESSES } }));
});

function broadcastToChannel(channel, msg) {
  const raw = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN && ws.subscriptions?.has(channel)) ws.send(raw);
  }
}

// Price broadcast
prices.on('update', (updates) => {
  broadcastToChannel('ticker', { type:'ticker', data:updates });
  // Update candles
  for (const [symbol, price] of Object.entries(updates)) {
    _updateCandle(symbol, price);
  }
});

// Index on-chain events
function _listenChainEvents() {
  try {
    const perp = getPerp();
    perp.on('PositionOpened', (posId, trader, isLong, size, price, event) => {
      const msg = { type:'position_opened', data:{ posId:Number(posId), trader, isLong, size:ethers.formatUnits(size,6), price:ethers.formatUnits(price,18), txHash:event.transactionHash } };
      broadcastToChannel(`account:${trader.toLowerCase()}`, msg);
      broadcastToChannel('positions', msg);
    });
    perp.on('PositionClosed', (posId, trader, pnl, closePrice, event) => {
      const msg = { type:'position_closed', data:{ posId:Number(posId), trader, pnl:ethers.formatUnits(pnl,6), closePrice:ethers.formatUnits(closePrice,18) } };
      broadcastToChannel(`account:${trader.toLowerCase()}`, msg);
      _updateLeaderboard(trader, Number(ethers.formatUnits(pnl, 6)));
    });
    perp.on('PositionLiquidated', (posId, trader, liquidator, price) => {
      broadcastToChannel('liquidations', { type:'liquidation', data:{ posId:Number(posId), trader, liquidator, price:ethers.formatUnits(price,18) } });
    });
    perp.on('FundingSettled', (marketIndex, rate) => {
      broadcastToChannel('funding', { type:'funding', data:{ marketIndex:Number(marketIndex), rate:Number(rate)/10000 } });
    });
    console.log('✅ Chain event listeners attached');
  } catch(e) { console.warn('⚠️  Chain event listen failed (no RPC?):', e.message); }
}

let _lastCandleUpdate = {};
function _updateCandle(symbol, price) {
  const now = Date.now();
  if (_lastCandleUpdate[symbol] && now - _lastCandleUpdate[symbol] < 5000) return;
  _lastCandleUpdate[symbol] = now;
  const intervals = [['1m',60000],['5m',300000],['15m',900000],['1h',3600000],['4h',14400000],['1d',86400000]];
  for (const [interval, ms] of intervals) {
    const bucket = Math.floor(now/ms)*ms;
    const e = db.prepare('SELECT * FROM candles WHERE market=? AND interval=? AND open_time=?').get(symbol,interval,bucket);
    if (e) db.prepare('UPDATE candles SET high=MAX(high,?),low=MIN(low,?),close=?,volume=volume+1 WHERE market=? AND interval=? AND open_time=?').run(price,price,price,symbol,interval,bucket);
    else   db.prepare('INSERT OR IGNORE INTO candles VALUES(?,?,?,?,?,?,?,1)').run(symbol,interval,bucket,price,price,price,price);
  }
}

function _updateLeaderboard(address, pnl) {
  db.prepare(`INSERT INTO leaderboard(address,realized_pnl,trade_count,volume) VALUES(?,?,1,0)
    ON CONFLICT(address) DO UPDATE SET realized_pnl=realized_pnl+?,trade_count=trade_count+1,updated_at=unixepoch()`)
    .run(address.toLowerCase(), pnl, pnl);
}

// ── Start ─────────────────────────────────────────────────────
prices.start();
_listenChainEvents();

server.listen(PORT, () => {
  console.log(`\n🚀 Wikicious Backend`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   WS:  ws://localhost:${PORT}/ws`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

process.on('SIGINT', () => { prices.stop(); server.close(); process.exit(0); });
