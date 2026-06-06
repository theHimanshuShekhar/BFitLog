# BFitLog Codebase Audit

Date: 2026-06-05

## Scope and method

This is a read-only audit of the current BFitLog repository against the documented product/domain requirements in `CONTEXT.md`, `PLAN.md`, `docs/**/*.md`, and ADRs `0001` through `0013`.

Reviewed areas:

- `packages/shared/src/**/*` shared Zod schemas and domain contracts.
- `apps/api/src/**/*` Hono routes, Better Auth integration, bootstrap logic, Drizzle schema, migrations, and training-plan seed.
- `apps/mobile/app/**/*` and `apps/mobile/src/**/*` Expo Router screens, auth, body-weight local-first repository, goals/reminders, admin UI, plan/history/stats/workout flows.
- `docker-compose.yml`, API Dockerfile, and deployment docs.

Verification run during audit:

- `pnpm test` — passed: shared 8 tests, mobile 23 tests, API 28 tests.
- `pnpm typecheck` — passed for shared, API, and mobile workspaces.

Passing tests/typecheck do not invalidate the findings below; several issues are requirements gaps or missing edge-case coverage.

Severity scale:

- **Critical**: data loss/security issue or core app blocker requiring immediate action.
- **High**: major documented requirement broken, security hardening gap, or likely runtime/data-integrity failure.
- **Medium**: important edge-case bug, incomplete requirement, weak invariant, or maintainability risk.
- **Low**: minor quality, UX, or cleanup issue.

## Summary

No Critical findings were identified.

Major themes:

1. Several roadmap items marked complete are only partially implemented, especially offline workout sync, partner visibility UI, admin plan/media editing UI, goals/reminders offline persistence, and rest timer behavior.
2. Some domain invariants exist in shared schemas but are not enforced by API routes or database constraints.
3. Workout progression and Good Form handling are currently too permissive and can produce unsafe/incorrect progression hints.
4. Android-specific behavior needs attention: destructive confirmations execute immediately, and the default API URL points at device-local `localhost`.
5. Production hardening docs are stronger than runtime enforcement for auth secrets and trusted origins.

## Findings

### High

#### H-01 — Production can boot with a known Better Auth secret

**Evidence**

- `apps/api/src/auth/auth.ts` falls back to `development-secret-change-before-production` when `BETTER_AUTH_SECRET` is unset.
- `PLAN.md` marks strong production Better Auth secret docs and production security hardening complete.

**Impact**

A production deployment missing `BETTER_AUTH_SECRET` can run with a known signing secret. Depending on Better Auth token/session internals, this can enable session/cookie forgery or invalidate the assumed production trust boundary.

**Recommended change**

Fail startup in production when `BETTER_AUTH_SECRET` is missing or equals the development placeholder. Keep a dev-only fallback gated by `NODE_ENV !== "production"`.

#### H-02 — Offline workout logging remains a documented v1 requirement but is online-only

**Evidence**

- `CONTEXT.md` defines Offline Logs as Workout Logs or Body Weight Logs created disconnected and synced later.
- ADR `0005` and ADR `0006` say v1 supports offline-created workout logs and set logs with client-generated UUIDs and last-write-wins conflict policy.
- `PLAN.md` marks offline workout/set/checklist/skip/substitution sync as partially complete/deferred.
- `apps/mobile/src/workouts/workout-api.ts` exposes only HTTP calls for workout draft creation, set save, checklist save, complete/discard/delete.
- `apps/api/src/routes/workouts.ts` generates workout and set IDs server-side rather than accepting client-generated sync IDs.
- Body weight has a local-first repository; workouts do not.

**Impact**

A disconnected user cannot start, save, complete, skip, substitute, or checklist a workout. This breaks a core documented offline logging promise.

**Recommended change**

Either reclassify offline workout logging as out of v1 in `CONTEXT.md`/ADRs/`PLAN.md`, or add a workout local-first repository with client-generated IDs, dirty tracking, sync endpoints accepting those IDs, and tests for offline draft/set/checklist/skip/substitution sync.

#### H-03 — Partner Visibility is incomplete in UI and workout detail API

**Evidence**

- `CONTEXT.md` says both users can see each other's plans, workout logs, body weight, and stats.
- API read support exists for some resources via `userId` query params and `canReadUserData`.
- Mobile Stats and History call current-user-only APIs/local repositories and expose no visible-user selector.
- `apps/api/src/routes/training-plan.ts` active-plan endpoint returns only the current user's plan.
- `GET /workouts/:workoutId` loads by `workoutLogs.userId == currentUser.id`, so linked partners can list another user's workouts but cannot open detail.

