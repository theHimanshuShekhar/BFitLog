# BFitLog Implementation Plan

This file tracks the full BFitLog implementation roadmap and current project status.

## Status legend

- `[x]` Complete and committed
- `[~]` Partially complete / usable but needs more work
- `[ ]` Not started
- `[!]` Blocked or requires a spike/decision

## Current project status

**Last updated:** 2026-06-02

BFitLog currently has a working monorepo foundation, self-hosted Hono/Postgres API, Better Auth setup/login flow, local-first body weight goal/log repository, body weight UI, simple stats chart, seeded training plan schema/data, and an authenticated training plan API.

Recent verification passed:

- `[x]` `pnpm test`
- `[x]` `pnpm typecheck`
- `[x]` Expo web export for current mobile app
- `[x]` Docker API image builds
- `[x]` Docker API container starts and responds to `/health`
- `[x]` Local Postgres migrations run

## Completed commits

- `[x]` `8b92cb8` Bootstrap BFitLog vertical slice
- `[x]` `d209f55` Add local-first body weight repository
- `[x]` `9339d44` Add body weight goal settings
- `[x]` `d1c780b` Add body weight logging UI
- `[x]` `85e3aa9` Add body weight stats chart
- `[x]` `e9c2a8d` Cover setup and body weight API
- `[x]` `a3a4fbe` Make API Docker image runnable
- `[x]` `964a91b` Run API migrations on container startup
- `[x]` `2b9a2fd` Add app tab navigation
- `[x]` `e35cfb7` Show body weight history
- `[x]` `b1c9c6e` Add training plan database schema
- `[x]` `b778fe8` Format mobile tab screens
- `[x]` `75688f5` Seed initial training plan
- `[x]` `c662d2e` Expose seeded training plan API

---

# Phase 0 — Product/domain documentation

## Domain and architecture docs

- `[x]` Create project directory `BFitLog`
- `[x]` Create `CONTEXT.md`
- `[x]` Document product identity: repo/product/app name is BFitLog
- `[x]` Document two trusted users and Partner Link visibility model
- `[x]` Document Training Plan / Training Day / Exercise terminology
- `[x]` Document Workout Log / Set Log / Body Weight Log terminology
- `[x]` Document Good Form and Progression Hint terminology
- `[x]` Document embedded media requirements
- `[x]` Document substitutions and skipped exercise behavior
- `[x]` Document warmup and cooldown checklist terminology
- `[x]` Document offline logging scope

## ADRs

- `[x]` ADR 0001: Use Expo universal app first
- `[x]` ADR 0002: Use self-hosted TypeScript/Postgres backend
- `[x]` ADR 0003: Seed initial training plan from code
- `[x]` ADR 0004: Start with seeded plan and admin editing later
- `[x]` ADR 0005: Support offline logging with limited scope
- `[x]` ADR 0006: Use simple offline sync conflict policy
- `[x]` ADR 0007: Spike PowerSync before committing
- `[x]` ADR 0008: Build vertical slice first
- `[x]` ADR 0009: Use pnpm and Node.js
- `[x]` ADR 0010: Support planned exercise substitutions
- `[x]` ADR 0011: Use Better Auth

---

# Phase 1 — Monorepo and infrastructure foundation

## Workspace

- `[x]` Initialize Git repo on `main`
- `[x]` Create root `package.json`
- `[x]` Create `pnpm-workspace.yaml`
- `[x]` Create shared TypeScript config
- `[x]` Create `.gitignore`
- `[x]` Create `.dockerignore`
- `[x]` Add pnpm lockfile
- `[x]` Add workspace scripts: `test`, `typecheck`, `lint`

## Packages/apps

- `[x]` Create `apps/api`
- `[x]` Create `apps/mobile`
- `[x]` Create `packages/shared`
- `[x]` Add shared package exports
- `[x]` Add API package scripts
- `[x]` Add mobile package scripts

## Docker/self-hosting

- `[x]` Create `docker-compose.yml`
- `[x]` Add Postgres service
- `[x]` Add API service
- `[x]` Add API Dockerfile
- `[x]` Add `.env.example`
- `[x]` Verify `docker compose config`
- `[x]` Verify Postgres health
- `[x]` Verify API Docker image builds
- `[x]` Verify API container responds to `/health`
- `[x]` Run API migrations at container startup
- `[ ]` Add production Dockhand deployment notes
- `[ ]` Add backup/restore documentation for Postgres
- `[ ]` Add production secret-generation documentation for `BETTER_AUTH_SECRET`
- `[ ]` Add reverse proxy/HTTPS assumptions to deployment docs

---

