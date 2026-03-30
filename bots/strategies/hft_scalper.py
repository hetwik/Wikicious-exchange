"""
════════════════════════════════════════════════════════════════
 WIKICIOUS CUSTOM BOT — High-Frequency Tick Scalper
 Advanced example. Designed for tight spreads and fast exits.

 WHAT IT DOES:
   - Scalps 0.1–0.3% moves using tick momentum
   - Entry: 3 consecutive ticks in same direction + momentum threshold
   - Exit: quick TP at 0.15%, tight SL at 0.08%
   - Cooldown: blocks re-entry for 30 seconds after each trade
   - Tracks win/loss ratio and auto-pauses if losing streak hits 5

 NOTE: HFT on perps works best with 1–3s tick intervals.
       Lower leverage (2–5×) is recommended to survive spread costs.
════════════════════════════════════════════════════════════════
"""
import sys, json, time

# ── Config ────────────────────────────────────────────────────
TRADE_SIZE        = 20      # USDC per scalp (keep small — high frequency)
LEVERAGE          = 3       # low leverage for HFT
TP_PCT            = 0.15    # take-profit: 0.15% from entry
SL_PCT            = 0.08    # stop-loss:   0.08% from entry
MOMENTUM_WINDOW   = 3       # consecutive ticks to confirm direction
MOMENTUM_THRESH   = 0.05    # minimum price move % per tick to qualify
COOLDOWN_SECS     = 30      # seconds to block after a trade
MAX_LOSE_STREAK   = 5       # auto-pause after N consecutive losses

# ── State ─────────────────────────────────────────────────────
prices        = []
position      = None
entry_price   = 0.0
last_trade_at = 0.0
wins          = 0
losses        = 0
lose_streak   = 0
total_pnl     = 0.0


def emit(side, reason, tp=0, sl=0):
    signal = {
        "signal": {
            "side": side, "size": TRADE_SIZE, "leverage": LEVERAGE,
            "orderType": "market", "reason": reason,
        }
    }
    if tp: signal["signal"]["tp"] = tp
    if sl: signal["signal"]["sl"] = sl
    print(json.dumps(signal), flush=True)


def tick_momentum(prices, window):
    """Return 'up', 'down', or None based on N consecutive same-direction ticks."""
    if len(prices) < window + 1:
        return None
    moves = [prices[-(i)] - prices[-(i + 1)] for i in range(1, window + 1)]
    pcts  = [abs(m) / prices[-(i + 1)] * 100 for i, m in enumerate(moves)]
    if all(m > 0 for m in moves) and all(p >= MOMENTUM_THRESH for p in pcts):
        return 'up'
    if all(m < 0 for m in moves) and all(p >= MOMENTUM_THRESH for p in pcts):
        return 'down'
    return None


for line in sys.stdin:
    try:
        price = float(json.loads(line.strip())["price"])
    except Exception:
        continue

    prices.append(price)
    if len(prices) > 100:
        prices.pop(0)

    now = time.time()

    # ── Auto-pause check ─────────────────────────────────────
    if lose_streak >= MAX_LOSE_STREAK:
        continue  # silently idle — user should investigate

    # ── Exit check ───────────────────────────────────────────
    if position and entry_price > 0:
        pnl_pct = ((price - entry_price) / entry_price * 100) if position == 'long' \
             else ((entry_price - price) / entry_price * 100)

        if pnl_pct >= TP_PCT:
            emit('short' if position == 'long' else 'long',
                 f"HFT TP +{pnl_pct:.3f}% | P&L: +${TRADE_SIZE * pnl_pct / 100 * LEVERAGE:.2f}")
            wins += 1; lose_streak = 0; total_pnl += TRADE_SIZE * pnl_pct / 100 * LEVERAGE
            position = None; last_trade_at = now; continue

        if pnl_pct <= -SL_PCT:
            emit('short' if position == 'long' else 'long',
                 f"HFT SL -{abs(pnl_pct):.3f}% | Loss: ${TRADE_SIZE * abs(pnl_pct) / 100 * LEVERAGE:.2f}")
            losses += 1; lose_streak += 1; total_pnl -= TRADE_SIZE * abs(pnl_pct) / 100 * LEVERAGE
            position = None; last_trade_at = now; continue

    # ── Cooldown check ────────────────────────────────────────
    if now - last_trade_at < COOLDOWN_SECS:
        continue

    if position:  # already in a trade
        continue

    # ── Entry signal ─────────────────────────────────────────
    momentum = tick_momentum(prices, MOMENTUM_WINDOW)
    if momentum == 'up':
        tp = price * (1 + TP_PCT / 100)
        sl = price * (1 - SL_PCT / 100)
        emit('long', f"HFT scalp UP | {MOMENTUM_WINDOW}-tick momentum | Streak W{wins}/L{losses}", tp=tp, sl=sl)
        position = 'long'; entry_price = price

    elif momentum == 'down':
        tp = price * (1 - TP_PCT / 100)
        sl = price * (1 + SL_PCT / 100)
        emit('short', f"HFT scalp DOWN | {MOMENTUM_WINDOW}-tick momentum | Streak W{wins}/L{losses}", tp=tp, sl=sl)
        position = 'short'; entry_price = price
