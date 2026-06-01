# First Vertical Slice Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build the first BFitLog vertical slice: first-run setup/login, offline-editable body weight goal, offline body weight logging, sync-shaped persistence, and a simple body weight chart on Expo Web and Android.

**Architecture:** Start with a pnpm monorepo containing a universal Expo app, a Hono API, and shared TypeScript schemas. Implement the first slice with a local-first repository boundary so the UI can work offline immediately; keep the sync adapter isolated so the PowerSync spike can replace the initial HTTP-backed sync without rewriting screens.

**Tech Stack:** pnpm workspaces, Node.js, TypeScript, Expo, Expo Router, Hono, Better Auth with the Expo plugin, Zod, Drizzle ORM, Postgres, Docker Compose, Vitest.

---

## Vertical Slice Acceptance Criteria

- First-run setup creates an admin user and partner member when no users exist.
- Users can log in with username/password.
- Current user can set/edit Body Weight Goal in kg with direction.
- Current user can add Body Weight Logs while offline or before sync.
- Body Weight Logs and Body Weight Goal persist locally and are represented in sync-ready client-generated UUID records.
- Web shows a simple body weight chart with 30/90/1y/all ranges and goal reference.
- API exposes health/setup/auth/body-weight endpoints sufficient for the slice.
- Docker Compose starts Postgres and API.
- Tests cover shared schemas, API setup/auth/body-weight behavior, and client body-weight repository behavior.

## Non-goals for this slice

- Full workout logging.
- Training plan seed/import.
- PowerSync production integration.
- Exercise media embedding.
- Android notification scheduling.
- Admin plan editor.

---

### Task 1: Monorepo skeleton

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `apps/api/package.json`
- Create: `apps/mobile/package.json`
- Create: `packages/shared/package.json`

**Steps:**
1. Create pnpm workspace files and package manifests.
2. Add root scripts: `typecheck`, `test`, `lint` placeholders that fan out through pnpm workspaces.
3. Add shared TypeScript base config.
4. Run `pnpm install`.
5. Verify with `pnpm -r exec tsc --version`.

### Task 2: Shared domain schemas

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/body-weight.ts`
- Create: `packages/shared/src/auth.ts`
- Create: `packages/shared/src/sync.ts`
- Create: `packages/shared/src/body-weight.test.ts`
- Modify: `packages/shared/package.json`

**Steps:**
1. Add Zod schemas for UserRole, SetupRequest, LoginRequest, BodyWeightGoal, BodyWeightLog, SyncMetadata.
2. Use client-generated UUID string IDs for syncable records.
3. Model Body Weight Goal as `{ userId, targetKg, direction, updatedAt }`.
4. Model Body Weight Log as `{ id, userId, measuredAt, weightKg, note?, createdAt, updatedAt, deletedAt? }`.
5. Write Vitest tests for valid/invalid kg values and directions.
6. Run `pnpm --filter @bfitlog/shared test`.

### Task 3: Hono API foundation

**Files:**
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/app.test.ts`
- Modify: `apps/api/package.json`

**Steps:**
1. Create Hono app factory.
2. Add `GET /health` returning `{ ok: true }`.
3. Add Vitest test using `app.request('/health')`.
4. Run `pnpm --filter @bfitlog/api test`.

### Task 4: Database schema and migrations

**Files:**
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrate.ts`
- Modify: `apps/api/package.json`

**Steps:**
1. Define Drizzle tables: `users`, `sessions`, `partner_links`, `body_weight_goals`, `body_weight_logs`.
2. Include `created_at`, `updated_at`, and soft-delete `deleted_at` where relevant.
3. Add scripts `db:generate`, `db:migrate`.
4. Generate initial migration with Drizzle Kit.
5. Verify schema generation succeeds.

### Task 5: Docker Compose development stack

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/Dockerfile`
- Create: `.env.example`

**Steps:**
1. Add Postgres service.
2. Add API service depending on Postgres.
3. Set local `DATABASE_URL` and API port envs.
4. Run `docker compose config`.
5. Run `docker compose up -d postgres` and verify Postgres health.

### Task 6: Setup and Better Auth API

**Files:**
- Create: `apps/api/src/auth/auth.ts`
- Create: `apps/api/src/routes/setup.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/setup.test.ts`
- Create: `apps/api/src/routes/auth.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/db/schema.ts`

**Steps:**
1. Configure Better Auth on the Hono backend with the Expo plugin, trusted origins for `bfitlog://` plus Expo development `exp://` origins, and 90-day sessions.
2. Verify whether Better Auth username login is supported cleanly; if not, stop and ask whether BFitLog should switch login identifiers from username to email.
3. Register Hono CORS middleware before auth routes with credentials enabled for the Expo Web development origin and production origin config.
4. Mount the Better Auth handler with `app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))`.
5. Add global Hono middleware that calls `auth.api.getSession({ headers: c.req.raw.headers })` and stores `user`/`session` in context variables.
6. `GET /setup/status` returns whether setup is required.
7. `POST /setup` works only when user count is zero; creates admin, partner member, and Partner Link through Better Auth-compatible user records.
8. Add auth middleware/helpers for protected BFitLog routes using Better Auth session cookies.
9. Test setup disabled after first users exist.
10. Test login/logout/session behavior through Better Auth endpoints.
11. Run API tests.

