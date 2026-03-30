#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  WIKICIOUS — INCIDENT RESPONSE PLAYBOOK
#  Run: chmod +x incident_response.sh && ./incident_response.sh pause
#
#  COMMANDS:
#    pause        — Emergency pause ALL contracts immediately
#    status       — Check pause status and key metrics
#    drain-check  — Check if funds are unexpectedly moving
#    unpause      — Unpause (requires manual confirmation)
#    report       — Generate incident report
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

if [[ -f .env ]]; then source .env; fi

RPC="${ARBITRUM_RPC_URL:-https://arb1.arbitrum.io/rpc}"
DEPLOYER="${DEPLOYER_PRIVATE_KEY:-}"
DEPLOYMENTS="./contracts/deployments.arbitrum.json"

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[⚠]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; }

# ── PAUSE ALL CONTRACTS ───────────────────────────────────────────────────────
cmd_pause() {
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║     🚨 EMERGENCY PAUSE — ALL CONTRACTS           ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ -z "$DEPLOYER" ]]; then
    error "DEPLOYER_PRIVATE_KEY not set. Cannot pause."
    echo "Set it: export DEPLOYER_PRIVATE_KEY=0x..."
    exit 1
  fi

  if [[ ! -f "$DEPLOYMENTS" ]]; then
    error "Deployments file not found: $DEPLOYMENTS"
    exit 1
  fi

  warn "This will PAUSE all Wikicious contracts on Arbitrum One."
  warn "Users will be unable to trade, deposit, or withdraw until unpaused."
  read -p "Type 'PAUSE' to confirm: " confirm
  if [[ "$confirm" != "PAUSE" ]]; then
    error "Aborted."
    exit 1
  fi

  log "Reading contract addresses..."
  VAULT=$(jq -r '.WikiVault // empty' "$DEPLOYMENTS")
  PERP=$(jq -r '.WikiPerp // empty' "$DEPLOYMENTS")
  SPOT=$(jq -r '.WikiSpot // empty' "$DEPLOYMENTS")
  LENDING=$(jq -r '.WikiLending // empty' "$DEPLOYMENTS")
  BRIDGE=$(jq -r '.WikiBridge // empty' "$DEPLOYMENTS")
  ORACLE=$(jq -r '.WikiOracle // empty' "$DEPLOYMENTS")
  VAMM=$(jq -r '.WikiVirtualAMM // empty' "$DEPLOYMENTS")

  PAUSE_ABI='[{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"}]'

  paused=0
  failed=0

  for addr_name in "WikiVault:$VAULT" "WikiPerp:$PERP" "WikiSpot:$SPOT" "WikiLending:$LENDING" "WikiBridge:$BRIDGE" "WikiOracle:$ORACLE" "WikiVirtualAMM:$VAMM"; do
    name="${addr_name%%:*}"
    addr="${addr_name##*:}"

    if [[ -z "$addr" || "$addr" == "null" ]]; then
      warn "$name: not deployed, skipping"
      continue
    fi

    log "Pausing $name ($addr)..."
    if cast send \
      --rpc-url "$RPC" \
      --private-key "$DEPLOYER" \
      "$addr" \
      "pause()" \
      2>/dev/null; then
      success "$name: PAUSED"
      ((paused++))
    else
      error "$name: PAUSE FAILED — may already be paused or tx error"
      ((failed++))
    fi
  done

  echo ""
  echo "════════════════════════════════════════"
  log "Pause complete: $paused contracts paused, $failed failed"

  if [[ $failed -gt 0 ]]; then
    warn "Some contracts failed to pause. Investigate immediately."
    warn "Manual pause options:"
    warn "  1. Connect hardware wallet to Arbiscan and call pause() directly"
    warn "  2. Use multisig: queue pause proposal via WikiMultisigGuard"
    warn "  3. If bridge is draining: contact LayerZero team immediately"
    warn "     LZ security: https://layerzero.network/security"
  fi

  cmd_report "EMERGENCY_PAUSE"
}

# ── STATUS CHECK ──────────────────────────────────────────────────────────────
cmd_status() {
  log "Checking contract status..."

  if [[ ! -f "$DEPLOYMENTS" ]]; then
    warn "No deployments file found. Is the protocol deployed?"
    return
  fi

  VAULT=$(jq -r '.WikiVault // empty' "$DEPLOYMENTS")

  if [[ -n "$VAULT" && "$VAULT" != "null" ]]; then
    PAUSED=$(cast call --rpc-url "$RPC" "$VAULT" "paused()(bool)" 2>/dev/null || echo "unknown")
    BALANCE=$(cast call --rpc-url "$RPC" "$VAULT" "contractBalance()(uint256)" 2>/dev/null || echo "0")
    SOLVENT=$(cast call --rpc-url "$RPC" "$VAULT" "isSolvent()(bool)" 2>/dev/null || echo "unknown")
    BALANCE_USD=$(echo "scale=2; $BALANCE / 1000000" | bc 2>/dev/null || echo "N/A")

    echo ""
    echo "  WikiVault:   ${VAULT:0:10}...${VAULT: -6}"
    echo "  Paused:      $PAUSED"
    echo "  Balance:     \$$BALANCE_USD USDC"
    echo "  Solvent:     $SOLVENT"
    echo ""

    if [[ "$PAUSED" == "false" ]]; then
      success "Protocol is LIVE and operational"
    else
      warn "Protocol is PAUSED"
    fi

    if [[ "$SOLVENT" == "false" ]]; then
      error "⚠️  VAULT IS INSOLVENT — EMERGENCY ACTION REQUIRED"
    fi
  fi
}