**Impact**

Linked partners cannot use the normal app UI to view required v1 partner data. Workout history detail is inconsistent with partner-readable workout lists.

**Recommended change**

Add a visible-user selector backed by Partner Links. Pass target user IDs to body-weight/workout/stats reads. Add partner active-plan read support. Change workout detail read authorization to load by workout ID, then allow if `canReadUserData(currentUserId, workout.userId)`; keep mutation routes owner-only.

#### H-04 — Body-weight offline storage is not user-scoped

**Evidence**

- `apps/mobile/src/body-weight/body-weight-store.ts` stores all state under one fixed key, `bfitlog:body-weight`.
- `BodyWeightRepository.getGoal()` returns one stored goal; `listLogs()` returns all non-deleted logs with no `userId` filter.
- `apps/mobile/src/body-weight/repository.ts` creates a process-wide singleton repository.
- Home, History, and Stats read local logs/goals without scoping to the authenticated user.

**Impact**

Logging out and signing in as another user on the same device can show the previous user's local/offline body-weight goal/logs and mix dirty sync state. This violates separate-user data expectations and can cause sync errors.

**Recommended change**

Scope local storage keys and repository instances by authenticated user ID. Filter all local reads by `userId`. Recreate/clear the singleton on auth user change/logout. Keep partner visibility as explicit server reads, not leaked local state.

#### H-05 — Good Form is hard-coded true in workout saves

**Evidence**

- `CONTEXT.md` defines Good Form as an exercise-level checkbox.
- `PLAN.md` marks the Good Form checkbox and progression-hint Good Form requirement complete.
- `apps/mobile/src/workouts/workout-api.ts` sends `goodForm: true` for every saved exercise.
- No corresponding mobile Good Form checkbox/control was found in workout UI.

**Impact**

Every saved exercise is treated as Good Form. Users cannot record bad/uncertain form, and progression hints can be earned without explicit Good Form confirmation.

**Recommended change**

Add an exercise-level Good Form boolean input initialized from `exercise.goodForm`, pass it through `saveExerciseSet`, and require explicit Good Form for progression eligibility.

#### H-06 — Progression hints do not require all planned sets at the top of the rep range

**Evidence**

- `CONTEXT.md` requires progression hints only after completing all planned sets at the top of the rep range with Good Form for two sessions.
- `apps/api/src/routes/workouts.ts` counts successful sessions when any joined set row has Good Form and hits the top rep range.
- Existing workout tests expect two one-set sessions to trigger a hint for a seeded exercise whose target is multiple sets.

**Impact**

Users can receive load-increase hints after completing too little volume. This undermines progression guidance and may encourage unsafe increases.

**Recommended change**

Evaluate progression per exercise log, not per set row. Require completed/non-skipped status, Good Form, set count at least target sets, and every required set at target max reps. Store structured target fields instead of parsing display target strings.

#### H-07 — Workout multi-table writes are not transactional and set payloads are weakly validated

**Evidence**

- Exercise update deletes all existing `setLogs`, then inserts replacements without a transaction.
- Draft creation inserts `workoutLogs`, `exerciseLogs`, and checklist rows without a transaction.
- The workout exercise update route accepts raw sets with minimal validation.

**Impact**

A failure after the first write can leave partial workout drafts or delete prior sets without inserting replacements. Invalid set data can corrupt stats/progression calculations.

**Recommended change**

Wrap draft creation and exercise replacement in `db.transaction`. Validate all set payloads before destructive writes: positive integer `setIndex`, positive reps/duration, valid kg, and compatibility with exercise tracking type.

#### H-08 — Android destructive confirmations execute immediately

**Evidence**

- `apps/mobile/app/workout.tsx`, `apps/mobile/app/(tabs)/history.tsx`, and `apps/mobile/src/admin/AdminUserManagement.tsx` use a synchronous confirmation helper.
- On native, the helper calls `Alert.alert(...)` and immediately returns `true`.
- Delete/discard/role-change callers proceed immediately after that return.

**Impact**

On Android, tapping Delete/Discard/Make member/admin can perform the destructive action before the user responds to the Alert.

**Recommended change**

Replace the helper with an async Promise-based confirmation using native Alert buttons. Await user choice before executing destructive mutations.

