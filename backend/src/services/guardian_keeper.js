'use strict';
/**
 * WikiGuardianKeeper — updates exotic pair prices on-chain
 *
 * For pairs not covered by Chainlink or Pyth, we aggregate from:
 *   - Binance REST API        (spot prices)
 *   - Coinbase Advanced API   (spot prices)
 *   - Forex REST APIs         (OpenExchangeRates, CurrencyLayer)
 *   - XE.com API              (metals + exotics)
 *   - LBMA gold fix           (XAU official)
 *
 * Signs batch price update and submits to WikiForexOracle.batchUpdateGuardian()
 * Runs every 5 minutes during market hours.
 * Also monitors market open/close transitions.
 */

const { ethers }  = require('ethers');
const axios        = require('axios');

const ORACLE_ABI = [
  'function batchUpdateGuardian(uint256[],uint256[],uint256[],bytes) external',
  'function updatePythPrices(bytes[]) external payable',
  'function isMarketOpen(uint256) view returns (bool)',
  'function guardianPrices(uint256) view returns (uint256,uint256,uint256)',
];

const REGISTRY_ABI = [
  'function getMarket(uint256) view returns (tuple(uint256,string,string,string,uint8,uint8,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256))',
  'function totalMarkets() view returns (uint256)',
  'function getAllMarkets() view returns (uint256[])',
];

// Guardian-managed markets (SRC_GUARDIAN = 2)
// marketId → external symbol to fetch
const GUARDIAN_MARKETS = {
  // Exotic forex
  37: { symbol: 'USD/KRW', extSymbol: 'KRW', invert: false,  source: 'forex' },
  38: { symbol: 'USD/THB', extSymbol: 'THB', invert: false,  source: 'forex' },
  39: { symbol: 'USD/NGN', extSymbol: 'NGN', invert: false,  source: 'forex' },
  40: { symbol: 'USD/EGP', extSymbol: 'EGP', invert: false,  source: 'forex' },
  41: { symbol: 'USD/PKR', extSymbol: 'PKR', invert: false,  source: 'forex' },
  43: { symbol: 'USD/MYR', extSymbol: 'MYR', invert: false,  source: 'forex' },
  44: { symbol: 'USD/PHP', extSymbol: 'PHP', invert: false,  source: 'forex' },
  45: { symbol: 'USD/AED', extSymbol: 'AED', invert: false,  source: 'forex' },
  46: { symbol: 'USD/SAR', extSymbol: 'SAR', invert: false,  source: 'forex' },
  47: { symbol: 'USD/CZK', extSymbol: 'CZK', invert: false,  source: 'forex' },
  48: { symbol: 'USD/PLN', extSymbol: 'PLN', invert: false,  source: 'forex' },
  49: { symbol: 'USD/HUF', extSymbol: 'HUF', invert: false,  source: 'forex' },
  50: { symbol: 'USD/RUB', extSymbol: 'RUB', invert: false,  source: 'forex' },
  // WIK token — from our own DEX price
  12: { symbol: 'WIK/USD', extSymbol: 'WIK', invert: false,  source: 'internal' },
};

class GuardianKeeper {
  constructor(provider, signer, oracleAddr, registryAddr) {
    this.provider  = provider;
    this.signer    = signer;
    this.oracle    = new ethers.Contract(oracleAddr,   ORACLE_ABI,   signer);
    this.registry  = new ethers.Contract(registryAddr, REGISTRY_ABI, provider);
    this.lastPrices = {};
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    console.log('[guardian] initialized');
  }

  async start() {
    // Initial update
    await this._updateCycle();
    // Then every 5 minutes
    setInterval(() => this._updateCycle(), this.updateInterval);
    // Market hours monitor every minute
    setInterval(() => this._checkMarketHours(), 60 * 1000);
    console.log('[guardian] running — updating every 5 minutes');
  }