# Phase 2 — Shared schemas

## Auth/setup schemas

- `[x]` Add `UserRole` schema
- `[x]` Add username validation schema
- `[x]` Add password validation schema
- `[x]` Add first-run setup request schema
- `[x]` Add login request schema
- `[x]` Add shared tests for schema behavior

## Body weight schemas

- `[x]` Add body weight direction schema: `lose | gain | maintain`
- `[x]` Add kg validation schema
- `[x]` Add Body Weight Goal schema
- `[x]` Add Body Weight Log schema
- `[x]` Keep syncable record IDs as UUIDs
- `[x]` Allow Better Auth user IDs as opaque strings
- `[x]` Add tests for valid/invalid body weight data

## Training/workout schemas

- `[ ]` Add shared Exercise schema
- `[ ]` Add shared Training Plan Template schema
- `[ ]` Add shared Training Day schema
- `[ ]` Add shared Planned Exercise schema
- `[ ]` Add shared Checklist Item schema
- `[ ]` Add shared Exercise Media schema
- `[ ]` Add shared Exercise Substitute schema
- `[ ]` Add shared Workout Log schema
- `[ ]` Add shared Set Log schema
- `[ ]` Add shared Progression Hint schema

---

# Phase 3 — API foundation

## Hono foundation

- `[x]` Add Hono app factory
- `[x]` Add `/health`
- `[x]` Add API env reader
- `[x]` Add Node server entrypoint
- `[x]` Add app health test
- `[x]` Add CORS middleware
- `[x]` Add Better Auth session/user context middleware

## Better Auth integration

- `[x]` Install Better Auth
- `[x]` Install Better Auth Expo plugin
- `[x]` Configure Better Auth server
- `[x]` Configure Drizzle adapter
- `[x]` Configure username plugin
- `[x]` Configure Expo plugin
- `[x]` Configure 90-day sessions
- `[x]` Configure trusted origins for Expo/Web
- `[x]` Mount Better Auth handler at `/api/auth/*`
- `[x]` Verify username sign-in works
- `[ ]` Harden production cookie/trusted-origin config
- `[ ]` Add admin password reset endpoint/UI
- `[ ]` Add user self-password-change UI

## First-run setup

- `[x]` Add `GET /setup/status`
- `[x]` Add `POST /setup`
- `[x]` Create first admin user
- `[x]` Create partner member user
- `[x]` Create initial Partner Link
- `[x]` Disable setup after users exist
- `[x]` Add setup route tests
- `[ ]` Add richer setup validation messages in UI
- `[ ]` Add admin user-management endpoints
- `[ ]` Add admin create-user flow
- `[ ]` Add admin Partner Link management

---

# Phase 4 — Database and migrations

## Auth/body weight schema

- `[x]` Add Better Auth-compatible `user` table
- `[x]` Add Better Auth-compatible `session` table
- `[x]` Add Better Auth-compatible `account` table
- `[x]` Add Better Auth-compatible `verification` table
- `[x]` Add `partner_links`
- `[x]` Add `body_weight_goals`
- `[x]` Add `body_weight_logs`
- `[x]` Generate initial Drizzle migration
- `[x]` Verify migrations against local Postgres

## Training plan schema

- `[x]` Add `exercises`
- `[x]` Add `exercise_media`
- `[x]` Add `training_plan_templates`
- `[x]` Add `user_training_plans`
- `[x]` Add `training_days`
- `[x]` Add `training_day_checklist_items`
- `[x]` Add `planned_exercises`
- `[x]` Add `planned_exercise_substitutes`
- `[x]` Generate training schema migration
- `[x]` Verify migration runs

## Workout logging schema

- `[x]` Add `workout_logs`
- `[x]` Add `exercise_logs`
- `[x]` Add `set_logs`
- `[x]` Add `workout_checklist_logs`
- `[x]` Add skipped exercise fields/reason
- `[x]` Add substituted exercise fields
- `[x]` Add exercise-level Good Form field
- `[x]` Add workout/exercise notes
- `[x]` Add draft/completed/discarded workout status
- `[ ]` Add client sync metadata/dirty tracking if PowerSync not adopted

## Goals and reminders schema

- `[~]` Body Weight Goal table exists
- `[ ]` Add Workout Frequency Goal table/fields
- `[ ]` Add reminder settings table
- `[ ]` Add per-device notification permission/device metadata if needed

---

# Phase 5 — Body weight vertical slice

## API