#### H-09 — Rest timer does not count down or support pause/resume

**Evidence**

- `PLAN.md` requires auto-start rest timer, exercise-specific rest seconds, and skip/pause support.
- Workout UI sets `restTimer.remainingSeconds` after save and renders it.
- No interval/decrement lifecycle or pause/resume control was found; only skip exists.

**Impact**

The rest timer is a static label, not a functional timer. The documented workout pacing behavior is incomplete.

**Recommended change**

Add timer lifecycle state with interval cleanup, decrement to zero, pause/resume, and skip. Keep timer state out of persisted workout stats.

#### H-10 — Planned-exercise target invariants are not enforced by admin API or database

**Evidence**

- Shared `plannedExerciseSchema` requires target sets, a valid reps or duration target, and min reps <= max reps.
- `apps/api/src/routes/admin.ts` validates only `targetSets` and `restSeconds` on planned exercise edits.
- Drizzle schema has no CHECK constraints for target fields.

**Impact**

Admin edits can create impossible prescriptions: negative reps/duration, min greater than max, both reps and duration, or no valid target. This can break plan rendering and progression logic.

**Recommended change**

Use a shared or route-specific schema compatible with `plannedExerciseSchema` in admin plan edits. Add DB CHECK constraints for positive target sets/reps/duration, min <= max, and valid target shape.

## Medium

#### M-01 — Goals/reminders offline behavior is not durable and API lacks last-write-wins guards

**Evidence**

- `PLAN.md` marks workout frequency goal and reminder settings offline-editable.
- Mobile `GoalReminderSettings` calls API directly; on failure it sets status text like “Saved locally later” / “Sync pending” but has no local store, dirty flag, or retry queue.
- API upserts goal/reminder settings using client `updatedAt` but does not compare timestamps like body weight does.
- Reminder time validation accepts any `NN:NN` string, including invalid times such as `99:99`.

**Impact**

Offline edits can be lost on reload/app restart. Older offline writes can overwrite newer server state. Invalid reminder times/timestamps may persist or fail as runtime errors.

**Recommended change**

Mirror the body-weight local-first pattern for goals/reminders: user-scoped local store, dirty flags, retry sync, and last-write-wins comparison server-side. Validate timestamps and HH:MM ranges.

#### M-02 — Notification device permission metadata is server-side only

**Evidence**

- `docs/notifications.md` says BFitLog stores notification permission/device metadata per device.
- API has `/reminders/devices/:deviceId` support.
- No mobile caller or permission request/upsert path was found.

**Impact**

The app cannot actually record per-device notification permission state from the client, despite docs and plan status.

**Recommended change**

Wire mobile notification permission checks and device registration to the existing API. Keep Android scheduling gated behind development-build verification.

#### M-03 — Admin plan/exercise/media editor UI is missing

**Evidence**

- `CONTEXT.md` says admins can manage plan data.
- `PLAN.md` marks admin-only plan editor and exercise/media editor complete.
- API has limited patch endpoints for templates/days/planned exercises.
- Mobile admin UI only manages users, passwords, roles, and Partner Links. No training-plan/exercise/media admin client methods were found.

**Impact**

Admins cannot manage plan data from the app UI as documented. Exercise/media editing appears unimplemented in the observed mobile surface.

**Recommended change**

Add admin plan/exercise/media UI and client API methods, or downgrade documentation/plan status if only API-level editing is intended for now.

#### M-04 — Production trusted-origin hardening always includes development origins

**Evidence**

- Deployment docs instruct explicit production origins.
- `apps/api/src/env.ts` defines localhost/Expo development origins and always includes them in Better Auth trusted origins.

**Impact**

A production API can trust development origins even when production config intends an explicit allowlist. Risk depends on Better Auth origin enforcement, but it weakens documented hardening.

**Recommended change**

Include development origins only outside production. Require explicit production trusted origins and test that production excludes localhost/Expo dev origins unless configured.

#### M-05 — Training-plan seed is manual despite deployment readiness language

**Evidence**

- `PLAN.md` says training-plan seed is included in setup/deploy flow.
- Deployment docs say to run the seed as a one-off after first deploy.
- API Dockerfile runs migrations then starts the API; no seed command is run.
- Plan API returns 404 when the template is missing, and Plan UI tells users to run the seed.

**Impact**

A fresh deployment can be healthy but lack the required seeded plan, blocking Plan/Workout flows until the operator runs a manual command.

**Recommended change**

