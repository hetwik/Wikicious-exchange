"""
════════════════════════════════════════════════════════════════
 WIKICIOUS CUSTOM BOT — RSI Strategy
 Beginner example. No external libraries needed.

 WHAT IT DOES:
   - Tracks price history to compute RSI
   - Goes long when RSI < 30 (oversold)
   - Goes short when RSI > 70 (overbought)
   - Exits when RSI returns to 50
════════════════════════════════════════════════════════════════
"""
import sys, json, math

# ── Config (edit these) ──────────────────────────────────────
RSI_PERIOD       = 14     # number of ticks for RSI
OVERSOLD_LEVEL   = 30     # buy below this RSI
OVERBOUGHT_LEVEL = 70     # sell above this RSI
NEUTRAL_LEVEL    = 50     # exit when RSI crosses here
TRADE_SIZE       = 50     # USDC per trade
LEVERAGE         = 5      # leverage multiplier
STOP_LOSS_PCT    = 3.0    # stop loss % from entry

# ── State ─────────────────────────────────────────────────────
prices     = []
position   = None   # 'long', 'short', or None
entry_price = 0.0


def calculate_rsi(prices, period):
    """Standard Wilder RSI formula."""
    if len(prices) < period + 1:
        return None
    gains  = 0.0
    losses = 0.0
    for i in range(len(prices) - period, len(prices)):
        diff = prices[i] - prices[i - 1]
        if diff > 0:
            gains  += diff
        else:
            losses -= diff
    avg_gain = gains  / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1 + rs))


def emit_signal(side, reason, tp=0, sl=0):
    """Print a trade signal to stdout for the engine to execute."""
    signal = {
        "signal": {
            "side":      side,
            "size":      TRADE_SIZE,
            "leverage":  LEVERAGE,
            "orderType": "market",
            "reason":    reason,
        }
    }
    if tp: signal["signal"]["tp"] = tp
    if sl: signal["signal"]["sl"] = sl
    print(json.dumps(signal), flush=True)


# ── Main loop ─────────────────────────────────────────────────
for line in sys.stdin:
    try:
        tick  = json.loads(line.strip())
        price = float(tick["price"])
    except Exception:
        continue

    prices.append(price)
    if len(prices) > RSI_PERIOD * 3:
        prices.pop(0)

    rsi = calculate_rsi(prices, RSI_PERIOD)
    if rsi is None:
        continue

    # ── Stop loss check ──────────────────────────────────────
    if position and entry_price > 0:
        pnl_pct = ((price - entry_price) / entry_price * 100) if position == 'long' \
             else ((entry_price - price) / entry_price * 100)
        if pnl_pct <= -STOP_LOSS_PCT:
            close_side = 'short' if position == 'long' else 'long'
            emit_signal(close_side, f"RSI stop loss — loss {pnl_pct:.2f}%")
            position   = None
            entry_price = 0.0
            continue

    # ── Exit on neutral RSI ──────────────────────────────────
    if position == 'long' and rsi >= NEUTRAL_LEVEL:
        emit_signal('short', f"RSI exit long — neutral ({rsi:.1f})")
        position = None
        continue

    if position == 'short' and rsi <= NEUTRAL_LEVEL:
        emit_signal('long', f"RSI exit short — neutral ({rsi:.1f})")
        position = None
        continue

    # ── Entry signals ────────────────────────────────────────
    if position is None and rsi <= OVERSOLD_LEVEL:
        sl = price * (1 - STOP_LOSS_PCT / 100)
        emit_signal('long', f"RSI oversold ({rsi:.1f})", sl=sl)
        position    = 'long'
        entry_price = price

    elif position is None and rsi >= OVERBOUGHT_LEVEL:
        sl = price * (1 + STOP_LOSS_PCT / 100)
        emit_signal('short', f"RSI overbought ({rsi:.1f})", sl=sl)
        position    = 'short'
        entry_price = price