- `[x]` Add authenticated `GET /body-weight/goal`
- `[x]` Add authenticated `PUT /body-weight/goal`
- `[x]` Add authenticated `GET /body-weight/logs`
- `[x]` Add authenticated `PUT /body-weight/logs/:id`
- `[x]` Add authenticated `DELETE /body-weight/logs/:id`
- `[x]` Enforce own-data mutation only
- `[x]` Use last-write-wins for goal/log upserts
- `[x]` Add API integration tests

## Local-first repository

- `[x]` Add `BodyWeightStore`
- `[x]` Add memory storage for tests
- `[x]` Add AsyncStorage-backed repository factory
- `[x]` Add `BodyWeightRepository`
- `[x]` Save Body Weight Goal locally first
- `[x]` Save Body Weight Logs locally first
- `[x]` Dirty-track goal/log changes
- `[x]` Add sync client boundary
- `[x]` Add HTTP sync client
- `[x]` Add repository tests
- `[ ]` Replace/validate repository with PowerSync spike

## Mobile UI

- `[x]` Add Better Auth Expo client
- `[x]` Add setup screen
- `[x]` Add login screen
- `[x]` Add route gating for setup/login
- `[x]` Add Home screen
- `[x]` Add body weight goal form in Settings
- `[x]` Add body weight logging form on Home
- `[x]` Show latest body weight on Home
- `[x]` Add body weight history timeline
- `[x]` Add body weight stats screen
- `[x]` Add 30d/90d/1y/all range filters
- `[x]` Add goal reference to chart
- `[ ]` Improve form validation UX
- `[ ]` Add loading/error/success toasts instead of alerts
- `[ ]` Add delete body weight log UI
- `[ ]` Add edit body weight log UI
- `[ ]` Add pull-to-refresh where appropriate

---

# Phase 6 — Expo app shell and navigation

## Foundation

- `[x]` Install Expo
- `[x]` Install Expo Router
- `[x]` Add `app.json`
- `[x]` Configure `bfitlog` URL scheme
- `[x]` Configure Android/Web platforms
- `[x]` Add theme
- `[x]` Add API client
- `[x]` Verify Expo Web export

## Navigation

- `[x]` Add root stack layout
- `[x]` Add tabs layout
- `[x]` Add Home tab
- `[x]` Add Plan tab placeholder
- `[x]` Add History tab
- `[x]` Add Stats tab
- `[x]` Add Settings tab
- `[ ]` Add tab icons
- `[ ]` Polish responsive web layout
- `[ ]` Polish Android layout
- `[ ]` Add PWA manifest/icon polish

---

# Phase 7 — Seeded training plan

## Seed data

- `[x]` Create seed script for 4-day beginner upper/lower split
- `[x]` Seed 20 exercises
- `[x]` Seed exercise equipment
- `[x]` Seed tracking type: `reps_weight` / `duration`
- `[x]` Seed 40 media links: GIF + video per exercise
- `[x]` Seed 4 Training Days
- `[x]` Seed warmup checklist items
- `[x]` Seed cooldown checklist items
- `[x]` Seed 20 Planned Exercises
- `[x]` Seed target sets/reps/duration/rest/notes
- `[ ]` Seed preferred substitutes
- `[x]` Create per-user active plan instances on demand from the seeded template
- `[ ]` Make seed script idempotent for future substitute data

## Plan API

- `[x]` Add authenticated `/training-plan/template`
- `[x]` Return template metadata
- `[x]` Return Training Days
- `[x]` Return warmup/cooldown checklist items
- `[x]` Return Planned Exercises
- `[x]` Return Exercise details
- `[x]` Return media links
- `[x]` Add plan API test
- `[x]` Add endpoint for current user's active plan
- `[x]` Add endpoint to create active plan from template
- `[ ]` Add admin-only plan editing endpoints

## Plan UI

- `[x]` Fetch training plan in Plan tab
- `[x]` Render Training Days as Day 1–Day 4
- `[x]` Render warmup checklist
- `[x]` Render cooldown checklist
- `[x]` Render Planned Exercises and targets
- `[x]` Render Exercise detail screen
- `[~]` Show embedded media inline where possible — current UI shows in-app media buttons/fallback links, not embedded players
- `[x]` Add fallback source link when embed fails
- `[ ]` Add substitute list display
- `[ ]` Cache plan text for offline use

---

# Phase 8 — Workout logging

## Workout flow

- `[x]` Add Start Workout from Home suggested next Training Day — uses first active plan day for now
- `[x]` Create draft Workout Log immediately on start
- `[x]` Resume draft workout
- `[x]` Discard draft workout
- `[x]` Complete workout
- `[x]` Completed workout advances soft sequence
- `[x]` Completed workout with skips advances sequence
- `[ ]` Manual Training Day override
- `[x]` Determine next Training Day from latest completed Workout Log

