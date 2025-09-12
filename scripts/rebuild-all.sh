#!/usr/bin/env bash
set -euo pipefail

echo "[rebuild] Stopping stack..."
docker compose down || true

echo "[rebuild] Building images (no cache)..."
docker compose build --no-cache backend web

echo "[rebuild] Starting db, backend and web..."
docker compose up -d db backend web

echo "[rebuild] Waiting for backend health..."
for i in {1..60}; do
  status=$(curl -s http://localhost:3000/health || true)
  if echo "$status" | grep -q '"ok":true'; then
    echo "[rebuild] Backend healthy."
    break
  fi
  sleep 1
  if [[ "$i" == "60" ]]; then
    echo "[rebuild] Timeout waiting for backend health." >&2
    exit 1
  fi
done

echo "[rebuild] Applying migrations and seeding (idempotent)..."
docker compose exec -T backend npm -w @edu/backend run -s prisma:deploy || true
docker compose exec -T backend npm -w @edu/backend run -s prisma:seed || true

echo "[rebuild] Done. Open http://localhost:5173 (UI)"