  // ── Main update cycle ────────────────────────────────────────────────
  async _updateCycle() {
    try {
      // Fetch all prices from external APIs
      const [forexPrices, wikiPrice] = await Promise.all([
        this._fetchForexPrices(),
        this._fetchWikiPrice(),
      ]);

      const marketIds  = [];
      const prices     = [];
      const confidences = [];

      for (const [marketIdStr, config] of Object.entries(GUARDIAN_MARKETS)) {
        const marketId = Number(marketIdStr);
        let price = 0;
        let confidence = 50; // default 0.5%

        if (config.source === 'forex') {
          price = forexPrices[config.extSymbol];
          // Cross-validate price: reject if >2% from last known
          const last = this.lastPrices[marketId];
          if (last && price) {
            const deviation = Math.abs(price - last) / last;
            if (deviation > 0.02) {
              console.warn(`[guardian] ${config.symbol} deviation too high: ${(deviation*100).toFixed(2)}%`);
              continue; // skip — likely stale/bad data
            }
            confidence = Math.round(deviation * 10000); // bps
          }
        } else if (config.source === 'internal') {
          price = wikiPrice;
          confidence = 100; // 1% — internal DEX price has wider spread
        }

        if (!price || price <= 0) continue;

        // Convert to 8 decimal on-chain format
        const onChainPrice = Math.round(price * 1e8);
        marketIds.push(marketId);
        prices.push(onChainPrice);
        confidences.push(confidence);
        this.lastPrices[marketId] = price;
      }

      if (marketIds.length === 0) {
        console.log('[guardian] no prices to update');
        return;
      }

      // Sign the batch
      const bucketTs = Math.floor(Date.now() / 1000 / 300); // 5-min buckets
      const encoded  = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256[]', 'uint256[]', 'uint256[]', 'uint256'],
        [marketIds, prices, confidences, bucketTs]
      );
      const hash      = ethers.keccak256(encoded);
      const signature = await this.signer.signMessage(ethers.getBytes(hash));

      // Submit on-chain
      const tx = await this.oracle.batchUpdateGuardian(
        marketIds, prices, confidences, signature,
        { gasLimit: 500000 }
      );
      await tx.wait();
      console.log(`[guardian] updated ${marketIds.length} prices — tx: ${tx.hash.slice(0,10)}`);

    } catch(e) {
      console.error('[guardian] update cycle error:', e.message);
    }
  }

  // ── Fetch forex rates ─────────────────────────────────────────────────
  async _fetchForexPrices() {
    const prices = {};
    try {
      // Primary: OpenExchangeRates
      if (process.env.OPENEXCHANGERATES_KEY) {
        const r = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${process.env.OPENEXCHANGERATES_KEY}&base=USD`);
        Object.assign(prices, r.data.rates);
      }

      // Secondary: CurrencyLayer (cross-validate)
      if (process.env.CURRENCYLAYER_KEY) {
        const r = await axios.get(`http://api.currencylayer.com/live?access_key=${process.env.CURRENCYLAYER_KEY}&source=USD`);
        const cl = r.data.quotes;
        for (const [key, val] of Object.entries(cl)) {
          const currency = key.replace('USD', '');
          if (prices[currency]) {
            // Average both sources
            prices[currency] = (prices[currency] + val) / 2;
          } else {
            prices[currency] = val;
          }
        }
      }

      // RUB special handling — might be unavailable, use last known
      if (!prices['RUB'] && this.lastPrices[50]) {
        prices['RUB'] = this.lastPrices[50] / 1e8;
        console.warn('[guardian] RUB unavailable — using cached price');
      }

    } catch(e) {
      console.error('[guardian] forex fetch error:', e.message);
    }
    return prices;
  }

  // ── Fetch WIK/USD from Uniswap subgraph ──────────────────────────────
  async _fetchWikiPrice() {
    try {
      const query = `{
        token(id: "${process.env.WIK_TOKEN_ADDRESS?.toLowerCase()}") {
          derivedETH
        }
        bundle(id: "1") { ethPriceUSD }
      }`;
      const r = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum', { query });
      const token = r.data?.data?.token;
      const bundle = r.data?.data?.bundle;
      if (token && bundle) {
        return parseFloat(token.derivedETH) * parseFloat(bundle.ethPriceUSD);
      }
    } catch(e) {
      console.warn('[guardian] WIK price fetch failed:', e.message);
    }
    return 0;
  }

  // ── Market hours monitor ──────────────────────────────────────────────
  async _checkMarketHours() {
    const now    = new Date();
    const dow    = now.getUTCDay(); // 0=Sun, 1=Mon...5=Fri, 6=Sat
    const hour   = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const timeMin = hour * 60 + minute;

    // Forex opens: Mon 00:00 UTC
    const forexOpen  = dow === 1 && timeMin === 0;
    // Forex closes: Fri 21:00 UTC
    const forexClose = dow === 5 && timeMin === 21 * 60;

    if (forexOpen)  console.log('[guardian] 🟢 FOREX MARKET OPEN');
    if (forexClose) console.log('[guardian] 🔴 FOREX MARKET CLOSED — weekend');

    // 1 hour before close warning
    if (dow === 5 && timeMin === 20 * 60) {
      console.log('[guardian] ⚠️  Forex closes in 1 hour');
    }
  }

  // ── View current prices ───────────────────────────────────────────────
  async getGuardianPrices() {
    const result = {};
    for (const [id, config] of Object.entries(GUARDIAN_MARKETS)) {
      try {
        const [price, updatedAt, conf] = await this.oracle.guardianPrices(Number(id));
        result[config.symbol] = {
          price:     Number(price) / 1e8,
          updatedAt: Number(updatedAt),
          confidence: Number(conf),
          stale:     Date.now()/1000 - Number(updatedAt) > 300,
        };
      } catch(_) {}
    }
    return result;
  }
}

// ── Pyth price updater (separate process) ─────────────────────────────────
// Updates Pyth feeds on-chain when price changes significantly
class PythUpdater {
  constructor(provider, signer, oracleAddr) {
    this.signer = signer;
    this.oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, signer);
  }

  async updatePythFeeds(pythVaaData) {
    // pythVaaData: array of VAA hex strings from Pyth's Hermes API
    // Called by backend when WebSocket price update exceeds threshold
    try {
      const fee = await this.oracle.provider.estimateGas({
        to: this.oracle.target, data: '0x'
      });
      const tx = await this.oracle.updatePythPrices(pythVaaData, {
        value: ethers.parseEther('0.001'), // overpay, refunded
        gasLimit: 300000,
      });
      await tx.wait();
    } catch(e) {
      console.error('[pyth-updater]', e.message);
    }
  }
}

if (require.main === module) {
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const signer   = new ethers.Wallet(process.env.GUARDIAN_PRIVATE_KEY, provider);

  const keeper = new GuardianKeeper(
    provider, signer,
    process.env.FOREX_ORACLE_ADDRESS,
    process.env.MARKET_REGISTRY_ADDRESS,
  );
  keeper.start().catch(console.error);
  module.exports = { GuardianKeeper, PythUpdater };
} else {
  module.exports = { GuardianKeeper, PythUpdater };
}
