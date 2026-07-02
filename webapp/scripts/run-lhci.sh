#!/bin/bash
# Exit on error
set -e

echo "🚀 Starting SvelteKit preview server..."
# Start server in the background
LIGHTHOUSE_ENABLED=true npx vite preview --host 127.0.0.1 --port 4173 &
SERVER_PID=$!

# Ensure the server process is killed when the script exits
cleanup() {
    echo "🧹 Cleaning up preview server (PID $SERVER_PID)..."
    kill $SERVER_PID || true
}
trap cleanup EXIT

echo "⏳ Waiting for server to respond on http://127.0.0.1:4173/..."
MAX_ATTEMPTS=30
ATTEMPT=0
while true; do
    if curl -s -f http://127.0.0.1:4173/ > /dev/null; then
        echo "✅ Server is ready and pre-warmed!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo "❌ Timeout waiting for server to respond"
        exit 1
    fi
    sleep 1
done

echo "📊 Running Lighthouse CI..."
npx lhci autorun --config=./.lighthouserc.cjs
