# BFitLog Codebase Audit

Date: 2026-06-09

## Scope and method

This replaces the previous audit with the gaps and risks identified from the current repository state.

Reviewed areas:

- Product/domain documentation: `CONTEXT.md`, `PLAN.md`, `docs/**/*.md`, ADRs `0001` through `0013`.
- Workspace/config/deployment glue: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml`, `playwright.config.ts`, `scripts/docker-smoke.sh`.
- Shared contracts: `packages/shared/src/**/*`.
- API backend: `apps/api/src/**/*`, Drizzle schema/migrations, API Dockerfile/config.
- Mobile app: `apps/mobile/app/**/*`, `apps/mobile/src/**/*`, mobile config.
- E2E coverage: `e2e/user-flows.spec.ts`.

Verification during this replacement was read-only analysis. No test/typecheck command was run for this document-only change.

Severity scale:

- **Critical**: data loss/security issue or core app blocker requiring immediate action.
- **High**: major documented requirement broken, security hardening gap, or likely runtime/data-integrity failure.
- **Medium**: important edge-case bug, incomplete requirement, weak invariant, or maintainability risk.
- **Low**: minor quality, UX, or cleanup issue.

## Summary

No Critical findings were identified from the current read.

Major themes:

1. The implemented product is a strong online-first vertical slice, but offline workout logging remains a documentation/architecture mismatch.
2. Several old audit items appear fixed: production Better Auth secret hard-fails, development trusted origins are gated to development, body-weight local storage is user-scoped, destructive confirmations are async, Good Form is surfaced, planned-exercise validation is stronger, default-admin bootstrap and last-admin protection exist, and Docker startup runs migrate + seed.
3. Remaining gaps concentrate around stale setup UI, inconsistent password policy, goals/reminders conflict handling, notification device wiring, admin plan/media editing UI, native API configuration, and DB/resource invariants.
4. E2E coverage is broad, but some tests rely on direct DB mutation and local/dev assumptions.

## Findings

### High

#### H-01 — Offline workout logging remains documented but not implemented

**Evidence**

- `CONTEXT.md` defines Offline Logs as Workout Logs or Body Weight Logs created while disconnected and synced later.
- ADRs `0005` and `0006` describe offline-created Workout Logs/Set Logs using client-generated IDs and last-write-wins conflict policy.
- Current mobile body-weight and goals/reminders have local repositories, but workout actions in `apps/mobile/src/workouts/workout-api.ts` are HTTP-only.
- `apps/mobile/app/workout.tsx` saves workout draft/exercise/checklist/complete/discard/delete through API calls; there is no local workout repository or retry queue.
- API workout routes own persistence and do not expose a general client-generated offline sync contract for workout drafts/sets/checklists/substitutions.

**Impact**

A disconnected user cannot start, save, complete, skip, substitute, or checklist a workout. This breaks the documented v1 offline logging model and makes the offline story uneven: body weight works offline, workouts do not.

**Recommended change**

Choose one clean direction:

1. Re-scope docs/ADRs/PLAN to say offline workout logging is out of v1, preserving current online-only implementation; or
2. Add a workout local-first repository with client IDs, dirty tracking, conflict policy, sync endpoints, and tests for draft/set/checklist/skip/substitution flows.

#### H-02 — Stale legacy setup flow conflicts with current default-admin onboarding

**Evidence**

- ADR `0013` says first-run setup is now default admin bootstrap: operator logs in as `admin` / `admin`, creates the first real User, then default admin is deleted.
- API `POST /setup` is intentionally legacy and returns `410`.
- Mobile still registers and implements `/setup` in `apps/mobile/app/setup.tsx` and client validation in `apps/mobile/src/setup/setup-validation.ts`.
- Home still contains logic to redirect to `/setup` if `/setup/status` ever reports setup required.
- First-user onboarding in `apps/mobile/app/first-user.tsx` is the current real path.

**Impact**

Users or future maintainers can be routed into a dead/deprecated setup screen that contradicts the actual bootstrap flow. This also keeps tests and validation code alive for a feature the server rejects.

**Recommended change**

Remove the setup screen and setup validation tests, or replace `/setup` with a short redirect/explanation pointing to default-admin onboarding. Keep `GET /setup/status` only if needed for compatibility.

#### H-03 — Password policy is inconsistent across layers

**Evidence**

- `packages/shared/src/auth.ts` defines `passwordSchema` with a stricter minimum than several app flows.
- Better Auth configuration allows shorter passwords than the admin/first-user UI.
- Mobile first-user/admin password flows use an 8-character policy.
- E2E setup/admin flows include test passwords that depend on route-specific behavior rather than one shared policy.

**Impact**

Different signup/change/reset paths can accept different password strengths. Tests and UI copy can drift from backend enforcement, and direct auth paths may allow weaker passwords than intended.

**Recommended change**

Pick one password policy and centralize it in shared code/constants. Apply it to Better Auth config, admin routes, first-user UI, change-password UI, setup remnants if kept, and E2E fixtures.

#### H-04 — Native mobile default API URL points at device-local localhost

**Evidence**

- `apps/mobile/src/api/client.ts` defaults `EXPO_PUBLIC_API_URL` to `http://localhost:3000`.
- On Android devices and many emulator configurations, `localhost` is the device/emulator, not the host running the API.
- Deployment docs require setting `EXPO_PUBLIC_API_URL`, but the runtime default remains silent.

