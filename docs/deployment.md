# Deployment notes

BFitLog is intended to run as a self-hosted Docker Compose stack with a Postgres database and one `app` service that serves both the Hono API and exported Expo web app. The public deployment can use one Cloudflare Tunnel/domain: `/` serves the Expo web app and `/api/v1/*` serves the API.

## Required production environment

Set these values explicitly in production; do not rely on development defaults from `.env.example`.

```bash
POSTGRES_USER=bfitlog
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=bfitlog
PORT=3000
EXPO_PUBLIC_API_URL=https://bfitlog.example.com
BETTER_AUTH_SECRET=<strong-random-secret>
BETTER_AUTH_SECURE_COOKIES=true
BETTER_AUTH_TRUSTED_ORIGINS=https://bfitlog.example.com,bfitlog://
CORS_ALLOWED_ORIGINS=https://bfitlog.example.com
```

`docker-compose.yml` derives the app container `DATABASE_URL` from `POSTGRES_*` and derives `BETTER_AUTH_URL` from `EXPO_PUBLIC_API_URL`.

Generate `BETTER_AUTH_SECRET` with at least 32 bytes of entropy:

```bash
openssl rand -base64 32
```

Keep this value stable. Rotating it invalidates existing Better Auth sessions.

## Reverse proxy and HTTPS assumptions

Production should terminate HTTPS in front of the app container. The app listens on `PORT` inside Docker and expects the reverse proxy or Cloudflare Tunnel to expose one public origin.

Public routing:

- `https://bfitlog.example.com/` serves the Expo web app.
- `https://bfitlog.example.com/api/v1/` returns API metadata.
- `https://bfitlog.example.com/api/v1/*` serves API routes.
- `https://bfitlog.example.com/api/v1/auth/*` serves Better Auth routes.

Recommended reverse proxy responsibilities:

- terminate TLS and redirect HTTP to HTTPS;
- forward `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers;
- route the single public app/API origin to the `app` service on port `3000`;
- enforce request body limits appropriate for JSON API traffic;
- keep `BETTER_AUTH_URL` and `EXPO_PUBLIC_API_URL` on the same HTTPS origin to simplify cookie behavior.

Example Caddy-style shape:

```caddyfile
bfitlog.example.com {
  reverse_proxy app:3000
}
```

If the web app is hosted separately later, include its HTTPS origin in both `CORS_ALLOWED_ORIGINS` and `BETTER_AUTH_TRUSTED_ORIGINS`. In development, an empty `CORS_ALLOWED_ORIGINS` allows reflected origins for convenience; in production, set the variable explicitly.

## Dockhand deployment notes

Dockhand should deploy the repository with the root `docker-compose.yml` as the stack entrypoint.

Checklist for a Dockhand environment:

1. Create a production environment file with the variables above.
2. Persist the `postgres_data` Docker volume.
3. Expose only the reverse proxy publicly; keep Postgres private to the Docker network during normal operation.
4. Point the reverse proxy public hostname at the app service. Frontend/mobile clients must talk only to the app URL; Postgres stays private.
5. Let the app process run database migrations and the idempotent training-plan seed on every startup before it begins serving requests.

Postgres is intentionally not published on the host in `docker-compose.yml`. The normal migration path is app startup over the Docker internal network, so production migrations do not require opening the database port. For emergency/manual database inspection, use `docker compose exec postgres ...` from the host rather than publishing Postgres publicly.

### Postgres password mismatch after changing `.env.prod`

The official Postgres image reads `POSTGRES_PASSWORD` only when it initializes a new database volume. Changing `POSTGRES_PASSWORD` later does not rewrite the password inside an existing `postgres_data` volume. If the app fails on startup with `password authentication failed for user "bfitlog"` during migrations, the app is using a different password than the existing database role.

Safe options:

1. Set `POSTGRES_PASSWORD` back to the password that initialized the existing volume, then restart the app.
2. If you can still connect with the old password, rotate the database role explicitly:

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-bfitlog}" \
  -d "${POSTGRES_DB:-bfitlog}" \
  -c "ALTER USER \"${POSTGRES_USER:-bfitlog}\" WITH PASSWORD '<new-password>';"
```

Then update `.env.prod` to the same `<new-password>` and restart the app.

Destructive option: remove the `postgres_data` volume and redeploy. This resets all production data and should only be used before real data exists.

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

After restore, restart the app and run a health check:

```bash
docker compose restart app
curl -fsS https://bfitlog.example.com/health
```
