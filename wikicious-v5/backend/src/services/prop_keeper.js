'use strict';
const { ethers } = require('ethers');

const EVAL_ABI = [
  'event EvalStarted(uint256 indexed evalId, address indexed trader, uint8 tier, uint256 size, uint256 fee)',
  'event EvalPassed(uint256 indexed evalId, address indexed trader, uint256 fundedAccountId)',
  'event EvalFailed(uint256 indexed evalId, address indexed trader, string reason)',
  'event EvalBreached(uint256 indexed evalId, address indexed trader, string reason, uint256 loss)',
  'event BalanceUpdated(uint256 indexed evalId, uint256 newBalance, int256 pnl)',
  'function checkExpiry(uint256 evalId) external',
  'function recordTrade(uint256 evalId, int256 tradePnl) external',
  'function getEval(uint256 id) view returns (tuple(address,uint8,uint8,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint256,string))',
  'function totalEvals() view returns (uint256)',
  'function evalProgress(uint256 evalId) view returns (uint256,uint256,uint256,uint256,uint256,bool)',
];

const FUNDED_ABI = [
  'event FundedAccountCreated(uint256 indexed accountId, address indexed trader, uint256 size, uint8 tier)',
  'event PositionClosed(uint256 indexed accountId, uint256 posId, int256 pnl)',
  'event AccountBreached(uint256 indexed accountId, address indexed trader, string reason, uint256 loss)',
  'event SplitUpgraded(uint256 indexed accountId, address indexed trader, uint256 newSplitBps)',
  'function checkBreach(uint256 accountId) external',
  'function getAccount(uint256 id) view returns (tuple(address,uint8,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint256,uint256,string))',
  'function accountStats(uint256 id) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
  'function totalFundedAccounts() view returns (uint256)',
];

const PERP_ABI = [
  'event PositionClosed(uint256 indexed posId, address indexed trader, int256 pnl)',
  'function getPosition(uint256 posId) view returns (address,uint256,bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)',
];

const POOL_ABI = [
  'function poolStats() view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
  'function availableCapital() view returns (uint256)',
  'function utilizationRate() view returns (uint256)',
  'function wplPrice() view returns (uint256)',
];

class PropKeeper {
  constructor(provider, signer, addresses) {
    this.provider = provider;
    this.signer   = signer;
    this.eval     = new ethers.Contract(addresses.eval,   EVAL_ABI,   signer);
    this.funded   = new ethers.Contract(addresses.funded, FUNDED_ABI, signer);
    this.perp     = new ethers.Contract(addresses.perp,   PERP_ABI,   provider);
    this.pool     = new ethers.Contract(addresses.pool,   POOL_ABI,   provider);

    // Track active evals and funded accounts
    this.activeEvals    = new Set();
    this.activeFunded   = new Set();

    // Eval → funded account mapping (for P&L recording)
    this.evalToFunded   = new Map(); // evalId → accountId
    this.traderToEval   = new Map(); // trader → evalId

    console.log('[prop-keeper] initialized');
  }

  // ── Start keeper ──────────────────────────────────────────────────────
  async start() {
    await this._loadExistingAccounts();
    this._listenToEvents();
    this._startHeartbeat();
    console.log('[prop-keeper] running');
  }

  // ── Load existing state ────────────────────────────────────────────────
  async _loadExistingAccounts() {
    try {
      const totalEvals   = Number(await this.eval.totalEvals());
      const totalFunded  = Number(await this.funded.totalFundedAccounts());

      for (let i = 1; i <= totalEvals; i++) {
        const e = await this.eval.getEval(i);
        if (e[3] === 0) this.activeEvals.add(i); // status 0 = Active
      }

      for (let i = 1; i <= totalFunded; i++) {
        const a = await this.funded.getAccount(i);
        if (a[2] === 0) this.activeFunded.add(i); // status 0 = Active
      }

      console.log(`[prop-keeper] loaded ${this.activeEvals.size} active evals, ${this.activeFunded.size} funded accounts`);
    } catch(e) {
      console.error('[prop-keeper] load error:', e.message);
    }
  }

  // ── Listen to contract events ──────────────────────────────────────────
  _listenToEvents() {
    // Track new evals
    this.eval.on('EvalStarted', (evalId, trader) => {
      this.activeEvals.add(Number(evalId));
      this.traderToEval.set(trader.toLowerCase(), Number(evalId));
      console.log(`[prop-keeper] eval started #${evalId} by ${trader.slice(0,8)}`);
    });

    this.eval.on('EvalPassed', (evalId, trader, fundedId) => {
      this.activeEvals.delete(Number(evalId));
      this.activeFunded.add(Number(fundedId));
      this.evalToFunded.set(Number(evalId), Number(fundedId));
      console.log(`[prop-keeper] eval #${evalId} PASSED → funded account #${fundedId}`);
    });

    this.eval.on('EvalFailed', (evalId, trader, reason) => {
      this.activeEvals.delete(Number(evalId));
      console.log(`[prop-keeper] eval #${evalId} FAILED: ${reason}`);
    });

    this.funded.on('FundedAccountCreated', (accountId, trader, size) => {
      this.activeFunded.add(Number(accountId));
      console.log(`[prop-keeper] funded account #${accountId} created, size $${Number(size)/1e6}`);
    });

    this.funded.on('AccountBreached', (accountId, trader, reason, loss) => {
      this.activeFunded.delete(Number(accountId));
      console.log(`[prop-keeper] account #${accountId} BREACHED: ${reason}, loss $${Number(loss)/1e6}`);
    });

    // Key: when a WikiPerp position closes, record P&L to the eval account
    this.perp.on('PositionClosed', async (posId, trader, pnl) => {
      const evalId = this.traderToEval.get(trader.toLowerCase());
      if (evalId) {
        try {
          const tx = await this.eval.recordTrade(evalId, pnl);
          await tx.wait();
          console.log(`[prop-keeper] recorded trade pnl ${ethers.formatUnits(pnl, 6)} USDC for eval #${evalId}`);
        } catch(e) {
          console.error('[prop-keeper] recordTrade error:', e.message);
        }
      }
    });
  }