**Impact**

A default native run can fail to reach the API with no obvious configuration error. This is especially risky for Android verification and self-hosted installation attempts.

**Recommended change**

Make native API configuration explicit: require `EXPO_PUBLIC_API_URL` for native builds, derive a safe Expo dev host only in development, or show a blocking configuration error instead of silently using `localhost`.

### Medium

#### M-01 — Goals/reminders local sync can overwrite newer remote state

**Evidence**

- `apps/mobile/src/goals/goal-reminder-repository.ts` is user-scoped and dirty-flag based.
- Dirty local goal/settings are pushed before pulling remote state.
- Unlike body-weight logs/goals, the mobile repository does not compare `updatedAt` before pushing dirty local records.
- API routes do reject stale writes by `updatedAt`, but mobile status handling can still be confusing when sync fails or local reload masks the failure.

**Impact**

A stale dirty local record can attempt to overwrite newer remote state and surface as a sync failure. The UI may then show misleading status after reloading local state. Conflict behavior is weaker and less clear than body-weight sync.

**Recommended change**

Mirror the body-weight conflict model in goals/reminders: compare timestamps locally where possible, preserve explicit stale-write errors, and keep UI status as pending/error until a successful push/pull completes.

#### M-02 — Notification device metadata appears server-side only

**Evidence**

- `docs/notifications.md` says BFitLog records notification permission/device metadata.
- API routes support notification device records under reminders/goals routes.
- Mobile goals/reminders code manages workout frequency and reminder settings, but no current mobile permission request/device upsert path was identified.

**Impact**

The app can store reminder settings but may not actually register device permission/device metadata from the client. Notification readiness remains incomplete, especially for Android native scheduling verification.

**Recommended change**

Wire mobile notification permission checks and device registration/upsert to the existing API. Keep platform scheduling behavior separately gated by Android development-build and web PWA/HTTPS constraints.

#### M-03 — Admin plan/exercise/media editor UI is still missing or incomplete

**Evidence**

- `CONTEXT.md` says admins can manage plan data.
- API admin routes include training template/day/planned-exercise edit support.
- Mobile admin UI in `apps/mobile/src/admin/AdminUserManagement.tsx` focuses on users, password reset, roles, and Partner Links.
- No full mobile admin UI for training plan, exercise, substitute, or media editing was identified.

**Impact**

Admins cannot manage plan/exercise/media data through the app surface as documented. Operationally, plan updates depend on seed changes, direct API use, or future UI work.

**Recommended change**

