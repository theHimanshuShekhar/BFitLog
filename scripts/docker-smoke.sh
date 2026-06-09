#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres app

echo "Waiting for app health..."
for _ in {1..30}; do
	if curl -fsS http://localhost:3000/health >/dev/null; then
		echo "App is healthy"
		exit 0
	fi
	sleep 2
done

echo "App did not become healthy" >&2
docker compose logs app >&2
exit 1
