#!/bin/bash

# 🚀 Start All Agri-GPT Services
# Starts backend, frontend, and monitoring services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Agri-GPT Services..."
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if services are already running
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Start Backend
echo "📌 Starting Backend Server..."
if check_port 5001; then
    echo -e "${YELLOW}⚠️ Port 5001 already in use. Backend may already be running.${NC}"
else
    cd backend
    echo "   Starting on port 5001..."
    PORT=5001 npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    echo -e "${GREEN}✅ Backend started on port 5001 (PID: $BACKEND_PID)${NC}"
    cd ..
    sleep 3
fi

# Start Frontend
echo ""
echo "📌 Starting Frontend Server..."
if check_port 3030; then
    echo -e "${YELLOW}⚠️ Port 3030 already in use. Frontend may already be running.${NC}"
else
    cd frontend
    echo "   Starting on port 3030..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    echo -e "${GREEN}✅ Frontend started on port 3030 (PID: $FRONTEND_PID)${NC}"
    cd ..
    sleep 3
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait a bit for services to start
sleep 5

# Check service health
echo ""
echo "🔍 Checking Service Health..."
echo "----------------------------"

# Check backend
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️ Backend health check failed. Check logs/backend.log${NC}"
fi

# Check frontend
if curl -s http://localhost:3030 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend not accessible. Check logs/frontend.log${NC}"
fi

echo ""
echo "🎉 Services Started!"
echo "===================="
echo ""
echo "🌐 Access Points:"
echo "   Frontend: http://localhost:3030"
echo "   Backend API: http://localhost:5001"
echo "   Health Check: http://localhost:5001/health"
echo "   Government Schemes: http://localhost:3030/government-schemes"
echo ""
echo "📊 Logs:"
echo "   Backend: tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   ./scripts/stop-services.sh"
echo ""

