#!/bin/bash
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
step() { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
err()  { echo -e "${RED}  ❌ $1${NC}"; exit 1; }

echo ""
echo -e "${BOLD}████████████████████████████████████████████████${NC}"
echo -e "${BOLD}   WIKICIOUS EXCHANGE — SETUP & DEPLOY           ${NC}"
echo -e "${BOLD}   Arbitrum Mainnet | Perps + AMM + Spot          ${NC}"
echo -e "${BOLD}████████████████████████████████████████████████${NC}"
echo ""

# ── Prerequisites ─────────────────────────────────────────────
step "Checking prerequisites"
command -v node  &>/dev/null || err "Node.js not found (need v18+)"
command -v npm   &>/dev/null || err "npm not found"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -lt 18 ] && err "Node.js v18+ required (found v${NODE_VER})"
ok "Node.js v$(node -v | sed 's/v//')"

# Flutter optional
if command -v flutter &>/dev/null; then
  ok "Flutter $(flutter --version 2>/dev/null | head -1 | awk '{print $2}')"
else
  warn "Flutter not found — skipping mobile app setup"
fi

# ── Environment setup ─────────────────────────────────────────
step "Setting up environment files"

if [ ! -f contracts/.env ]; then
  cat > contracts/.env << 'ENVEOF'
# Arbitrum deployment
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
ARBISCAN_API_KEY=YOUR_ARBISCAN_KEY
ENVEOF
  warn "Created contracts/.env — add your private key!"
fi

if [ ! -f backend/.env ]; then
  cat > backend/.env << 'ENVEOF'
PORT=3000
NODE_ENV=production

# Arbitrum
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_WS_URL=wss://arb1.arbitrum.io/ws

# Contract addresses (fill after deployment)
VAULT_ADDRESS=
PERP_ADDRESS=
AMM_ADDRESS=
SPOT_ADDRESS=
ORACLE_ADDRESS=
WIK_ADDRESS=

# Keeper bot private key (separate from deployer)
KEEPER_PRIVATE_KEY=

# Auth
JWT_SECRET=wikicious-change-this-in-production

# DB
DB_PATH=./data/wikicious.db
ENVEOF
  warn "Created backend/.env — fill contract addresses after deploy!"
fi

if [ ! -f frontend/.env ]; then
  cat > frontend/.env << 'ENVEOF'
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000/ws
REACT_APP_WALLETCONNECT_ID=your_walletconnect_project_id

# Contract addresses (fill after deployment)
REACT_APP_VAULT_ADDRESS=
REACT_APP_PERP_ADDRESS=
REACT_APP_AMM_ADDRESS=
REACT_APP_SPOT_ADDRESS=
REACT_APP_WIK_ADDRESS=
ENVEOF
  warn "Created frontend/.env — fill contract addresses after deploy!"
fi
ok "Environment files ready"

# ── Install dependencies ──────────────────────────────────────
step "Installing contracts dependencies"
cd contracts && npm install --silent && cd ..
ok "Contracts npm packages installed"

step "Installing backend dependencies"
cd backend && npm install --silent && cd ..
ok "Backend npm packages installed"

step "Installing frontend dependencies"
cd frontend && npm install --silent && cd ..
ok "Frontend npm packages installed"

# ── Compile contracts ─────────────────────────────────────────
step "Compiling Solidity contracts"
cd contracts
npx hardhat compile 2>&1 | grep -E "(Compiled|Error|Warning)" | head -20
cd ..
ok "Contracts compiled"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ Setup complete!${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. ${YELLOW}Edit contracts/.env${NC}  — add DEPLOYER_PRIVATE_KEY"
echo -e "  2. ${YELLOW}Deploy contracts:${NC}     cd contracts && npm run deploy"
echo -e "  3. ${YELLOW}Fill addresses:${NC}       update backend/.env and frontend/.env"
echo -e "  4. ${YELLOW}Start backend:${NC}        cd backend && npm start"
echo -e "  5. ${YELLOW}Start keeper:${NC}         cd backend && npm run keeper"
echo -e "  6. ${YELLOW}Start frontend:${NC}       cd frontend && npm start"
echo ""
echo -e "${CYAN}Quick start (after deploy):${NC}"
echo -e "  ${BOLD}./scripts/start.sh${NC}"
echo ""
