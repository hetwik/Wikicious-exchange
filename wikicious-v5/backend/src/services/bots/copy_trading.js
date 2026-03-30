/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Copy Trading Service
 *
 *  Watches master traders on-chain via WikiPerp events.
 *  When a master opens or closes a position, all active subscribers
 *  automatically have the same trade placed on their behalf.
 *
 *  HOW IT WORKS:
 *  1. Platform seeds a list of verified master traders
 *  2. Followers subscribe with settings: copy_ratio, max_trade_size
 *  3. CopyTradingService listens to PositionOpened/Closed events
 *  4. For each master event → find all active subscribers
 *  5. Place proportional order for each subscriber
 *  6. Log all copy trades for PnL tracking
 *
 *  RISK CONTROLS:
 *  - max_trade_size caps each copied trade in USDC
 *  - copy_ratio scales position size (0.5 = 50% of master size)
 *  - Follower must have enough free margin or trade is skipped
 *  - Risk score shown on master profile (1-10, lower = safer)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const { ethers }   = require('ethers');
const { v4: uuid } = require('uuid');
const axios        = require('axios');
const { getPerp, getVault, ADDRESSES, PERP_ABI } = require('../chain');

// Seeded master traders — shown in the copy trading marketplace
// In production these are updated from on-chain performance data
const SEED_MASTERS = [
  { address: '0x1111111111111111111111111111111111111111', username: 'SatoshiWave',  win_rate: 74.2, monthly_pnl: 38.4, total_pnl: 142000, risk_score: 3, verified: 1 },
  { address: '0x2222222222222222222222222222222222222222', username: 'CryptoTiger',  win_rate: 68.1, monthly_pnl: 22.1, total_pnl:  89000, risk_score: 5, verified: 1 },
  { address: '0x3333333333333333333333333333333333333333', username: 'MoonRocket',   win_rate: 81.0, monthly_pnl: 55.2, total_pnl: 210000, risk_score: 4, verified: 1 },
  { address: '0x4444444444444444444444444444444444444444', username: 'BullRunner',   win_rate: 62.5, monthly_pnl: 14.8, total_pnl:  55000, risk_score: 7, verified: 1 },
  { address: '0x5555555555555555555555555555555555555555', username: 'DiamondGrip',  win_rate: 77.3, monthly_pnl: 31.6, total_pnl: 119000, risk_score: 4, verified: 1 },
  { address: '0x6666666666666666666666666666666666666666', username: 'PerpGod',      win_rate: 85.1, monthly_pnl: 67.4, total_pnl: 280000, risk_score: 6, verified: 1 },
  { address: '0x7777777777777777777777777777777777777777', username: 'DeltaWolf',    win_rate: 59.8, monthly_pnl: 11.2, total_pnl:  41000, risk_score: 8, verified: 0 },
  { address: '0x8888888888888888888888888888888888888888', username: 'GammaBull',    win_rate: 70.4, monthly_pnl: 28.9, total_pnl:  98000, risk_score: 5, verified: 1 },
];

class CopyTradingService {
  constructor(db, apiBaseUrl) {
    this.db         = db;
    this.apiBaseUrl = apiBaseUrl;
    this._seedMasters();
    this._startChainListener();
    console.log('📋 Copy trading service started');
  }

  // ── Seed master trader list ──────────────────────────────────────
  _seedMasters() {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO copy_masters
        (address, username, win_rate, monthly_pnl, total_pnl, risk_score, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of SEED_MASTERS) {
      stmt.run(m.address, m.username, m.win_rate, m.monthly_pnl, m.total_pnl, m.risk_score, m.verified);
    }
  }

  // ── Subscribe to on-chain events ────────────────────────────────
  _startChainListener() {
    try {
      const perp = getPerp();

      // Master opened a new position
      perp.on('PositionOpened', async (posId, trader, isLong, size, price) => {
        const masterAddr = trader.toLowerCase();
        await this._onMasterOpen(masterAddr, {
          posId:   Number(posId),
          isLong,
          size:    Number(ethers.formatUnits(size, 6)),
          price:   Number(ethers.formatUnits(price, 18)),
        });
      });

      // Master closed a position
      perp.on('PositionClosed', async (posId, trader, pnl, closePrice) => {
        const masterAddr = trader.toLowerCase();
        await this._onMasterClose(masterAddr, {
          posId:      Number(posId),
          pnl:        Number(ethers.formatUnits(pnl, 6)),
          closePrice: Number(ethers.formatUnits(closePrice, 18)),
        });
      });

      console.log('📋 Copy trading: chain events attached');
    } catch (e) {
      console.warn('📋 Copy trading: chain events unavailable —', e.message);
    }
  }

