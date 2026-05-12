#!/bin/bash
# Start Mission Control Full Integration
# - Live API server (port 3456)
# - Webhook server (port 3457)
# - Polling sync

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================="
echo "  Mission Control Full Integration"
echo "=========================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

cd "$SCRIPT_DIR"

echo "Starting services..."
echo ""

# Kill any existing servers
echo "[INIT] Stopping existing servers..."
pkill -f "mission-control-api" 2>/dev/null || true
pkill -f "kpi-data-sync" 2>/dev/null || true
sleep 2

# Start the live API server
echo "[API] Starting Mission Control API on port 3456..."
node "$SCRIPT_DIR/mission-control-api-live.js" &
API_PID=$!
echo $API_PID > /tmp/mission-control-api.pid

# Wait for API to be ready
sleep 3
echo "[API] Checking health..."
for i in {1..5}; do
    if curl -s http://localhost:3456/health > /dev/null 2>&1; then
        echo "[API] ✓ Server ready"
        break
    fi
    sleep 1
done

# Start the webhook/polling sync
echo ""
echo "[SYNC] Starting KPI data sync..."
python3 "$SCRIPT_DIR/kpi-data-sync.py" --mode webhook &
SYNC_PID=$!
echo $SYNC_PID > /tmp/kpi-data-sync.pid

sleep 2

echo ""
echo "=========================================="
echo "  All Services Running"
echo "=========================================="
echo ""
echo "✓ API Server:      http://localhost:3456"
echo "✓ Webhook Server:  http://localhost:3457"
echo ""
echo "Test endpoints:"
echo "  curl http://localhost:3456/health"
echo "  curl http://localhost:3456/api/all"
echo ""
echo "From Lovable, use:"
echo "  fetch('http://localhost:3456/api/all')"
echo "    .then(r => r.json())"
echo "    .then(data => console.log(data));"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "
    echo ''; 
    echo '[SHUTDOWN] Stopping services...'; 
    kill $API_PID 2>/dev/null || true; 
    kill $SYNC_PID 2>/dev/null || true; 
    rm -f /tmp/mission-control-api.pid /tmp/kpi-data-sync.pid; 
    echo '[SHUTDOWN] All services stopped';
    exit
" INT

# Keep script running
wait
