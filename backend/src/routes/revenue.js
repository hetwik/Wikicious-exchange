'use strict';
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

// Minimal ABIs for revenue reading
const GMX_BACKSTOP_ABI = [
  'function revenueStats() view returns (uint256 feesCollected, uint256 volumeRouted, uint256 averageFeeRate)',
  'function totalFeesEarned() view returns (uint256)',
  'function totalVolumeRouted() view returns (uint256)',
  'function estimateRevenue(uint256 tradeSize) view returns (uint256 wikRevenue, uint256 gmxCost, uint256 net)',
];
const SPOT_ROUTER_ABI = [
  'function revenueStats() view returns (uint256 spreadEarned, uint256 volumeProcessed, uint256 currentSpreadBps, uint256 effectiveAPR)',
  'function tokenFeesEarned(address token) view returns (uint256)',
];
const VAULT_ABI = [
  'function protocolFees() view returns (uint256)',
  'function insuranceFund() view returns (uint256)',
  'function totalDeposits() view returns (uint256)',
];
const PERP_ABI = [
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256) view returns (tuple(bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,int256,uint256,uint256,uint256,bool))',
];

function makeRouter(address, abi) {
  if (!address) return null;
  return new ethers.Contract(address, abi, getProvider());
}

// ── Revenue routes ────────────────────────────────────────────
module.exports = function(app, db) {

  // Complete revenue overview
  app.get('/api/revenue', async (req, res) => {
    try {
      const [perpRevenue, spotRevenue, vaultRevenue, perpOI] = await Promise.allSettled([
        getPerpRevenue(),
        getSpotRevenue(),
        getVaultRevenue(),
        getPerpOI(),
      ]);

      const perp  = perpRevenue.status  === 'fulfilled' ? perpRevenue.value  : {};
      const spot  = spotRevenue.status  === 'fulfilled' ? spotRevenue.value  : {};
      const vault = vaultRevenue.status === 'fulfilled' ? vaultRevenue.value : {};
      const oi    = perpOI.status       === 'fulfilled' ? perpOI.value       : {};

      // Total fees = vault protocol fees (collected from all sources)
      const totalFees = (
        parseFloat(vault.protocolFees || 0) +
        parseFloat(spot.spreadEarned  || 0)
      ).toFixed(6);

      res.json({
        summary: {
          totalProtocolFees:   vault.protocolFees  || '0',
          spotSpreadEarned:    spot.spreadEarned   || '0',
          totalFeesAllSources: totalFees,
          insuranceFund:       vault.insuranceFund  || '0',
          totalDeposits:       vault.totalDeposits  || '0',
        },
        perp: {
          volumeRoutedToGMX:   perp.volumeRouted   || '0',
          feesFromGMXTrades:   perp.feesCollected  || '0',
          openInterestLong:    oi.oiLong            || '0',
          openInterestShort:   oi.oiShort           || '0',
          activeMarkets:       oi.marketCount       || 0,
        },
        spot: {
          volumeProcessed:     spot.volumeProcessed || '0',
          spreadEarned:        spot.spreadEarned    || '0',
          currentSpreadBps:    spot.currentSpreadBps || 15,
          routedViaUniswap:    true,
        },
        revenueStreams: [
          {
            name:        'Perp Taker Fees (orderbook)',
            rate:        '0.05%',
            description: 'Charged on every market order — highest margin, no external cost',
            estimatedMonthly: _estimateMonthly(oi.oiLong || '0', 0.0005),
          },
          {
            name:        'Perp Maker Fees (limit orders)',
            rate:        '0.02%',
            description: 'Charged when limit orders are filled',
            estimatedMonthly: _estimateMonthly(oi.oiLong || '0', 0.0002),
          },
          {
            name:        'GMX Backstop Routing',
            rate:        '0.05% (net ~0.00%)',
            description: 'Wikicious fee collected upfront. GMX absorbs large orders. Net near zero but enables unlimited size.',
            estimatedMonthly: _estimateMonthly(perp.volumeRouted || '0', 0.0000),
          },
          {
            name:        'Spot Spread (Uniswap routing)',
            rate:        '0.15%',
            description: 'Spread captured on every spot swap. Uniswap executes, we keep the spread.',
            estimatedMonthly: _estimateMonthly(spot.volumeProcessed || '0', 0.0015),
          },
          {
            name:        'WIK Token Fee Discounts',
            rate:        'N/A',
            description: 'Traders buy and hold WIK to get fee discounts — creates protocol revenue indirectly via token demand',
            estimatedMonthly: null,
          },
        ],
        howRevenueWorks: {
          orderbookMatch: 'Two traders match → Wikicious keeps full 0.05% taker fee. No external protocol involved.',
          gmxBackstop:    'Large order → Wikicious collects 0.05% fee FIRST, then routes remainder to GMX V5. GMX V5 pool absorbs the size. Wikicious keeps its cut regardless.',
          spotSwap:       'Trader wants to swap USDC→ETH → we get Uniswap quote, charge user 0.15% wider spread, execute on Uniswap, pocket the difference.',
          uiFees:         'WikiGMXBackstop passes our address as uiFeeReceiver to GMX, earning additional UI fees from GMX\'s own fee system.',
        }
      });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Simulate revenue for a given monthly volume
  app.get('/api/revenue/simulate', (req, res) => {
    const monthlyVolume = parseFloat(req.query.volume || 10_000_000); // default $10M/month

    const perpTakerFee  = monthlyVolume * 0.60 * 0.0005; // 60% of volume is taker
    const perpMakerFee  = monthlyVolume * 0.40 * 0.0002; // 40% maker
    const spotVolume    = monthlyVolume * 0.15;           // spot = 15% of total
    const spotSpread    = spotVolume * 0.0015;
    const total         = perpTakerFee + perpMakerFee + spotSpread;
    const annualized    = total * 12;

    res.json({
      assumptions: {
        monthlyPerpVolume: `$${(monthlyVolume * 0.85).toLocaleString()}`,
        monthlySpotVolume: `$${(monthlyVolume * 0.15).toLocaleString()}`,
        takerRatio:        '60%',
        makerRatio:        '40%',
        perpTakerFee:      '0.05%',
        perpMakerFee:      '0.02%',
        spotSpread:        '0.15%',
      },
      monthlyRevenue: {
        perpTakerFees:     `$${perpTakerFee.toFixed(0)}`,
        perpMakerFees:     `$${perpMakerFee.toFixed(0)}`,
        spotSpread:        `$${spotSpread.toFixed(0)}`,
        total:             `$${total.toFixed(0)}`,
      },
      annualizedRevenue:   `$${annualized.toFixed(0)}`,
      context: {
        dYdXMonthly:      '$5M–$15M (at $10B+ monthly volume)',
        gmxMonthly:       '$2M–$5M (at $1B–$3B monthly volume)',
        wikiciousTarget:  `$${(monthlyVolume / 1_000_000).toFixed(0)}M monthly volume → $${total.toFixed(0)}/month`,
      }
    });
  });

  // Revenue from DB (indexed on-chain events)
  app.get('/api/revenue/history', (req, res) => {
    const days = parseInt(req.query.days || 30);
    const cutoff = Math.floor(Date.now()/1000) - days * 86400;
    const rows = db.prepare(`
      SELECT date(ts, 'unixepoch') as day,
             COUNT(*) as trades,
             SUM(price * size * 0.0005) as fees_earned,
             SUM(price * size) as volume
      FROM trades_index
      WHERE ts >= ?
      GROUP BY day
      ORDER BY day DESC
    `).all(cutoff);
    res.json(rows);
  });
};

// ── Helpers ───────────────────────────────────────────────────
async function getPerpRevenue() {
  const addr = process.env.GMX_BACKSTOP_ADDRESS || ADDRESSES.WikiGMXBackstop;
  if (!addr) return {};
  const c = makeRouter(addr, GMX_BACKSTOP_ABI);
  const [fees, vol] = await Promise.all([
    c.totalFeesEarned().catch(() => 0n),
    c.totalVolumeRouted().catch(() => 0n),
  ]);
  return {
    feesCollected: ethers.formatUnits(fees, 6),
    volumeRouted:  ethers.formatUnits(vol, 6),
  };
}

async function getSpotRevenue() {
  const addr = process.env.SPOT_ROUTER_ADDRESS || ADDRESSES.WikiSpotRouter;
  if (!addr) return {};
  const c = makeRouter(addr, SPOT_ROUTER_ABI);
  const stats = await c.revenueStats().catch(() => null);
  if (!stats) return {};
  return {
    spreadEarned:     ethers.formatUnits(stats.spreadEarned, 6),
    volumeProcessed:  ethers.formatUnits(stats.volumeProcessed, 6),
    currentSpreadBps: Number(stats.currentSpreadBps),
  };
}

async function getVaultRevenue() {
  const addr = process.env.VAULT_ADDRESS || ADDRESSES.WikiVault;
  if (!addr) return {};
  const c = makeRouter(addr, VAULT_ABI);
  const [fees, ins, dep] = await Promise.all([
    c.protocolFees().catch(() => 0n),
    c.insuranceFund().catch(() => 0n),
    c.totalDeposits().catch(() => 0n),
  ]);
  return {
    protocolFees:  ethers.formatUnits(fees, 6),
    insuranceFund: ethers.formatUnits(ins, 6),
    totalDeposits: ethers.formatUnits(dep, 6),
  };
}

async function getPerpOI() {
  const addr = process.env.PERP_ADDRESS || ADDRESSES.WikiPerp;
  if (!addr) return {};
  const c = makeRouter(addr, PERP_ABI);
  const count = await c.marketCount().catch(() => 0n);
  let oiLong = 0n, oiShort = 0n;
  for (let i = 0; i < Math.min(Number(count), 20); i++) {
    try {
      const mkt = await c.getMarket(i);
      oiLong  += mkt[8];  // openInterestLong
      oiShort += mkt[9];  // openInterestShort
    } catch {}
  }
  return {
    oiLong:      ethers.formatUnits(oiLong, 6),
    oiShort:     ethers.formatUnits(oiShort, 6),
    marketCount: Number(count),
  };
}

function _estimateMonthly(currentVolume, feeBps) {
  const vol = parseFloat(currentVolume || 0);
  if (vol === 0) return null;
  const daily   = vol * feeBps;
  const monthly = daily * 30;
  return `$${monthly.toFixed(2)}/month`;
}

function makeRouter(address, abi) {
  if (!address) return null;
  return new ethers.Contract(address, abi, getProvider());
}