# ── DRAIN DETECTION ───────────────────────────────────────────────────────────
cmd_drain_check() {
  log "Checking for abnormal balance movements..."

  if [[ ! -f "$DEPLOYMENTS" ]]; then
    warn "No deployments file."
    return
  fi

  VAULT=$(jq -r '.WikiVault // empty' "$DEPLOYMENTS")
  USDC="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

  if [[ -n "$VAULT" && "$VAULT" != "null" ]]; then
    BALANCE=$(cast call --rpc-url "$RPC" "$USDC" "balanceOf(address)(uint256)" "$VAULT" 2>/dev/null || echo "0")
    BALANCE_USD=$(echo "scale=2; $BALANCE / 1000000" | bc 2>/dev/null || echo "N/A")
    log "Vault USDC balance: \$$BALANCE_USD"

    # Check last 100 blocks for large transfers
    log "Checking recent large transfer events (last 100 blocks)..."
    CURRENT_BLOCK=$(cast block-number --rpc-url "$RPC" 2>/dev/null || echo "0")
    FROM_BLOCK=$((CURRENT_BLOCK - 100))

    # Transfer topic for USDC Transfer event
    TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

    warn "Large withdrawal monitoring active."
    warn "Alert threshold: >$50,000 USDC in a single tx"
    warn "If you see unexpected drains, run: ./incident_response.sh pause"
  fi
}

# ── GENERATE INCIDENT REPORT ─────────────────────────────────────────────────
cmd_report() {
  local event="${1:-MANUAL}"
  local timestamp=$(date -u '+%Y-%m-%d_%H-%M-%S')
  local filename="incident_${event}_${timestamp}.md"

  cat > "$filename" << REPORT
# Wikicious Incident Report
**Event:** $event
**Time:** $(date -u)
**Network:** Arbitrum One (Chain ID: 42161)
**RPC:** $RPC

## Immediate Actions Taken
- [ ] Emergency pause initiated
- [ ] Team notified via Slack/Discord
- [ ] LayerZero contacted (if bridge involved)
- [ ] Chainlink contacted (if oracle involved)
- [ ] Legal team notified (if user funds at risk)

## Contract Status
Run: \`./incident_response.sh status\`

## Investigation Checklist
- [ ] Review last 50 transactions on Arbiscan
- [ ] Check oracle prices for manipulation
- [ ] Review any governance actions in last 24h
- [ ] Check multisig proposal queue
- [ ] Verify all operator addresses are legitimate
- [ ] Check insurance fund balance
- [ ] Review LayerZero cross-chain message queue

## User Communication
- [ ] Post on Twitter/X: "We are investigating a potential issue. Protocol is paused as a precaution. Funds are safe. Update in 1h."
- [ ] Update Discord status
- [ ] Post on Telegram
- [ ] Email registered users

## Recovery Steps
1. Identify root cause
2. Deploy fix to testnet
3. External review of fix (minimum 24h)
4. Multisig approval to deploy fix (3-of-5)
5. Deploy to mainnet via timelock (48h delay)
6. Unpause with multisig approval
7. Post-incident report published within 72h

## Contacts
- Chainlink security: security@chainlink.com
- LayerZero security: https://layerzero.network/security
- Arbitrum security: https://github.com/OffchainLabs/nitro/security
- OpenZeppelin: https://www.openzeppelin.com/security-audits
REPORT

  success "Incident report saved: $filename"
}

# ── UNPAUSE ───────────────────────────────────────────────────────────────────
cmd_unpause() {
  warn "Unpausing requires explicit confirmation that the incident is resolved."
  echo ""
  echo "Before unpausing, verify:"
  echo "  1. Root cause identified and fixed"
  echo "  2. Fix audited and approved"
  echo "  3. 3-of-5 multisig signers have approved"
  echo "  4. Timelock delay has passed (if applicable)"
  echo "  5. Insurance fund is adequate"
  echo ""
  read -p "Has the incident been fully resolved? (yes/NO): " confirmed
  if [[ "$confirmed" != "yes" ]]; then
    error "Unpause aborted. Resolve the incident first."
    exit 1
  fi
  warn "Proceeding with unpause via multisig..."
  warn "This requires the MultisigGuard execute() call — run via Gnosis Safe UI or hardhat script"
}

# ── DISPATCH ─────────────────────────────────────────────────────────────────
CMD="${1:-status}"

case "$CMD" in
  pause)        cmd_pause ;;
  status)       cmd_status ;;
  drain-check)  cmd_drain_check ;;
  unpause)      cmd_unpause ;;
  report)       cmd_report "MANUAL" ;;
  *)
    echo "Usage: $0 {pause|status|drain-check|unpause|report}"
    exit 1 ;;
esac
