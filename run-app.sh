#!/bin/bash
# Run the full MCS-CEV app: backend (Node) + frontend (React). Julia runs when you trigger optimization.

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Load .env if present (OpenAI key, JULIA_PATH, etc.)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Backend must use 3002 so the frontend (api.js default) can reach it
export PORT=3002
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3003}"

echo "🚀 Starting MCS-CEV Optimization (full app)..."
echo ""

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Please install Node.js."
  exit 1
fi

# Check Julia (needed for Run Optimization step)
if command -v julia &>/dev/null; then
  echo "✅ Julia: $(julia --version)"
else
  echo "⚠️  Julia not in PATH. Install Julia for the 'Run Optimization' step to work."
  echo "   Or set JULIA_PATH in .env to your Julia binary."
fi

cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo "📡 Starting backend on http://localhost:${PORT}..."
cd "$ROOT/src/web-interface/backend"
node server.js &
BACKEND_PID=$!
cd "$ROOT"

sleep 2
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "❌ Backend failed to start. Check logs above."
  exit 1
fi
echo "✅ Backend running (PID $BACKEND_PID)"

# Start frontend (uses PORT=3003 from package.json)
echo "🌐 Starting frontend on http://localhost:3003..."
cd "$ROOT/src/web-interface"
PORT=3003 npm start &
FRONTEND_PID=$!
cd "$ROOT"

sleep 5
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo "❌ Frontend failed to start. Check logs above."
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi
echo "✅ Frontend running (PID $FRONTEND_PID)"
echo ""
echo "=============================================="
echo "  MCS-CEV Optimization is running"
echo "=============================================="
echo "  App:      http://localhost:3003"
echo "  API:      http://localhost:3002"
echo "  Health:   http://localhost:3002/api/health"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "=============================================="
wait