## Exercise logging

- `[x]` Prepopulate planned exercise slots — API creates draft slots from active plan day
- `[x]` Per-set tracking for `reps_weight` — first-set mobile UI + API storage
- `[x]` Per-set tracking for `duration` — first-set mobile UI + API storage
- `[x]` Exercise-level Good Form checkbox — API marks saved sets with good form
- `[x]` Exercise-level notes
- `[x]` Workout-level note
- `[x]` Show completed workout history timeline
- `[ ]` Edit completed workout logs
- `[ ]` Delete own workout logs
- `[ ]` Own-log mutation only
- `[ ]` Partner visibility read-only

## Skips and substitutions

- `[ ]` Allow preferred substitute selection
- `[ ]` Allow ad-hoc substitute with note
- `[ ]` Preserve originally planned exercise and actually performed exercise
- `[ ]` Stats count toward actual performed exercise only
- `[ ]` Substitute counts as completing Planned Exercise slot
- `[ ]` Allow skip with required note
- `[ ]` Skip is neutral for progression
- `[ ]` Skip remains visible in history
- `[ ]` Handle different substitute tracking type with explicit target adjustment

## Checklists/rest timer

- `[ ]` Save warmup checklist state in draft/completed Workout Log
- `[ ]` Save cooldown checklist state in draft/completed Workout Log
- `[ ]` Auto-start rest timer after set save
- `[ ]` Rest timer uses exercise-specific rest seconds
- `[ ]` Rest timer can skip/pause
- `[ ]` Rest timer notification on Android
- `[ ]` Rest timer not stored in stats

## Offline sync

- `[ ]` Offline workout logging
- `[ ]` Offline set logging
- `[ ]` Offline checklist state
- `[ ]` Offline skip/substitution state
- `[ ]` Sync completed/draft workouts later
- `[ ]` Last-write-wins fallback for conflicts
- `[ ]` PowerSync spike before committing to final sync implementation

---

# Phase 9 — Stats and progression

## Body weight stats

- `[x]` Body weight chart
- `[x]` Body Weight Goal reference
- `[x]` Range filters: 30d/90d/1y/all
- `[ ]` Improve chart axes/labels/tooltips
- `[ ]` User switcher for linked partner stats

## Workout stats

- `[ ]` Per-exercise best weight chart
- `[ ]` Per-exercise volume chart
- `[ ]` Toggle best weight vs volume
- `[ ]` Duration chart for duration exercises
- `[ ]` Workout consistency per week
- `[ ]` Workout Frequency Goal progress
- `[ ]` Stats default to current user
- `[ ]` User switcher for Partner Link visibility
- `[ ]` History filters by user, Training Day, exercise

## Progression hints

- `[ ]` Detect top of rep range for all planned sets
- `[ ]` Require Good Form checkbox
- `[ ]` Require two successful sessions
- `[ ]` Show Progression Hints
- `[ ]` Do not auto-change weights or plan
- `[ ]` Substitutes progress only the actual exercise
- `[ ]` Skips are neutral

---

# Phase 10 — Goals and reminders

## Goals

- `[x]` Body Weight Goal model/API/UI
- `[x]` Body Weight Goal offline-editable
- `[ ]` Workout Frequency Goal model/API/UI
- `[ ]` Workout Frequency Goal offline-editable
- `[ ]` Goals visible to Partner Link
- `[ ]` Goals editable by owning user only

## Reminders/notifications

- `[ ]` Per-user workout reminder settings
- `[ ]` Per-user weigh-in reminder settings
- `[ ]` Reminder settings sync across devices
- `[ ]` Reminder settings offline-editable
- `[ ]` Per-device notification permission handling
- `[ ]` Android local notification scheduling
- `[ ]` Web notification fallback/limitations documented
- `[ ]` Rest timer notification

---

# Phase 11 — Admin and settings

## Settings

- `[x]` Settings screen
- `[x]` Logout action
- `[x]` Body Weight Goal edit
- `[ ]` Sync status details
- `[ ]` Account details
- `[ ]` Change password
- `[ ]` Reminder settings
- `[ ]` Workout Frequency Goal settings
- `[ ]` App info/about

## Admin

- `[ ]` Admin area visible only for admin role
- `[ ]` Create user
- `[ ]` Reset user password
- `[ ]` Create Partner Link
- `[ ]` View existing Partner Links
- `[ ]` Promote/demote role
- `[ ]` Admin-only plan editor
- `[ ]` Admin-only exercise/media editor

---

# Phase 12 — Partner visibility and permissions

## Visibility

