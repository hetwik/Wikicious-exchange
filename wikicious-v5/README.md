# Wikicious Exchange

Decentralized perpetuals exchange on Arbitrum One.
Trade crypto, forex (100+ pairs), gold, silver, and oil — all synthetic, settled in USDC.

---

## Project Structure

```
wikicious/
├── contracts/          Solidity smart contracts (Hardhat)
│   ├── src/            16 contracts — Perp, Vault, Oracle, Social, Prop, Bonus
│   └── scripts/        deploy.js · transfer-ownership.js · accept-ownership.js
│
├── backend/            Node.js API + keeper bots
│   └── src/
│       ├── index.js            REST API + WebSocket server
│       ├── config.js           Contract ABIs and addresses
│       ├── services/
│       │   ├── chain.js        Ethers.js provider + contract instances
│       │   ├── prices.js       Live Binance WebSocket price feed
│       │   ├── keeper.js       Liquidation + limit order keeper bot
│       │   └── guardian_keeper.js  Oracle price updater
│       └── routes/
│           ├── markets.js      Market data endpoints
│           ├── revenue.js      Protocol revenue endpoints
│           ├── social.js       Social feed endpoints
│           └── bonus.js        Referral + bonus endpoints
│
├── frontend/           React trading UI
│   └── src/
│       ├── config.js           Contract addresses + wagmi config
│       ├── store/index.js      Global state (Zustand)
│       ├── hooks/
│       │   ├── useApi.js       React Query API hooks
│       │   └── useContracts.js On-chain read/write hooks (wagmi)
│       ├── components/         Charts, OrderBook, TradeForm, Positions
│       └── screens/            Markets, Social, Leaderboard, Referral
│
├── mobile/             Flutter app (iOS + Android)
├── admin/              Revenue dashboard (single HTML file)
├── nginx/              Reverse proxy + SSL config
└── scripts/            VPS setup + start scripts
```

---

## Markets

| Category | Pairs | Max Leverage |
|----------|-------|-------------|
| Crypto (Major) | BTC, ETH, SOL, ARB + 11 more | 125× |
| Forex (Major) | EUR/USD, GBP/USD, JPY + 4 more | 50× |
| Forex (Minor/Exotic) | 30+ pairs | 20–30× |
| Metals | Gold, Silver, Platinum | 100× |
| Commodities | WTI Oil, Brent, Natural Gas | 25× |

---

## Quick Start

### 1. Deploy Contracts

```bash
cd contracts
cp .env.example .env
# → fill in DEPLOYER_PRIVATE_KEY, ARBITRUM_RPC_URL, ARBISCAN_API_KEY

npm install
npm run deploy:testnet   # test on Arbitrum Sepolia first
npm run deploy           # deploy to Arbitrum Mainnet
npm run verify           # verify on Arbiscan
```

### 2. Transfer Ownership to Treasury Wallet

```bash
# Add TREASURY_ADDRESS to contracts/.env
npx hardhat run scripts/transfer-ownership.js --network arbitrum

# Switch to treasury private key in .env, then:
npx hardhat run scripts/accept-ownership.js --network arbitrum
```

### 3. Start the Backend

```bash
cd backend
cp .env.example .env
# → fill in all contract addresses from deployments.arbitrum.json

npm install
npm start          # API server on port 3001
npm run keeper     # liquidation keeper bot (separate terminal)
```

### 4. Build the Frontend

```bash
cd frontend
cp .env.example .env
# → fill in REACT_APP_WALLETCONNECT_PROJECT_ID and contract addresses

npm install
npm run build      # production build → ./build/
```

### 5. Deploy to Server

```bash
# Run the setup script on your Ubuntu 22.04 VPS
./scripts/setup.sh

# Then start everything with PM2
pm2 start backend/src/index.js            --name wikicious-api
pm2 start backend/src/services/keeper.js  --name wikicious-keeper
```

---

