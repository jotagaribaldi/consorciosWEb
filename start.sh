#!/bin/bash
# Start ConsorciApp Backend + Frontend
echo "[ConsorciApp] Starting backend on port 3001..."
cd /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend
node src/index.js &
BACKEND_PID=$!
echo "[ConsorciApp] Backend PID: $BACKEND_PID"

sleep 3
echo "[ConsorciApp] Starting frontend on port 5173..."
cd /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/frontend
npm run dev &
FRONTEND_PID=$!
echo "[ConsorciApp] Frontend PID: $FRONTEND_PID"

echo "[ConsorciApp] Both servers started!"
echo "  Backend:  http://localhost:3001/api/health"
echo "  Frontend: http://localhost:5173"
