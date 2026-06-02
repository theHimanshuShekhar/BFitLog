# Deployment notes

BFitLog is intended to run as a self-hosted Docker Compose stack with a Postgres database and the Hono API. The Expo app is built separately for web/Android and points at the public API URL.

## Required production environment

Set these values explicitly in production; do not rely on development defaults from `.env.example`.

```bash
POSTGRES_USER=bfitlog
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=bfitlog
DATABASE_URL=postgres://bfitlog:<strong-random-password>@postgres:5432/bfitlog
PORT=3000
BETTER_AUTH_SECRET=<strong-random-secret>
BETTER_AUTH_URL=https://bfitlog.example.com
EXPO_PUBLIC_API_URL=https://bfitlog.example.com
```

Generate `BETTER_AUTH_SECRET` with at least 32 bytes of entropy:

```bash
openssl rand -base64 32
```

Keep this value stable. Rotating it invalidates existing Better Auth sessions.

## Reverse proxy and HTTPS assumptions

Production should terminate HTTPS in front of the API container. The API itself listens on `PORT` inside Docker and expects the reverse proxy to expose `BETTER_AUTH_URL` publicly.

Recommended reverse proxy responsibilities:

- terminate TLS and redirect HTTP to HTTPS;
- forward `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers;
- route the public app/API origin to the API service on port `3000`;
- enforce request body limits appropriate for JSON API traffic;
- keep `BETTER_AUTH_URL` and `EXPO_PUBLIC_API_URL` on the same HTTPS origin when possible to simplify cookie behavior.

Example Caddy-style shape:

```caddyfile
bfitlog.example.com {
  reverse_proxy api:3000
}
```

If the web app is hosted separately, update API CORS production config before exposing it publicly. The current development config reflects any origin and should be hardened before production internet exposure.

## Dockhand deployment notes

Dockhand should deploy the repository with the root `docker-compose.yml` as the stack entrypoint.

Checklist for a Dockhand environment:

1. Create a production environment file with the variables above.
2. Persist the `postgres_data` Docker volume.
3. Expose only the reverse proxy publicly; keep Postgres private to the Docker network.
4. Point the reverse proxy public hostname at the API service.
5. Run database migrations before or during API startup. The API image currently runs migrations on container startup.
6. Run the training-plan seed command after first deploy or include it as a one-off Dockhand task:

```bash
docker compose run --rm api pnpm --filter @bfitlog/api db:seed:training-plan
```

## Postgres backup

Create logical backups with `pg_dump` from the running Compose stack:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-bfitlog}" \
  -d "${POSTGRES_DB:-bfitlog}" \
  --format=custom \
  --no-owner \
  --file=/tmp/bfitlog.dump
docker compose cp postgres:/tmp/bfitlog.dump backups/bfitlog-$(date +%Y%m%d-%H%M%S).dump
```

For small installs, also keep periodic plain SQL exports for easy inspection:

```bash
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-bfitlog}" \
  -d "${POSTGRES_DB:-bfitlog}" \
  --no-owner > backups/bfitlog-$(date +%Y%m%d-%H%M%S).sql
```

Store backups outside the host running Docker, and periodically test restores.

## Postgres restore

Restore into an empty database or a disposable staging stack first.

Custom-format restore:

```bash
docker compose cp backups/bfitlog.dump postgres:/tmp/bfitlog.dump
docker compose exec -T postgres dropdb -U "${POSTGRES_USER:-bfitlog}" --if-exists "${POSTGRES_DB:-bfitlog}"
docker compose exec -T postgres createdb -U "${POSTGRES_USER:-bfitlog}" "${POSTGRES_DB:-bfitlog}"
docker compose exec -T postgres pg_restore \
  -U "${POSTGRES_USER:-bfitlog}" \
  -d "${POSTGRES_DB:-bfitlog}" \
  --no-owner \
  /tmp/bfitlog.dump
```

Plain SQL restore:

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-bfitlog}" \
  -d "${POSTGRES_DB:-bfitlog}" < backups/bfitlog.sql
```

After restore, restart the API and run a health check:

```bash
docker compose restart api
curl -fsS https://bfitlog.example.com/health
```