Automate seed execution in deploy flow, add a one-off compose service/task, or update `PLAN.md` to clearly state seed is manual. Add a smoke check that a fresh compose deploy has the default template.

#### M-06 — Stale legacy setup screen remains accessible

**Evidence**

- ADR `0013` says BFitLog no longer uses a first-run setup form; first operator logs in with `admin` / `admin` and creates the first real user from admin.
- Server rejects `POST /setup`.
- Mobile still registers and implements `/setup`, posting an admin+partner payload.
- Home still redirects to `/setup` if setup status reports setup required.

**Impact**

Manual navigation or a setup-status edge case routes users into a dead/deprecated flow that conflicts with current onboarding.

**Recommended change**

Remove the setup screen and validation tests, or replace it with a redirect/explanation for default-admin onboarding.

#### M-07 — Admin can demote the last admin

**Evidence**

- Admin role gates user management, password reset, Partner Link management, and plan management.
- Admin role patch route allows any admin to change any user's role to `admin` or `member` without a last-admin guard.

**Impact**

An admin can remove the only admin account, leaving the instance without an in-app recovery path.

**Recommended change**

Reject demoting the current/last admin unless another real admin exists. Optionally forbid self-demotion or add an explicit recovery path.

#### M-08 — Substitution validation is too permissive

**Evidence**

- Domain docs require preserving original/actual exercises and requiring a note for ad-hoc substitutes.
- Workout exercise update accepts any `performedExerciseId` string, with no existence check before DB write, no preferred-substitute check, and no required note when actual differs from planned.

**Impact**

Clients can silently substitute any exercise without explanation, or trigger FK/runtime errors with invalid IDs. History may not explain why a substitute was used.

**Recommended change**

Load allowed substitute IDs before update. If `performedExerciseId` differs from original, require either a preferred substitute or a non-empty substitution note/explicit target adjustment. Return 400/404 before DB write for invalid IDs.

#### M-09 — Password policy is inconsistent across layers

**Evidence**

- Shared `passwordSchema` requires 10–200 characters.
- Admin routes and mobile admin/first-user UI accept 8+ characters.
- Better Auth config uses a lower minimum password length.

**Impact**

Different paths enforce different password requirements. Tests and maintainers may rely on the wrong policy; direct auth paths may accept weaker passwords than intended.

**Recommended change**

Pick one password policy and centralize it through shared schema/constants. Apply it to Better Auth config, admin routes, UI validation, and tests.

#### M-10 — Body-weight kg columns are text with no database numeric constraints

**Evidence**

- Shared schema requires kg > 0, <= 500, one decimal.
- DB stores body-weight kg values as text with no numeric CHECK constraints.
- API validates writes and serializes with `toFixed(1)`, but manual/future writes can bypass this.

**Impact**

Bad rows can enter through migrations/manual fixes/future endpoints and later become `NaN` or break charts/sync assumptions.

**Recommended change**

Migrate kg columns to numeric with scale 1, or add strict CHECK constraints if retaining text. Keep API formatting separate from storage.

#### M-11 — Ordering/sequence uniqueness is not enforced

**Evidence**

- Training Days are an ordered rotating sequence.
- DB indexes but does not enforce unique `(template_id, sequence)` or per-day sort orders.
- Next-day logic and plan rendering rely on sequence/order fields.

**Impact**

Duplicate or conflicting sequence/sort values can make rotation and UI order nondeterministic after admin/data edits.

**Recommended change**

Add unique constraints for `training_days(template_id, sequence)`, `planned_exercises(training_day_id, sort_order)`, checklist item order, and media order where one item per slot is intended.

#### M-12 — Seed idempotency ignores canonical updates

**Evidence**

- Seed script uses `onConflictDoNothing` for templates, exercises, media, days, checklist items, planned exercises, and substitutes.

**Impact**

Rerunning the seed is additive and safe for new IDs, but changes to existing canonical seed content are silently ignored. Source-controlled seed data can drift from deployed databases.

**Recommended change**

Either treat seed changes as explicit migrations, or use `onConflictDoUpdate` for canonical seed-owned fields with a clear policy for preserving admin/user edits.

#### M-13 — Shared workout schemas do not match workout API response DTOs

**Evidence**

- Shared `SetLog` requires `exerciseLogId`.
- Workout API serializes sets without `exerciseLogId`.
- API includes `substitutes` inside exercise logs, but shared `exerciseLogSchema` has no `substitutes` field.

