#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres api

echo "Waiting for API health..."
for _ in {1..30}; do
  if curl -fsS http://localhost:3000/health >/dev/null; then
    echo "API is healthy"
    exit 0
  fi
  sleep 2
done

echo "API did not become healthy" >&2
docker compose logs api >&2
exit 1
