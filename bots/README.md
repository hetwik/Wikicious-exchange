# Wikicious — Custom Python Bots

This folder contains Python strategy templates for the custom bot feature.

## How It Works

Your Python script communicates with the bot engine over **stdin/stdout**:

- **stdin**  → engine sends JSON price ticks every second
- **stdout** → your script emits trade signals as JSON lines

## Signal Format

```json
{"signal": {"side": "long", "size": 50, "leverage": 5, "orderType": "market", "reason": "My signal fired"}}
```

| Field       | Type            | Description                              |
|-------------|-----------------|------------------------------------------|
| `side`      | `"long"/"short"` | Trade direction                         |
| `size`      | float           | USDC collateral per trade               |
| `leverage`  | int             | 1–125×                                  |
| `orderType` | `"market"/"limit"` | Execution type                       |
| `price`     | float (optional)| Limit price (only for limit orders)     |
| `tp`        | float (optional)| Take-profit price                       |
| `sl`        | float (optional)| Stop-loss price                         |
| `reason`    | string          | Human-readable label shown in trade log |

## Tick Input Format

```json
{"price": 67420.5, "symbol": "BTCUSDT", "timestamp": 1714000000000}
```

## Forbidden APIs (Sandbox Safety)

Your script **cannot** use:
- `subprocess`, `os.system` — no shell commands
- `shutil` — no filesystem manipulation
- `socket` — no raw network access
- `open()` — no arbitrary file reads
- `__import__` — no dynamic imports

Allowed: `sys`, `json`, `math`, `statistics`, `time`, `datetime`, `collections`, `numpy`, `pandas`

## Upload Your Bot

1. Go to **Auto Trading → Strategies → Custom Python Bot**
2. Paste your script in the editor
3. Click **Create Bot**
4. Go to **My Bots → Start**

## Files in this folder

| File                           | Description                                      |
|--------------------------------|--------------------------------------------------|
| `strategies/rsi_bot.py`        | RSI oversold/overbought — beginner example       |
| `strategies/macd_bot.py`       | MACD crossover — intermediate example            |
| `strategies/ema_crossover.py`  | Fast/slow EMA cross — clean and simple           |
| `strategies/bollinger_bot.py`  | Bollinger Bands mean reversion                   |
| `strategies/hft_scalper.py`    | High-frequency tick scalper — advanced example   |
| `examples/dual_ema_live.py`    | Full example with state, logging, and error handling |