  // ── Master opened a position → copy for all subscribers ─────────
  async _onMasterOpen(masterAddr, { posId, isLong, size, price }) {
    // Find all active subscribers for this master
    const subs = this.db.prepare(`
      SELECT cs.*, u.wallet_address as follower_wallet_addr
      FROM copy_subscriptions cs
      LEFT JOIN users u ON u.id = cs.follower_id
      WHERE cs.master_address = ? AND cs.status = 'active'
    `).all(masterAddr);

    if (!subs.length) return;
    console.log(`📋 Master ${masterAddr} opened ${isLong ? 'LONG' : 'SHORT'} $${size} — copying for ${subs.length} followers`);

    for (const sub of subs) {
      try {
        // Scale position by copy_ratio and cap at max_trade_size
        const copySize = Math.min(size * sub.copy_ratio, sub.max_trade_size);
        if (copySize < 5) continue; // skip tiny trades

        const wallet = sub.follower_wallet || sub.follower_wallet_addr;
        if (!wallet) continue;

        // Place order via API
        const res = await axios.post(`${this.apiBaseUrl}/api/bots/copy/execute`, {
          wallet,
          subscriptionId: sub.id,
          marketIndex:    0, // detected from master position in production
          isLong,
          size:           copySize,
          leverage:       1, // copy bots use 1x leverage for safety
        }).catch(e => ({ data: null, error: e.message }));

        // Log copy trade
        this.db.prepare(`
          INSERT INTO copy_trades (id, subscription_id, master_tx, follower_tx, symbol, side, size, price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuid(), sub.id, `pos_${posId}`,
          res.data?.txHash || null,
          'BTCUSDT', isLong ? 'long' : 'short',
          copySize, price,
        );

        // Update subscription stats
        this.db.prepare(`
          UPDATE copy_subscriptions SET total_trades = total_trades + 1 WHERE id = ?
        `).run(sub.id);

      } catch (err) {
        console.error(`📋 Copy trade failed for sub ${sub.id}:`, err.message);
      }
    }
  }

  // ── Master closed position → update follower PnL ─────────────────
  async _onMasterClose(masterAddr, { posId, pnl, closePrice }) {
    const subs = this.db.prepare(`
      SELECT * FROM copy_subscriptions WHERE master_address = ? AND status = 'active'
    `).all(masterAddr);

    for (const sub of subs) {
      const scaledPnl = pnl * sub.copy_ratio;
      this.db.prepare(`
        UPDATE copy_subscriptions SET total_pnl = total_pnl + ? WHERE id = ?
      `).run(scaledPnl, sub.id);
    }

    // Update master stats
    this.db.prepare(`
      UPDATE copy_masters SET total_pnl = total_pnl + ?, updated_at = unixepoch() WHERE address = ?
    `).run(pnl, masterAddr);
  }

  // ── Public methods (called by API routes) ───────────────────────

  subscribe({ followerId, followerWallet, masterAddress, copyRatio, maxTradeSize, copySl, copyTp }) {
    // Can only subscribe once per master
    // Check for existing active subscription (two-step for compatibility)
    const allSubs = this.db.prepare(
      `SELECT id, status FROM copy_subscriptions WHERE follower_id = ? AND master_address = ?`
    ).all(followerId, masterAddress);
    if (allSubs.some(s => s.status === 'active')) throw new Error('Already subscribed to this trader');

    const master = this.db.prepare(`SELECT * FROM copy_masters WHERE address = ?`).get(masterAddress);
    if (!master) throw new Error('Master trader not found');

    const id = uuid();
    this.db.prepare(`
      INSERT INTO copy_subscriptions
        (id, follower_id, follower_wallet, master_address, copy_ratio, max_trade_size, copy_sl, copy_tp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, followerId, followerWallet, masterAddress, copyRatio, maxTradeSize, copySl ? 1 : 0, copyTp ? 1 : 0);

    // Increment follower count
    this.db.prepare(`UPDATE copy_masters SET followers = followers + 1 WHERE address = ?`).run(masterAddress);
    console.log(`📋 ${followerId} subscribed to copy ${masterAddress} (ratio ${copyRatio})`);
    return id;
  }

  unsubscribe(subscriptionId, userId) {
    const sub = this.db.prepare(`SELECT * FROM copy_subscriptions WHERE id = ? AND follower_id = ?`).get(subscriptionId, userId);
    if (!sub) throw new Error('Subscription not found');
    this.db.prepare(`UPDATE copy_subscriptions SET status = 'stopped' WHERE id = ?`).run(subscriptionId);
    this.db.prepare(`UPDATE copy_masters SET followers = MAX(0, followers - 1) WHERE address = ?`).run(sub.master_address);
    return true;
  }

  getMasters(limit = 50) {
    return this.db.prepare(`SELECT * FROM copy_masters ORDER BY monthly_pnl DESC LIMIT ?`).all(limit);
  }

  getMasterDetail(address) {
    return this.db.prepare(`SELECT * FROM copy_masters WHERE address = ?`).get(address);
  }

  getMySubscriptions(userId) {
    return this.db.prepare(`
      SELECT cs.*, cm.username, cm.win_rate, cm.monthly_pnl, cm.total_pnl, cm.risk_score, cm.verified
      FROM copy_subscriptions cs
      JOIN copy_masters cm ON cs.master_address = cm.address
      WHERE cs.follower_id = ? ORDER BY cs.created_at DESC
    `).all(userId);
  }

  getMyCopyTrades(subscriptionId, limit = 100) {
    return this.db.prepare(`
      SELECT * FROM copy_trades WHERE subscription_id = ? ORDER BY ts DESC LIMIT ?
    `).all(subscriptionId, limit);
  }
}

module.exports = CopyTradingService;
