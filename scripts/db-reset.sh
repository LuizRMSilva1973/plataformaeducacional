#!/usr/bin/env bash
set -euo pipefail

echo "[db-reset] Stopping and removing containers/volumes..."
docker compose down -v

echo "[db-reset] Starting stack..."
docker compose up -d

echo "[db-reset] Waiting for Postgres on 127.0.0.1:55432..."
for i in {1..60}; do
  if (echo > /dev/tcp/127.0.0.1/55432) >/dev/null 2>&1; then
    echo "[db-reset] Postgres is up."
    break
  fi
  sleep 1
  if [[ "$i" == "60" ]]; then
    echo "[db-reset] Timeout waiting for Postgres." >&2
    exit 1
  fi
done

echo "[db-reset] Applying migrations..."
npm -w @edu/backend run prisma:deploy

echo "[db-reset] Seeding database..."
npm -w @edu/backend run prisma:seed

echo "[db-reset] Done. Backend on http://localhost:3000, Web on http://localhost:5173"

