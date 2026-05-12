#!/bin/bash
# Start the Mission Control API Bridge
# This makes your local data available to the Lovable Mission Control

echo "=========================================="
echo "  Starting Mission Control API Bridge"
echo "=========================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Install from: https://nodejs.org/"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start the server
cd "$SCRIPT_DIR"
node "$SCRIPT_DIR/mission-control-api.js" &

SERVER_PID=$!

echo ""
echo "Server started with PID: $SERVER_PID"
echo ""
echo "Your Mission Control API is running at:"
echo "  http://localhost:3456"
echo ""
echo "Available endpoints:"
echo "  - /api/all     (complete data snapshot)"
echo "  - /api/kpis    (KPI metrics)"
echo "  - /api/deals   (deals pipeline)"
echo "  - /api/tasks   (task board)"
echo "  - /api/agents  (agent team)"
echo "  - /api/calendar (events)"
echo "  - /health      (status check)"
echo ""
echo "To connect from Lovable:"
echo "  fetch('http://localhost:3456/api/all')"
echo "    .then(r => r.json())"
echo "    .then(data => console.log(data));"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Wait for interrupt
trap "kill $SERVER_PID 2>/dev/null; echo 'Server stopped'; exit" INT
echo $SERVER_PID > /tmp/mission-control-api.pid
wait $SERVER_PID