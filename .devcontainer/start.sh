#!/usr/bin/env bash
# .devcontainer/start.sh
# Runs automatically on every codespace start/resume.
# Ensures Docker services and Vite dev server are running.

set -euo pipefail
cd /workspaces/Phase1

echo "🚀 [start.sh] Starting services..."

# ── 1. Docker Compose services ────────────────────────────────────────────────
echo "🐳 Bringing up Docker Compose services..."
docker compose up -d --remove-orphans 2>&1 || {
  echo "⚠️  docker compose up failed – check docker-compose.yml"
}

# Wait for backend health
echo "⏳ Waiting for backend to be healthy..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' farmer-backend 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "healthy" ]]; then
    echo "✅ Backend healthy after ${i}s"
    break
  fi
  sleep 1
done

# ── 2. Vite dev server ────────────────────────────────────────────────────────
# Kill any stale vite processes first
pkill -f "vite" 2>/dev/null || true
sleep 1

echo "⚡ Starting Vite dev server on port 5173..."
cd /workspaces/Phase1/frontend

# setsid + stdin from /dev/null prevents the EIO crash when TTY disconnects
setsid npm run dev -- --host 0.0.0.0 < /dev/null >> /tmp/vite.log 2>&1 &
VPID=$!
echo "Vite PID: $VPID"

# Wait up to 15s for port 5173 to open
for i in $(seq 1 15); do
  if lsof -ti:5173 > /dev/null 2>&1; then
    echo "✅ Vite listening on :5173 after ${i}s"
    break
  fi
  sleep 1
done

echo "🎉 [start.sh] All services started."