  // ── Heartbeat: check expiries and breaches every minute ───────────────
  _startHeartbeat() {
    setInterval(async () => {
      await this._checkEvalExpiries();
      await this._checkFundedBreaches();
    }, 60 * 1000); // every 60 seconds

    // Stats log every 5 min
    setInterval(() => this._logStats(), 5 * 60 * 1000);
  }

  async _checkEvalExpiries() {
    const batch = [...this.activeEvals].slice(0, 20); // process 20 at a time
    for (const evalId of batch) {
      try {
        const gas = await this.eval.checkExpiry.estimateGas(evalId);
        if (gas > 0) {
          const tx = await this.eval.checkExpiry(evalId, { gasLimit: gas + 50000n });
          await tx.wait();
        }
      } catch(e) {
        // Not expired — normal
      }
    }
  }

  async _checkFundedBreaches() {
    const batch = [...this.activeFunded].slice(0, 20);
    for (const accountId of batch) {
      try {
        const tx = await this.funded.checkBreach(accountId, { gasLimit: 300000n });
        await tx.wait();
      } catch(e) {
        // No breach — normal
      }
    }
  }

  async _logStats() {
    try {
      const stats  = await this.pool.poolStats();
      const avail  = await this.pool.availableCapital();
      const util   = await this.pool.utilizationRate();
      const price  = await this.pool.wplPrice();
      console.log(`[prop-keeper] Pool TVL: $${Number(stats[0])/1e6} | Utilized: $${Number(stats[1])/1e6} | Util: ${Number(util)/100}% | WPL: $${Number(price)/1e18}`);
      console.log(`[prop-keeper] Active evals: ${this.activeEvals.size} | Active funded: ${this.activeFunded.size}`);
    } catch(e) {}
  }

  // ── API methods (used by backend routes) ──────────────────────────────
  async getEvalStatus(evalId) {
    const [e, progress] = await Promise.all([
      this.eval.getEval(evalId),
      this.eval.evalProgress(evalId),
    ]);
    return {
      id:           Number(e[0] ?? evalId),
      trader:       e[0],
      tier:         Number(e[1]),
      phase:        Number(e[2]),
      status:       ['Active', 'Passed', 'Failed', 'Expired'][Number(e[3])],
      accountSize:  Number(e[4]) / 1e6,
      currentBalance: Number(e[6]) / 1e6,
      peakBalance:  Number(e[7]) / 1e6,
      feePaid:      Number(e[13]) / 1e6,
      realizedPnl:  Number(e[14]) / 1e6,
      totalTrades:  Number(e[15]),
      breached:     e[16],
      breachReason: e[18],
      progress: {
        profitPct:        Number(progress[0]) / 100,
        targetPct:        Number(progress[1]) / 100,
        dailyDDUsed:      Number(progress[2]) / 100,
        totalDDUsed:      Number(progress[3]) / 100,
        daysRemaining:    Number(progress[4]),
        onTrack:          progress[5],
      },
    };
  }

  async getFundedAccountStatus(accountId) {
    const [a, stats] = await Promise.all([
      this.funded.getAccount(accountId),
      this.funded.accountStats(accountId),
    ]);
    return {
      id:             accountId,
      trader:         a[0],
      tier:           Number(a[1]),
      status:         ['Active', 'Breached', 'Closed', 'Scaled'][Number(a[2])],
      accountSize:    Number(a[3]) / 1e6,
      currentBalance: Number(a[6]) / 1e6,
      traderSplitBps: Number(a[10]),
      cumulativeProfit: Number(a[11]) / 1e6,
      totalTrades:    Number(a[14]),
      createdAt:      Number(a[15]),
      closeReason:    a[18],
      stats: {
        profit:         Number(stats[0]) / 1e6,
        profitPct:      Number(stats[1]) / 100,
        traderCut:      Number(stats[2]) / 1e6,
        poolCut:        Number(stats[3]) / 1e6,
        dailyDDUsed:    Number(stats[4]) / 100,
        totalDDUsed:    Number(stats[5]) / 100,
        nextSplitAt:    Number(stats[6]) / 1e6,
      },
    };
  }

  async getPoolStats() {
    const [stats, avail, util, price] = await Promise.all([
      this.pool.poolStats(),
      this.pool.availableCapital(),
      this.pool.utilizationRate(),
      this.pool.wplPrice(),
    ]);
    return {
      tvl:              Number(stats[0]) / 1e6,
      utilized:         Number(stats[1]) / 1e6,
      insurance:        Number(stats[2]) / 1e6,
      apy:              Number(stats[3]) / 100,
      utilizationRate:  Number(util) / 100,
      availableCapital: Number(avail) / 1e6,
      wplPrice:         Number(price) / 1e18,
      activeEvals:      this.activeEvals.size,
      activeFunded:     this.activeFunded.size,
    };
  }
}

// ── Start keeper ──────────────────────────────────────────────────────────
if (require.main === module) {
  const { config } = require('../config');
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const signer   = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY, provider);

  const keeper = new PropKeeper(provider, signer, {
    eval:   process.env.PROP_EVAL_ADDRESS,
    funded: process.env.PROP_FUNDED_ADDRESS,
    pool:   process.env.PROP_POOL_ADDRESS,
    perp:   config.contracts.wikiPerp,
  });

  keeper.start().catch(console.error);
  module.exports = keeper;
} else {
  module.exports = PropKeeper;
}
