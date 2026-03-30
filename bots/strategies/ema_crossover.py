"""
════════════════════════════════════════════════════════════════
 WIKICIOUS CUSTOM BOT — EMA Crossover
 Intermediate example. Clean, well-commented, production-ready.

 WHAT IT DOES:
   - Computes a fast EMA (default 9) and a slow EMA (default 21)
   - Long when fast EMA crosses above slow EMA  (golden cross)
   - Short when fast EMA crosses below slow EMA (death cross)
   - Stop loss at 2× ATR for dynamic risk management
════════════════════════════════════════════════════════════════
"""
import sys, json

# ── Config ────────────────────────────────────────────────────
FAST_PERIOD  = 9      # fast EMA period
SLOW_PERIOD  = 21     # slow EMA period
ATR_PERIOD   = 14     # ATR period for stop loss calculation
ATR_MULTIPLIER = 2.0  # SL = entry ± 2 × ATR
TRADE_SIZE   = 75     # USDC per trade
LEVERAGE     = 8      # leverage multiplier


def ema(prices, period):
    """Exponential Moving Average."""
    k   = 2 / (period + 1)
    val = prices[0]
    for p in prices[1:]:
        val = p * k + val * (1 - k)
    return val


def atr(prices, period):
    """Average True Range — measures volatility."""
    if len(prices) < period + 1:
        return prices[-1] * 0.02  # default 2% if not enough data
    ranges = [abs(prices[i] - prices[i - 1]) for i in range(len(prices) - period, len(prices))]
    return sum(ranges) / period


# ── State ─────────────────────────────────────────────────────
prices   = []
position = None   # 'long', 'short', or None
prev_fast_above = None  # was fast EMA above slow EMA last tick?


for line in sys.stdin:
    try:
        price = float(json.loads(line.strip())["price"])
    except Exception:
        continue

    prices.append(price)
    if len(prices) > SLOW_PERIOD * 3:
        prices.pop(0)

    # Need enough data for the slow EMA
    if len(prices) < SLOW_PERIOD + ATR_PERIOD:
        continue

    fast_ema   = ema(prices, FAST_PERIOD)
    slow_ema   = ema(prices, SLOW_PERIOD)
    curr_atr   = atr(prices, ATR_PERIOD)
    fast_above = fast_ema > slow_ema

    # Detect crossover (state changed from last tick)
    if prev_fast_above is not None and fast_above != prev_fast_above:
        sl_dist = curr_atr * ATR_MULTIPLIER

        if fast_above:  # Golden cross — fast crossed ABOVE slow → LONG
            signal = {
                "signal": {
                    "side": "long", "size": TRADE_SIZE, "leverage": LEVERAGE,
                    "orderType": "market",
                    "sl": price - sl_dist,
                    "reason": f"EMA golden cross — fast {fast_ema:.2f} > slow {slow_ema:.2f} | ATR SL ${sl_dist:.2f}",
                }
            }
            print(json.dumps(signal), flush=True)
            position = 'long'

        else:           # Death cross — fast crossed BELOW slow → SHORT
            signal = {
                "signal": {
                    "side": "short", "size": TRADE_SIZE, "leverage": LEVERAGE,
                    "orderType": "market",
                    "sl": price + sl_dist,
                    "reason": f"EMA death cross — fast {fast_ema:.2f} < slow {slow_ema:.2f} | ATR SL ${sl_dist:.2f}",
                }
            }
            print(json.dumps(signal), flush=True)
            position = 'short'

    prev_fast_above = fast_above
