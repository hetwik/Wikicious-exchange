'use strict';
const { ethers } = require('ethers');

const BONUS_ABI = [
  'function register(bytes32 referralCode) external',
  'function getBonusAccount(address) view returns (uint256,uint256,uint256,uint256,uint256,bool,bool,bool)',
  'function getReferralStats(address) view returns (uint256,uint256,uint256,uint256,uint256,bytes32)',
  'function getReferralLink(address) view returns (string)',
  'function resolveCode(bytes32) view returns (address)',
  'function claimRevShare() external',
  'function expireBonus(address) external',
  'function platformStats() view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
  'function getBonusBalance(address) view returns (uint256)',
  'function bonusSignup() view returns (uint256)',
  'function bonusDepositMatch() view returns (uint256)',
  'function bonusReferral() view returns (uint256)',
  'function bonusReferralStreak() view returns (uint256)',
  'event ReferralRegistered(address indexed referrer, address indexed referee, bytes32 code)',
  'event ReferralQualified(address indexed referrer, address indexed referee)',
  'event BonusGranted(address indexed user, uint256 amount, string reason)',
  'event RevShareEarned(address indexed referrer, address indexed referee, uint256 amount)',
];

module.exports = function(app, provider, bonusAddress) {
  const bonus = new ethers.Contract(bonusAddress, BONUS_ABI, provider);

  // ── Bonus account info ────────────────────────────────────────────────
  app.get('/api/bonus/:address', async (req, res) => {
    try {
      const addr = req.params.address;
      const [acc, ref, balance, stats] = await Promise.all([
        bonus.getBonusAccount(addr),
        bonus.getReferralStats(addr),
        bonus.getBonusBalance(addr),
        bonus.platformStats(),
      ]);

      res.json({
        address:            addr,
        creditBalance:      Number(balance) / 1e6,
        totalGranted:       Number(acc[1]) / 1e6,
        feesGenerated:      Number(acc[2]) / 1e6,
        expiresAt:          Number(acc[3]),
        daysLeft:           Number(acc[4]),
        signupClaimed:      acc[5],
        depositMatchClaimed:acc[6],
        isExpired:          acc[7],
        bonuses: {
          signup:       acc[5] ? { claimed: true, amount: 50 } : { claimed: false, amount: 50 },
          depositMatch: acc[6] ? { claimed: true, amount: 100 } : { claimed: false, amount: 100 },
        },
        referral: {
          totalReferrals:     Number(ref[0]),
          qualifiedReferrals: Number(ref[1]),
          totalBonusEarned:   Number(ref[2]) / 1e6,
          revenueShareEarned: Number(ref[3]) / 1e6,
          pendingRevShare:    Number(ref[4]) / 1e6,
          myCode:             ref[5],
        },
        platform: {
          totalUsers:    Number(stats[0]),
          bonusIssued:   Number(stats[1]) / 1e6,
          bonusExpired:  Number(stats[2]) / 1e6,
          bonusFees:     Number(stats[3]) / 1e6,
          revSharePaid:  Number(stats[4]) / 1e6,
        },
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Referral link ─────────────────────────────────────────────────────
  app.get('/api/bonus/referral-link/:address', async (req, res) => {
    try {
      const code = await bonus.getReferralLink(req.params.address);
      const baseUrl = process.env.APP_URL || 'https://wikicious.com';
      res.json({
        code,
        link:      `${baseUrl}/join?ref=${code}`,
        shareText: `Join Wikicious — get $50 free trading credit! Trade crypto perps with up to 125x leverage. Use my link: ${baseUrl}/join?ref=${code}`,
        tweetText: `🚀 Trading crypto on @Wikicious — the first decentralized prop trading platform!\n\nSign up with my link and get $50 FREE trading credit:\n${baseUrl}/join?ref=${code}\n\n#DeFi #CryptoTrading #Wikicious`,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Resolve referral code (before registration) ───────────────────────
  app.get('/api/bonus/resolve/:code', async (req, res) => {
    try {
      const code    = req.params.code;
      const bytes32 = code.startsWith('0x') ? code : `0x${code.padEnd(64, '0')}`;
      const referrer = await bonus.resolveCode(bytes32);
      if (referrer === ethers.ZeroAddress) return res.json({ valid: false });

      // Get referrer profile
      const refStats = await bonus.getReferralStats(referrer);
      res.json({
        valid:    true,
        referrer,
        stats: {
          qualifiedReferrals: Number(refStats[1]),
          bonusEarned:        Number(refStats[2]) / 1e6,
        },
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Referral leaderboard ──────────────────────────────────────────────
  // Indexed from events — top referrers
  app.get('/api/bonus/leaderboard/referrals', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      // Query ReferralQualified events
      const filter = bonus.filters.ReferralQualified();
      const events = await bonus.queryFilter(filter, -100000);
      
      // Tally referrers
      const counts = {};
      for (const ev of events) {
        const r = ev.args.referrer.toLowerCase();
        counts[r] = (counts[r] || 0) + 1;
      }

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(limit));

      const leaderboard = await Promise.all(sorted.map(async ([addr, count], i) => {
        const refStats = await bonus.getReferralStats(addr).catch(() => null);
        return {
          rank:               i + 1,
          address:            addr,
          qualifiedReferrals: count,
          bonusEarned:        refStats ? Number(refStats[2]) / 1e6 : 0,
          revenueShare:       refStats ? Number(refStats[3]) / 1e6 : 0,
        };
      }));

      res.json(leaderboard);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Platform viral stats (for marketing dashboard) ────────────────────
  app.get('/api/bonus/stats', async (req, res) => {
    try {
      const stats = await bonus.platformStats();
      const amounts = await Promise.all([
        bonus.bonusSignup(),
        bonus.bonusDepositMatch(),
        bonus.bonusReferral(),
        bonus.bonusReferralStreak(),
      ]);

      res.json({
        platform: {
          totalUsers:    Number(stats[0]),
          bonusIssued:   Number(stats[1]) / 1e6,
          bonusExpired:  Number(stats[2]) / 1e6,
          bonusFees:     Number(stats[3]) / 1e6,
          revSharePaid:  Number(stats[4]) / 1e6,
          activeBonus:   Number(stats[5]) / 1e6,
        },
        bonusAmounts: {
          signup:         Number(amounts[0]) / 1e6,
          depositMatch:   Number(amounts[1]) / 1e6,
          referral:       Number(amounts[2]) / 1e6,
          referralStreak: Number(amounts[3]) / 1e6,
        },
        feeRate:    '0.10% on bonus trades',
        expiry:     '90 days',
        revShare:   '10% of referee trading fees forever',
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Marketing campaign tracker ────────────────────────────────────────
  app.get('/api/bonus/growth', async (req, res) => {
    try {
      // BonusGranted events in last 30 days
      const since     = Math.floor(Date.now()/1000) - 30 * 86400;
      const filter    = bonus.filters.BonusGranted();
      const events    = await bonus.queryFilter(filter, -200000);
      
      const daily = {};
      let signups = 0, deposits = 0, referrals = 0;

      for (const ev of events) {
        const block   = await ev.getBlock();
        const day     = new Date(block.timestamp * 1000).toISOString().slice(0, 10);
        daily[day]    = (daily[day] || 0) + 1;
        const reason  = ev.args.reason;
        if (reason === 'signup')         signups++;
        else if (reason === 'deposit_match') deposits++;
        else if (reason.includes('referral')) referrals++;
      }

      res.json({
        last30Days: {
          newUsers:  signups,
          deposits:  deposits,
          referrals: referrals,
          daily:     Object.entries(daily).map(([date, count]) => ({ date, count })).slice(-30),
        },
        viralCoefficient: signups > 0 ? (referrals / signups).toFixed(2) : '0',
        // k-factor: avg new users each user brings
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
};