Either implement the admin plan/exercise/media editor UI and client methods, or downgrade the documented claim to “API/seed-managed plan data” until UI exists.

#### M-04 — Many backend modules create independent database pools

**Evidence**

- `createDb()` creates a new `pg.Pool`.
- API app/auth/bootstrap/visibility/route modules instantiate DB clients at module scope in multiple places.
- Migration code has stricter `DATABASE_URL` behavior than some runtime module fallbacks.

**Impact**

One API process can open more Postgres connections than expected, which matters for small self-hosted deployments. It also makes transaction sharing, shutdown cleanup, and tests harder to reason about.

**Recommended change**

Create one DB/pool per process and inject it into auth/app/routes/bootstrap. Add explicit close hooks for tests and server shutdown.

#### M-05 — Notification device IDs are route-disciplined, not database-enforced

**Evidence**

- `notification_devices` has a user index but no unique constraint on `device_id` or `(user_id, device_id)` in the Drizzle schema.
- Route behavior treats device ID as an upsert key.

**Impact**

Manual writes, future routes, or race conditions can create duplicate device rows. Reminder delivery and permission state can then become ambiguous.

**Recommended change**

Add an appropriate uniqueness constraint, likely `(user_id, device_id)` unless device IDs are intended to be globally unique, and align route upsert behavior with that constraint.

#### M-06 — Body-weight kg values are text-backed and rely on route discipline

**Evidence**

- Shared schemas enforce positive kg values with one-decimal precision.
- API serialization normalizes body-weight values with numeric conversion and `toFixed(1)`.
- Database schema stores body-weight kg fields as text, without numeric CHECK constraints.

**Impact**

Manual/future writes can insert invalid values that later parse to `NaN`, break chart assumptions, or sync back to clients. Current API validation helps but is not a storage invariant.

**Recommended change**

Migrate kg fields to numeric with appropriate precision/scale, or add strict CHECK constraints if text storage is retained.

#### M-07 — Training order uniqueness is not strongly enforced

**Evidence**

- Training Days are ordered rotating sequence steps.
- Plan rendering and next-day logic rely on `sequence` and sort-order fields.
- Current schema uses indexes, but uniqueness of per-template day sequence and per-day item sort slots is not generally enforced.

**Impact**

Admin/API/data edits can create duplicate ordering values. Rotation and UI order can become nondeterministic.

**Recommended change**

Add unique constraints for intended one-per-slot ordering, such as `training_days(template_id, sequence)`, `planned_exercises(training_day_id, sort_order)`, checklist item order, and media order where applicable.

#### M-08 — Seed idempotency may ignore canonical updates

**Evidence**

- The training-plan seed is intended as source-controlled canonical starter content.
- Seed code is idempotent and safe for first install.
- Existing seed/idempotency patterns can avoid updating already-existing rows when canonical content changes.

**Impact**

A deployed database can drift from source-controlled seed content. Fixes to exercise descriptions/media/substitutes may not reach existing installs unless delivered as explicit migrations or admin edits.

**Recommended change**

Define the policy: either seed data is create-only and future canonical changes are migrations, or seed-owned fields use controlled upserts that preserve intentional admin/user edits.

#### M-09 — Shared schemas and API DTOs are not clearly separated

**Evidence**

- `packages/shared/src/training.ts` models persisted/domain workout structures.
- API workout responses include view-specific details such as substitutes and omit some persistence fields in nested set payloads.
- Mobile consumes API DTOs directly through client wrappers rather than validating against shared response schemas.

**Impact**

The shared package is not a complete API contract for workout responses. Future validation or client reuse can reject valid responses or silently drift from route output.

**Recommended change**

Split persisted domain schemas from API request/response DTO schemas, or align route serialization with shared DTO schemas and use them in tests.

#### M-10 — E2E tests rely on direct DB mutation and dev assumptions

**Evidence**

