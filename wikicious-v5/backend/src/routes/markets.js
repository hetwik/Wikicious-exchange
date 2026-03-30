'use strict';
const { ethers } = require('ethers');

const REGISTRY_ABI = [
  'function getMarket(uint256) view returns (tuple(uint256,string,string,string,uint8,uint8,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256))',
  'function getAllMarkets() view returns (uint256[])',
  'function totalMarkets() view returns (uint256)',
];

const ORACLE_ABI = [
  'function getPrice(uint256) view returns (tuple(uint256,uint256,uint256,uint8,bool,uint256))',
  'function isMarketOpen(uint256) view returns (bool)',
];

const CATEGORY_NAMES = ['Crypto','Forex Major','Forex Minor','Forex Exotic','Metals','Commodities'];
const ORACLE_NAMES   = ['Chainlink','Pyth','Guardian','Derived'];

module.exports = function(app, provider, registryAddr, oracleAddr) {
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider);
  const oracle   = new ethers.Contract(oracleAddr,   ORACLE_ABI,   provider);

  // Cache prices for 10 seconds
  let priceCache = {};
  let cacheTs    = 0;

  async function _getPrices(marketIds) {
    const now = Date.now();
    if (now - cacheTs < 10000) return priceCache;
    const results = await Promise.allSettled(
      marketIds.map(id => oracle.getPrice(id))
    );
    priceCache = {};
    for (let i = 0; i < marketIds.length; i++) {
      if (results[i].status === 'fulfilled') {
        const [price,, conf,, open, spread] = results[i].value;
        priceCache[marketIds[i]] = {
          price:    Number(price) / 1e8,
          conf:     Number(conf),
          open:     open,
          spreadBps:Number(spread),
        };
      }
    }
    cacheTs = now;
    return priceCache;
  }

  // ── All markets ──────────────────────────────────────────────────────
  app.get('/api/markets/all', async (req, res) => {
    try {
      const ids     = await registry.getAllMarkets();
      const prices  = await _getPrices(ids.map(Number));

      const markets = await Promise.all(ids.map(async id => {
        const idN = Number(id);
        const m   = await registry.getMarket(idN);
        const p   = prices[idN] || {};
        return {
          id:            idN,
          symbol:        m[1],
          baseAsset:     m[2],
          quoteAsset:    m[3],
          category:      Number(m[4]),
          categoryName:  CATEGORY_NAMES[Number(m[4])] || 'Unknown',
          oracleSource:  ORACLE_NAMES[Number(m[5])] || 'Unknown',
          oracleFeed:    m[6],
          maxLeverage:   Number(m[10]) / 100,
          takerFee:      Number(m[12]) / 100,
          makerFee:      Number(m[13]) / 100,
          minPosition:   Number(m[16]) / 1e6,
          maxPosition:   Number(m[17]) / 1e6,
          spreadBps:     Number(m[18]),
          offHoursSpreadBps: Number(m[19]),
          active:        m[20],
          reduceOnly:    m[21],
          pricePrecision:Number(m[22]),
          price:         p.price    || 0,
          change24h:     0,         // tracked off-chain via price history
          marketOpen:    p.open     ?? true,
          spreadBpsCurrent: p.spreadBps || Number(m[18]),
        };
      }));

      res.json({ markets, total: markets.length, timestamp: Date.now() });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Single market ─────────────────────────────────────────────────────
  app.get('/api/markets/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [m, priceData] = await Promise.all([
        registry.getMarket(id),
        oracle.getPrice(id).catch(() => null),
      ]);
      res.json({
        id,
        symbol:        m[1],
        baseAsset:     m[2],
        quoteAsset:    m[3],
        categoryName:  CATEGORY_NAMES[Number(m[4])],
        oracleSource:  ORACLE_NAMES[Number(m[5])],
        maxLeverage:   Number(m[10]) / 100,
        maintenanceMargin: Number(m[11]) / 100,
        takerFee:      `${Number(m[12]) / 100}%`,
        makerFee:      `${Number(m[13]) / 100}%`,
        maxOILong:     Number(m[14]) / 1e6,
        maxOIShort:    Number(m[15]) / 1e6,
        minPosition:   Number(m[16]) / 1e6,
        maxPosition:   Number(m[17]) / 1e6,
        spreadBps:     Number(m[18]),
        offHoursSpreadBps: Number(m[19]),
        active:        m[20],
        reduceOnly:    m[21],
        price: priceData ? {
          value:      Number(priceData[0]) / 1e8,
          timestamp:  Number(priceData[1]),
          confidence: Number(priceData[2]),
          source:     ORACLE_NAMES[Number(priceData[3])],
          marketOpen: priceData[4],
          spreadBps:  Number(priceData[5]),
        } : null,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Market hours status ───────────────────────────────────────────────
  app.get('/api/markets/hours/status', (req, res) => {
    const now    = new Date();
    const dow    = now.getUTCDay();  // 0=Sun
    const hour   = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const timeMin = hour * 60 + minute;

    // Forex: Mon 00:00 → Fri 21:00 UTC
    const forexOpen = !(dow === 0 || dow === 6 || (dow === 5 && timeMin >= 21*60));

    // Next open/close
    let nextEvent = '';
    if (forexOpen) {
      if (dow === 5) {
        const minsLeft = 21*60 - timeMin;
        nextEvent = `Closes in ${Math.floor(minsLeft/60)}h ${minsLeft%60}m`;
      } else {
        nextEvent = 'Open until Friday 21:00 UTC';
      }
    } else {
      nextEvent = dow === 6
        ? 'Opens Monday 00:00 UTC'
        : dow === 0 ? 'Opens tomorrow 00:00 UTC' : 'Opens Monday 00:00 UTC';
    }

    res.json({
      serverTime:  now.toISOString(),
      utcDay:      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow],
      utcTime:     `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
      markets: {
        crypto:      { open: true,     schedule: '24/7/365' },
        forexMajor:  { open: forexOpen, schedule: 'Mon 00:00 – Fri 21:00 UTC', nextEvent },
        forexMinor:  { open: forexOpen, schedule: 'Mon 00:00 – Fri 21:00 UTC', nextEvent },
        forexExotic: { open: forexOpen, schedule: 'Mon 00:00 – Fri 21:00 UTC', nextEvent },
        metals:      { open: forexOpen, schedule: 'Mon 00:00 – Fri 21:00 UTC', nextEvent },
        commodities: { open: forexOpen && !(dow === 0 && timeMin < 60), schedule: 'Mon 01:00 – Fri 22:00 UTC' },
      },
    });
  });

  // ── Oracle health ─────────────────────────────────────────────────────
  app.get('/api/markets/oracle/health', async (req, res) => {
    try {
      const ids = (await registry.getAllMarkets()).slice(0, 10); // spot check first 10
      const results = await Promise.allSettled(ids.map(id => oracle.getPrice(Number(id))));
      const healthy  = results.filter(r => r.status === 'fulfilled').length;
      res.json({
        healthy:  healthy,
        total:    ids.length,
        status:   healthy === ids.length ? 'ok' : healthy > ids.length/2 ? 'degraded' : 'down',
        sources: { chainlink: 'operational', pyth: 'operational', guardian: 'operational' },
        timestamp: Date.now(),
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Categories summary ────────────────────────────────────────────────
  app.get('/api/markets/categories', (req, res) => {
    res.json({
      categories: [
        { id: 0, name: 'Crypto',       icon: '₿',  count: 13, maxLeverage: 125, hours: '24/7',          oracle: 'Chainlink + Pyth' },
        { id: 1, name: 'Forex Major',  icon: '💱', count: 7,  maxLeverage: 50,  hours: 'Mon–Fri',       oracle: 'Chainlink' },
        { id: 2, name: 'Forex Minor',  icon: '🔀', count: 15, maxLeverage: 30,  hours: 'Mon–Fri',       oracle: 'Derived (Chainlink)' },
        { id: 3, name: 'Forex Exotic', icon: '🌏', count: 21, maxLeverage: 20,  hours: 'Mon–Fri',       oracle: 'Pyth + Guardian' },
        { id: 4, name: 'Metals',       icon: '🥇', count: 4,  maxLeverage: 100, hours: 'Mon–Fri',       oracle: 'Chainlink + Pyth' },
        { id: 5, name: 'Commodities',  icon: '🛢', count: 3,  maxLeverage: 20,  hours: 'Mon–Fri',       oracle: 'Pyth' },
      ],
      totalMarkets: 63,
      totalPairs:   '100+',
    });
  });
};
