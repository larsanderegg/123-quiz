#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install Caddy via Homebrew if not present
if ! command -v caddy &> /dev/null; then
    echo "Caddy not found. Installing via Homebrew..."
    brew install caddy
fi

# Start Caddy in the background (caddy trust needs the admin API on port 2019)
caddy run --config "$SCRIPT_DIR/Caddyfile" &
CADDY_PID=$!
trap "kill $CADDY_PID 2>/dev/null; exit" INT TERM

# Wait for the admin API to be ready
echo "Starting Caddy..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:2019/pki/ca/local > /dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# Install Caddy's root CA into the system keychain (only needed once)
echo "Trusting Caddy's local CA (may prompt for sudo password)..."
caddy trust

echo ""
echo "Proxy running: https://localhost:8443 → http://192.168.0.65"
echo "Set the LED API URL in the app to: https://localhost:8443"
echo "Press Ctrl+C to stop."
echo ""

wait $CADDY_PID
