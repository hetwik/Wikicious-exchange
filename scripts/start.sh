#!/bin/bash
# Start all Wikicious services
CYAN='\033[0;36m'; GREEN='\033[0;32m'; NC='\033[0m'; BOLD='\033[1m'

echo -e "${CYAN}${BOLD}🚀 Starting Wikicious Exchange...${NC}\n"

# Backend API
echo -e "  Starting backend API..."
cd backend && npm start &
BACKEND_PID=$!

# Keeper bot
echo -e "  Starting keeper bot..."
npm run keeper &
KEEPER_PID=$!
cd ..

# Frontend
echo -e "  Starting frontend..."
cd frontend && npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}${BOLD}All services started:${NC}"
echo -e "  Frontend: http://localhost:3000"
echo -e "  API:      http://localhost:3001/api"
echo -e "  WS:       ws://localhost:3001/ws"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $KEEPER_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT
wait
