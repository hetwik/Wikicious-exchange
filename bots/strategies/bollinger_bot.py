"""
════════════════════════════════════════════════════════════════
 WIKICIOUS CUSTOM BOT — Bollinger Bands Mean Reversion
 Intermediate example using numpy.

 WHAT IT DOES:
   - Computes Bollinger Bands: middle = SMA(20), upper/lower = ±2σ
   - Long when price touches lower band (oversold stretch)
   - Short when price touches upper band (overbought stretch)
   - Exits at the middle band (mean reversion target)
   - Squeeze filter: only trade when bands are narrow (low volatility)
════════════════════════════════════════════════════════════════
"""
import sys, json, numpy as np

# ── Config ────────────────────────────────────────────────────
BB_PERIOD       = 20    # SMA period for Bollinger Bands
BB_STD          = 2.0   # standard deviations for upper/lower band
TRADE_SIZE      = 60    # USDC per trade
LEVERAGE        = 4     # leverage multiplier
STOP_LOSS_PCT   = 2.5   # stop loss %
# Squeeze: only trade if bandwidth < this fraction of price (tight range)
SQUEEZE_MAX_BW  = 0.04  # max bandwidth (4% of price) to consider "tight"


def bollinger_bands(prices, period, std_mult):
    arr    = np.array(prices[-period:])
    middle = arr.mean()
    std    = arr.std()
    return middle - std * std_mult, middle, middle + std * std_mult


prices   = []
position = None
entry    = 0.0

for line in sys.stdin:
    try:
        price = float(json.loads(line.strip())["price"])
    except Exception:
        continue

    prices.append(price)
    if len(prices) > BB_PERIOD * 3:
        prices.pop(0)
    if len(prices) < BB_PERIOD:
        continue

    lower, middle, upper = bollinger_bands(prices, BB_PERIOD, BB_STD)
    bandwidth = (upper - lower) / middle

    # ── Stop loss / exit at middle ───────────────────────────
    if position == 'long':
        pnl = (price - entry) / entry * 100
        if price >= middle:
            print(json.dumps({"signal": {"side": "short", "size": TRADE_SIZE, "leverage": LEVERAGE,
                "orderType": "market", "reason": f"BB exit long at middle ${middle:.2f}"}}), flush=True)
            position = None; continue
        if pnl <= -STOP_LOSS_PCT:
            print(json.dumps({"signal": {"side": "short", "size": TRADE_SIZE, "leverage": LEVERAGE,
                "orderType": "market", "reason": f"BB stop loss {pnl:.2f}%"}}), flush=True)
            position = None; continue

    elif position == 'short':
        pnl = (entry - price) / entry * 100
        if price <= middle:
            print(json.dumps({"signal": {"side": "long", "size": TRADE_SIZE, "leverage": LEVERAGE,
                "orderType": "market", "reason": f"BB exit short at middle ${middle:.2f}"}}), flush=True)
            position = None; continue
        if pnl <= -STOP_LOSS_PCT:
            print(json.dumps({"signal": {"side": "long", "size": TRADE_SIZE, "leverage": LEVERAGE,
                "orderType": "market", "reason": f"BB stop loss {pnl:.2f}%"}}), flush=True)
            position = None; continue

    if position:
        continue

    # ── Entry on band touch ───────────────────────────────────
    if bandwidth <= SQUEEZE_MAX_BW:  # only trade during squeezes
        if price <= lower:
            print(json.dumps({"signal": {
                "side": "long", "size": TRADE_SIZE, "leverage": LEVERAGE, "orderType": "market",
                "tp": middle, "sl": lower * (1 - STOP_LOSS_PCT / 100),
                "reason": f"BB lower band touch ${lower:.2f} | bandwidth {bandwidth:.3f}",
            }}), flush=True)
            position = 'long'; entry = price

        elif price >= upper:
            print(json.dumps({"signal": {
                "side": "short", "size": TRADE_SIZE, "leverage": LEVERAGE, "orderType": "market",
                "tp": middle, "sl": upper * (1 + STOP_LOSS_PCT / 100),
                "reason": f"BB upper band touch ${upper:.2f} | bandwidth {bandwidth:.3f}",
            }}), flush=True)
            position = 'short'; entry = price
