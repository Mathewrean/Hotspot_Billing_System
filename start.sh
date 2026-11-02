#!/bin/bash
# FastNet Startup Script
# Starts cloudflared tunnel, updates MPESA_CALLBACK_URL, starts server, shows QR code

set -e

PROJECT_DIR="/home/mathewrean/Projects/mpesa_billing/Hotspot_Billing_System"
ENV_FILE="$PROJECT_DIR/.env"
PORT=5000
LOG_FILE="/tmp/kilo/cloudflared_output.log"

echo "=============================================="
echo "  FastNet WiFi Hotspot Billing System"
echo "  Startup Script v1.0"
echo "=============================================="
echo ""

# Step 1: Start cloudflared tunnel
echo "[1/4] Starting cloudflared tunnel on port $PORT..."
cloudflared tunnel --url http://localhost:$PORT > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL to appear (up to 60 seconds)
echo "   Waiting for tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 60); do
  if [ -f "$LOG_FILE" ] && grep -q "trycloudflare.com" "$LOG_FILE" 2>/dev/null; then
    TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$LOG_FILE" | head -1)
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "   ERROR: Failed to get tunnel URL."
  echo "   Last log output:"
  tail -5 "$LOG_FILE" 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  exit 1
fi

echo "   Tunnel URL: $TUNNEL_URL"

# Step 2: Update .env with new callback URL
echo "[2/4] Updating .env with MPESA_CALLBACK_URL..."
CALLBACK_URL="$TUNNEL_URL/api/mpesa/callback"

# Replace existing MPESA_CALLBACK_URL line
if grep -q "^MPESA_CALLBACK_URL=" "$ENV_FILE"; then
  sed -i "s|^MPESA_CALLBACK_URL=.*|MPESA_CALLBACK_URL=$CALLBACK_URL|" "$ENV_FILE"
else
  echo "MPESA_CALLBACK_URL=$CALLBACK_URL" >> "$ENV_FILE"
fi

echo "   MPESA_CALLBACK_URL=$CALLBACK_URL"

# Step 3: Start Node.js server
echo "[3/4] Starting Node.js server on port $PORT..."
cd "$PROJECT_DIR"
NODE_ENV=production node server.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 3

# Step 4: Show QR code
echo "[4/4] Displaying QR code for tunnel URL..."
echo ""
echo "   Scan this QR code to open the FastNet portal:"
echo ""
node -e "require('qrcode-terminal').generate('$TUNNEL_URL', {small: true})"
echo ""
echo "   Portal URL: $TUNNEL_URL"
echo ""

# Summary
echo "----------------------------------------------"
echo "  FASTNET IS RUNNING"
echo "----------------------------------------------"
echo "  Server PID : $SERVER_PID"
echo "  Tunnel PID : $TUNNEL_PID"
echo "  Portal URL : $TUNNEL_URL"
echo "  Callback   : $CALLBACK_URL"
echo ""
echo "  Admin: http://localhost:$PORT/admin/login"
echo "  Dashboard: http://localhost:$PORT/dashboard"
echo ""
echo "  Press Ctrl+C to stop everything"
echo "----------------------------------------------"
echo ""

# Trap cleanup on exit
cleanup() {
  echo ""
  echo "Stopping FastNet..."
  kill $SERVER_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  echo "Stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
