#!/bin/bash

echo "🚀 Starting AgriSmart AI Services"
echo "═══════════════════════════════════════════"
echo ""

# Check if MongoDB is running
if ! pgrep -x mongod > /dev/null; then
    echo "⚠️  MongoDB is not running"
    echo "   Start it with: mongod"
    echo "   Or skip if not using database features"
    echo ""
fi

# Start Backend
echo "📦 Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

# Wait a bit for backend to start
sleep 3

# Start Frontend
echo "📦 Starting Frontend Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ..

echo ""
echo "✅ Services Starting..."
echo ""
echo "🌐 Access URLs:"
echo "• Frontend: http://localhost:3030"
echo "• Backend: http://localhost:5001"
echo ""
echo "📝 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check status
echo ""
echo "📊 Service Status:"
curl -s http://localhost:5001/api/health > /dev/null && echo "✅ Backend: Running" || echo "⏳ Backend: Starting..."
curl -s http://localhost:3030 > /dev/null && echo "✅ Frontend: Running" || echo "⏳ Frontend: Starting..."