- `e2e/user-flows.spec.ts` seeds/cleans test users and artifacts through direct DB access and hard-coded usernames/notes.
- Tests run against local Postgres/API/Expo web with dev secrets/origins and a persistent test user.
- Some test passwords bypass normal policy by direct account mutation.

**Impact**

E2E coverage is useful for flows, but it can hide differences from real admin/user creation paths and production-like config. Direct DB cleanup can also remove unintended records if naming conventions collide.

**Recommended change**

Keep direct DB setup only where it is explicitly test infrastructure, but align fixture password policy with production rules and constrain cleanup by test-owned IDs rather than broad username/note patterns.

### Low

#### L-01 — Auth request/header construction is duplicated across mobile modules

**Evidence**

- `apps/mobile/src/api/auth-request.ts` centralizes authenticated request behavior.
- Several mobile modules still build cookie/auth headers directly in their own API wrappers.

**Impact**

Current behavior is mostly similar, but future cookie/native/web credential changes can drift across modules.

**Recommended change**

Route all authenticated API calls through the same helper unless a module has a documented reason to differ.

#### L-02 — Corrupt cached training plan JSON can bypass network recovery

**Evidence**

- Plan screen caches active plan JSON in AsyncStorage.
- Cached plan parsing is not fully isolated from the network fallback path.

**Impact**

A corrupt cache value can throw before the screen recovers by fetching a fresh plan.

**Recommended change**

Wrap cache parse in a small safe-read helper. On parse failure, delete the corrupt cache key and continue to network fetch.

#### L-03 — Some substitute/media display paths expose raw IDs or divergent parsing

**Evidence**

- Workout detail can display a performed substitute by raw `performedExerciseId` when it differs from the original exercise.
- Exercise detail has media parsing behavior that is not fully shared with the plan media helper.

**Impact**

Users can see implementation IDs instead of exercise names, and media embedding may differ between Plan and Exercise detail screens.

**Recommended change**

Resolve substitute exercise names in workout detail DTO/UI and reuse the shared media embed helper everywhere media is rendered.

#### L-04 — History loading couples workout fetch to body-weight sync success

**Evidence**

- Own-user History loads local body-weight data and syncs before fetching/completing workout history updates.
- If body-weight sync fails, workout history may not refresh even when the workout API is reachable.

**Impact**

A body-weight sync problem can stale unrelated workout history UI.

**Recommended change**

Load workout history independently from body-weight sync. Surface separate status messages for body-weight pending/error and workout history errors.

## Areas that look substantially covered

- Default admin bootstrap aligns with ADR `0013`: startup default admin, first real user promotion, default-admin deletion, default-admin app-data guard, and tests exist.
- Production Better Auth secret handling is now stricter: production fails on missing/default secret according to current env code/tests.
- Development trusted origins appear gated to development rather than always trusted in production.
- Body-weight own-data local-first path is user-scoped and substantially implemented: local store, dirty goal/log tracking, tombstones, HTTP sync, server last-write-wins, and tests.
- Online workout draft/start/resume/complete/edit/delete, checklist persistence, multi-set save, skip-note requirement, Good Form payload, history/detail/delete, and stats APIs are present with tests/helpers.
- Partner visibility is implemented in more places than the previous audit described: visible-user picker/hooks exist; history/stats/plan support selected visible users; workout detail allows partner reads while writes remain owner-only.
- Admin user creation, password reset, role changes with last-admin guard, Partner Link creation/listing, and default-admin onboarding exist.
- Docker API startup runs migration and seed before serving, reducing fresh-deploy seeded-plan risk.

## Recommended remediation order

1. Resolve scope contradictions: offline workout logging and stale setup flow.
2. Centralize password policy and native API URL behavior.
3. Harden sync/device behavior: goals/reminders conflict handling and notification device client registration.
4. Reduce backend operational risk: single DB pool, notification-device uniqueness, numeric/ordering constraints.
5. Complete or re-scope admin plan/exercise/media editing UI.
6. Clean low-risk UX/maintainability drift: auth request helper use, cache parse safety, substitute/media display, independent History loading.