### Task 7: Body weight API

**Files:**
- Create: `apps/api/src/routes/body-weight.ts`
- Create: `apps/api/src/routes/body-weight.test.ts`
- Modify: `apps/api/src/app.ts`

**Steps:**
1. Add authenticated routes for current user's Body Weight Goal and Body Weight Logs.
2. Support upsert goal with last-write-wins `updatedAt` behavior.
3. Support upsert body weight logs by client-generated UUID.
4. Support soft delete of own logs.
5. Enforce users can mutate only their own logs/goals.
6. Allow linked partner read later, but keep mutation own-only.
7. Run API tests.

### Task 8: Expo app foundation

**Files:**
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/src/api/client.ts`
- Create: `apps/mobile/src/theme.ts`
- Modify: `apps/mobile/package.json`

**Steps:**
1. Initialize Expo app structure manually or via Expo tooling inside `apps/mobile`.
2. Add Expo Router.
3. Create basic app shell.
4. Add API base URL config.
5. Verify `pnpm --filter @bfitlog/mobile typecheck`.
6. Run Expo Web and verify home screen renders.

### Task 9: Better Auth client and setup screens

**Files:**
- Create: `apps/mobile/app/setup.tsx`
- Create: `apps/mobile/app/login.tsx`
- Create: `apps/mobile/src/auth/auth-client.ts`
- Create: `apps/mobile/src/auth/use-auth.ts`
- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/app.json`

**Steps:**
1. Configure the Better Auth Expo client with `@better-auth/expo/client`, `expo-secure-store`, the `bfitlog` URL scheme, and the API base URL.
2. On launch, call setup status.
3. If setup required, show setup form for admin + partner usernames/passwords.
4. If not authenticated, show login using Better Auth client methods.
5. Use Better Auth session hooks/cache for session state.
6. For BFitLog API requests on native, attach Better Auth cookies from `authClient.getCookie()` and use `credentials: 'omit'`; for web cross-origin requests, use credentials/CORS behavior compatible with Better Auth cookies.
7. Route authenticated user to Home.
8. Verify setup/login against local API on Web.

### Task 10: Local-first body weight repository

**Files:**
- Create: `apps/mobile/src/body-weight/body-weight-store.ts`
- Create: `apps/mobile/src/body-weight/body-weight-repository.ts`
- Create: `apps/mobile/src/body-weight/body-weight-repository.test.ts`

**Steps:**
1. Implement a repository API: `getGoal`, `saveGoal`, `listLogs`, `saveLog`, `deleteLog`, `sync`.
2. Store records locally first with dirty flags.
3. Implement HTTP sync adapter against Body Weight API.
4. Use last-write-wins for goal updates.
5. Write tests for offline save then sync.
6. Keep this boundary replaceable by PowerSync.

### Task 11: Body weight goal UI

**Files:**
- Create: `apps/mobile/app/settings.tsx`
- Create: `apps/mobile/src/body-weight/BodyWeightGoalForm.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Steps:**
1. Add Settings screen.
2. Add Body Weight Goal form with target kg and direction.
3. Save through local-first repository.
4. Show sync/dirty state.
5. Verify offline edit persists locally.

### Task 12: Body weight log UI

**Files:**
- Create: `apps/mobile/src/body-weight/AddBodyWeightLogForm.tsx`
- Modify: `apps/mobile/app/index.tsx`

**Steps:**
1. Add Home quick action to add body weight.
2. Save log locally with client UUID.
3. Show latest body weight entry on Home.
4. Show unsynced state when sync fails/offline.
5. Verify log survives app refresh/reload.

### Task 13: Body weight stats chart

**Files:**
- Create: `apps/mobile/app/stats.tsx`
- Create: `apps/mobile/src/body-weight/BodyWeightChart.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Steps:**
1. Add Stats screen.
2. Render simple body weight chart with 30/90/1y/all filters.
3. Display Body Weight Goal reference line/label.
4. Keep chart library compatible with Expo Web and Android.
5. Verify chart renders on Web.

### Task 14: PowerSync spike checkpoint

**Files:**
- Create: `docs/spikes/powersync-body-weight.md`

**Steps:**
1. Document whether the repository boundary can be replaced by PowerSync.
2. Identify needed PowerSync tables/sync rules for body weight goal/logs.
3. Verify Expo Web worker requirements.
4. Decide whether to proceed with PowerSync integration before workout logging.

### Task 15: Final verification for first slice

**Files:**
- Modify docs as needed.

**Steps:**
1. Run `pnpm test`.
2. Run `pnpm typecheck`.
3. Run `docker compose config`.
4. Start API + Postgres locally.
5. Run Expo Web.
6. Manually verify setup → login → edit goal → add weight → chart.
7. Record Android verification steps to run with Expo Go/development build.