**Impact**

A client validating workout responses with `@bfitlog/shared` schemas would reject or strip current API data. The shared package is not a reliable API contract for workout DTOs.

**Recommended change**

Split persisted domain schemas from API response DTO schemas, or align shared schemas with actual API responses and use them in route serialization/tests.

#### M-14 — API error handling is inconsistent

**Evidence**

- Some routes call `await c.req.json()` without catching malformed JSON.
- Admin user creation does not consistently map duplicate/Better Auth validation errors to stable client responses.

**Impact**

Malformed payloads or duplicate users can surface as generic 500s instead of actionable 400/409 responses.

**Recommended change**

Use a shared parse/validation helper across routes. Catch known Better Auth duplicate/validation failures and map them to 409/400.

#### M-15 — Many route modules create independent database pools

**Evidence**

- `createDb` creates a new `pg.Pool`.
- `app.ts`, `auth.ts`, `bootstrap.ts`, `visibility.ts`, and route modules instantiate top-level DB clients separately.

**Impact**

The API can open many pools per process, which can exhaust Postgres connections in small self-hosted deployments and complicates transaction sharing/tests.

**Recommended change**

Create one DB/pool per process and inject it into auth/app/routes/bootstrap. Add a close hook for tests and server shutdown.

#### M-16 — Android default API URL points to device-local localhost

**Evidence**

- `apps/mobile/src/api/client.ts` defaults `EXPO_PUBLIC_API_URL` to `http://localhost:3000`.
- On Android devices/emulators, `localhost` refers to the device/emulator, not the host API.

**Impact**

A default Android run cannot reach the local/self-hosted API unless environment configuration is overridden.

**Recommended change**

Make native API configuration explicit: require `EXPO_PUBLIC_API_URL`, derive a LAN/dev-server host for Expo, or show a blocking native configuration error instead of silently using `localhost`.

## Low

#### L-01 — Exercise detail media parser duplicates and lags shared media embed logic

**Evidence**

- Plan screen uses shared `getInlineMediaEmbed`, which supports YouTube variants and direct GIF/image previews.
- Exercise detail has a narrower local parser and does not reuse direct GIF/image embed logic.

**Impact**

Media behavior diverges between Plan and Exercise detail; links that embed in one place may only show as external links in another.

**Recommended change**

Reuse `getInlineMediaEmbed` in `exercise.tsx` and keep fallback links for unsupported platforms.

#### L-02 — Workout completion invariant is unclear

**Evidence**

- Shared schema only requires `completedAt` when status is completed.
- Complete endpoint marks a workout completed without requiring every exercise slot to be completed or skipped.

**Impact**

A workout can advance sequence while all exercise slots remain planned/no-set. This may be acceptable, but it weakens the meaning of completed Workout Log and can produce empty history/stats entries.

**Recommended change**

Decide and document the invariant. If completion means every planned slot is completed or skipped, enforce it in the complete endpoint and tests. If partial/empty completion is allowed, make that explicit in docs/UI copy.

## Areas that look substantially covered

- Default admin bootstrap aligns with ADR `0013`: startup default admin, first real user promotion, and default-admin deletion behavior have code and tests.
- Body-weight own-data local-first path is substantially implemented: local store, dirty goal/log tracking, HTTP sync, server last-write-wins, and repository/API tests.
- Seeded plan read/display for current user is implemented: seed script, template/active APIs, Plan tab, offline plan cache, media fallback helpers, and tests.
- Online workout draft/start/resume/complete/edit/delete, checklist persistence, multi-set save, skip-note requirement, and basic history/stats APIs are present with tests/helpers.
- Admin user creation, password reset, role changes, Partner Link creation/listing, and default-admin onboarding exist in API and mobile UI.

## Recommended remediation order

1. Fix security/config hardening: production auth secret failure, production trusted origins, last-admin guard.
2. Fix data isolation and destructive Android behavior: user-scoped body-weight storage and async confirmations.
3. Fix workout correctness: Good Form UI, progression algorithm, set validation, transactional workout writes.
4. Resolve functional requirement gaps: offline workout sync scope, partner visibility selectors/detail/API, goals/reminders offline persistence, notification device wiring, rest timer.
5. Tighten schema/data model: planned-exercise validation, DB constraints, DTO/schema alignment, seed policy, ordering uniqueness.
6. Clean stale/contradictory flows and docs: legacy setup screen, deployment seed flow, password policy, Android API URL configuration.