## API Keys You Need

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| Alchemy | Arbitrum RPC + WebSocket | [dashboard.alchemy.com](https://dashboard.alchemy.com) |
| Arbiscan | Contract verification | [arbiscan.io/register](https://arbiscan.io/register) |
| WalletConnect | Wallet modal in frontend | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| OpenExchangeRates | Forex prices | [openexchangerates.org/signup/free](https://openexchangerates.org/signup/free) |
| Pinata | IPFS for social posts | [app.pinata.cloud/register](https://app.pinata.cloud/register) |

---

## Revenue Model

| Source | Rate |
|--------|------|
| Perp taker fee | 0.05% per trade |
| Perp maker fee | 0.02% per trade |
| Spot spread (Uniswap V3 routing) | 0.15% per swap |
| Liquidation fee | Portion of liquidated margin |

Open `admin/wikicious-admin.html` to view live revenue and withdraw fees.

---

## Full Deployment Guide

See `Wikicious_Deployment_Guide.docx` for a complete step-by-step walkthrough.


---

## Auto Trading: Bots & Copy Trading

### Built-in Strategy Bots

| Strategy   | Icon | Best For                    | Risk   | Key Params                            |
|------------|------|-----------------------------|--------|---------------------------------------|
| Grid       | ⊞    | Sideways/ranging markets    | Medium | Lower/upper price, grid count         |
| DCA        | 📅   | Long-term accumulation      | Low    | Amount per buy, interval, dip filter  |
| RSI        | 📈   | Mean-reversion              | Medium | RSI period, oversold/overbought levels|
| MACD       | 〰   | Trending markets            | Medium | Fast/slow/signal periods              |
| Breakout   | 🚀   | Pre-breakout consolidation  | High   | Lookback period, TP multiplier        |

### Copy Trading

1. Go to **Auto Trading → Copy Trading → Discover Traders**
2. Browse master traders sorted by monthly PnL
3. Click **Copy Trader**, set your copy ratio (e.g. 0.5 = half size) and max trade size
4. All future trades by that trader are automatically mirrored to your wallet

### Custom Python Bots

Write a Python strategy in the bot editor or upload via API.  
Your script reads ticks from stdin and prints signals to stdout:

```python
# stdin tick: {"price": 67420.5, "symbol": "BTCUSDT", "timestamp": 1714000000000}
# stdout signal:
print(json.dumps({"signal": {"side": "long", "size": 50, "leverage": 5,
                              "orderType": "market", "reason": "My signal"}}))
```

See full examples in `/bots/strategies/`:
- `rsi_bot.py`       — RSI oversold/overbought (beginner)
- `ema_crossover.py` — EMA golden/death cross (intermediate)
- `bollinger_bot.py` — Bollinger Bands mean reversion (intermediate)
- `hft_scalper.py`   — High-frequency tick scalper (advanced)

### Bot File Structure

```
backend/src/
  services/bots/
    bot_engine.js              Core tick engine — runs all active bots every 1s
    copy_trading.js            Copy trading service — watches chain events
    strategies/
      grid.js                  Grid trading strategy
      dca.js                   Dollar-cost averaging strategy
      rsi.js                   RSI oscillator strategy
      macd.js                  MACD crossover strategy
      breakout.js              Price breakout strategy

  routes/
    bots.js                    All REST endpoints for bots + copy trading

frontend/src/screens/
  bots/
    BotsScreen.jsx             Main hub (3 tabs)
    MyBotsTab.jsx              Manage active bots
    StrategyMarket.jsx         Browse + create bots
  copy/
    CopyTradingTab.jsx         Discover masters + manage subscriptions

mobile/lib/screens/
  bots/
    bots_screen.dart           Full mobile UI for bots + copy trading

bots/
  README.md                    Python bot documentation
  strategies/
    rsi_bot.py                 RSI example
    ema_crossover.py           EMA crossover example
    bollinger_bot.py           Bollinger Bands example
    hft_scalper.py             HFT scalper example
```

### API Endpoints

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/api/bots/strategies`          | List all strategy templates          |
| GET    | `/api/bots`                     | Get user's bots                      |
| POST   | `/api/bots`                     | Create a new bot                     |
| PATCH  | `/api/bots/:id/start`           | Start a bot                          |
| PATCH  | `/api/bots/:id/pause`           | Pause a bot                          |
| DELETE | `/api/bots/:id`                 | Stop and remove a bot                |
| PATCH  | `/api/bots/:id/config`          | Update bot config                    |
| GET    | `/api/bots/:id/trades`          | Bot trade history                    |
| POST   | `/api/bots/:id/upload-script`   | Upload Python script for custom bot  |
| GET    | `/api/copy/masters`             | List master traders                  |
| POST   | `/api/copy/subscribe`           | Subscribe to copy a master           |
| DELETE | `/api/copy/subscribe/:id`       | Unsubscribe                          |
| GET    | `/api/copy/subscriptions`       | My active subscriptions              |
| GET    | `/api/copy/trades/:subId`       | Copy trade history                   |