- `[x]` Partner Link table
- `[x]` Initial Partner Link created during setup
- `[ ]` Enforce Partner Link read visibility in APIs
- `[ ]` User switcher for Stats
- `[ ]` User switcher for Body Weight Stats
- `[ ]` Partner plan read visibility
- `[ ]` Partner workout log read visibility
- `[ ]` Partner goals read visibility

## Mutation permissions

- `[x]` Body weight mutation own-only
- `[ ]` Workout mutation own-only
- `[ ]` Goals mutation own-only
- `[ ]` Partner visibility remains read-only
- `[ ]` Admin management does not imply editing partner logs in v1

---

# Phase 13 — PowerSync/local-first spike

## Spike goals

- `[~]` Prove PowerSync self-hosted service with Docker Compose — docs spike identified required PowerSync + MongoDB services; implementation prototype deferred
- `[x]` Prove Postgres logical replication requirements — requires `wal_level=logical`, replication role, and `powersync` publication
- `[~]` Prove Expo Android client support — docs confirm React Native/Expo SDK; device prototype deferred
- `[~]` Prove Expo Web worker support — prototype deferred; current recommendation avoids mainline adoption until web story is proven
- `[~]` Prove Better Auth integration with PowerSync auth rules — requires new JWT/JWKS path; prototype deferred
- `[~]` Prove body weight goal/log sync through PowerSync — prototype deferred until auth/self-hosting proof
- `[x]` Decide whether to replace custom local-first repository — do not replace in mainline yet; keep custom body-weight offline repository
- `[x]` Document spike result in `docs/spikes/2026-06-02-powersync.md` and ADR 0012

---

# Phase 14 — Android/Web/PWA quality

## Android

- `[ ]` Verify with Expo Go or development build
- `[ ]` Verify Better Auth SecureStore cookie behavior
- `[ ]` Verify offline body weight logging on Android
- `[ ]` Verify notification permissions
- `[ ]` Verify rest timer notification
- `[ ]` Verify media embeds/fallbacks

## Web/PWA

- `[x]` Expo Web export succeeds
- `[ ]` Add app icons
- `[ ]` Add PWA manifest polish
- `[ ]` Verify installability
- `[ ]` Verify web auth cookies
- `[ ]` Verify offline local storage behavior
- `[ ]` Verify responsive desktop layout

---

# Phase 15 — Production readiness

## Security

- `[ ]` Strong production Better Auth secret docs
- `[ ]` HTTPS required in production docs
- `[ ]` Restrict CORS origins in production
- `[ ]` Review cookie attributes for production deployment
- `[ ]` Rate limit auth endpoints
- `[ ]` Add basic request logging

## Testing

- `[x]` Shared schema tests
- `[x]` API health/setup/body-weight/training-plan tests
- `[x]` Mobile repository tests
- `[ ]` Mobile component tests
- `[ ]` End-to-end web test for setup/login/body weight flow
- `[ ]` Android manual test checklist
- `[ ]` Docker Compose smoke test script

## Deployment and operations

- `[x]` Docker Compose API/Postgres stack
- `[x]` Container startup migrations
- `[ ]` Include training-plan seed in setup/deploy flow
- `[ ]` Dockhand deployment config/docs
- `[ ]` Backup docs
- `[ ]` Restore docs
- `[ ]` Upgrade/migration docs
- `[ ]` Healthcheck configuration for API service

---

# Phase 16 — Future scope explicitly out of v1

- `[ ]` Nutrition module
- `[ ]` Calorie tracking
- `[ ]` Protein tracking
- `[ ]` Cardio tracking
- `[ ]` iOS polish/testing
- `[ ]` Full plan generator/adaptive programming
- `[ ]` Full granular privacy settings
- `[ ]` CSV/JSON export UI
- `[ ]` Smart scale integration

---

# Immediate next tasks

1. `[ ]` Replace plan media buttons with true inline embedded GIF/video players.
2. `[ ]` Add workout history detail screen and edit/delete actions.
3. `[ ]` Prototype PowerSync on a separate integration branch before expanding offline workout sync.
4. `[ ]` Add multi-set add/remove controls in the workout draft screen.
5. `[ ]` Add preferred substitute seed data and display.

# Verification commands

Run these before claiming work is complete:

```bash
pnpm test
pnpm typecheck
pnpm --filter @bfitlog/mobile exec expo export --platform web --output-dir dist-test
rm -rf apps/mobile/dist-test
docker compose build --pull=false api
docker compose up -d postgres api
```

Then verify API health without dumping large output:

```bash
node -e "fetch('http://localhost:3000/health').then(async r => console.log(r.status, await r.text()))"
```
