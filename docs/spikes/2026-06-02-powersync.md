# PowerSync spike

Date: 2026-06-02

## Question

Should BFitLog adopt PowerSync now for offline body weight and workout logging, or continue the current custom local-first approach while the workout domain is still changing?

## Current BFitLog state

- Backend: Hono + Better Auth + Postgres + Drizzle.
- Mobile: Expo universal app for web and Android.
- Existing offline behavior: custom AsyncStorage repository for body weight goals/logs.
- Workout logging has just gained server-side draft/completed APIs and a first mobile draft UI; offline workout sync is not implemented yet.

## PowerSync facts from current docs

- React Native/Expo client uses `@powersync/react-native` plus SQLite peer dependency `@journeyapps/react-native-quick-sqlite`.
- Client setup requires a local SQLite schema and a `PowerSyncBackendConnector`.
- Connector responsibilities:
  - `fetchCredentials()` returns the PowerSync endpoint and auth token.
  - `uploadData(database)` reads pending CRUD transactions and uploads them to the app backend, then completes the transaction.
- Self-hosted PowerSync adds a `journeyapps/powersync-service` container and MongoDB storage container.
- Postgres source DB needs logical replication:
  - `wal_level = logical` and a restart.
  - dedicated replication/read-only role.
  - publication named `powersync`.
- Custom auth is possible via JWKS/JWT config; BFitLog currently uses Better Auth session cookies, so we would need a PowerSync-compatible JWT issuing endpoint and JWKS/static key setup.
- Sync rules/streams need explicit SQL queries scoped by `auth.user_id()`.

## Fit assessment

### Pros

- Good long-term fit for local-first workout logging.
- Avoids hand-rolling a general bidirectional sync engine for multiple tables.
- Local SQLite is a better durable offline store than AsyncStorage for relational workout logs.
- Self-hosting is supported and aligns with BFitLog's deployment goal.

### Costs and risks

- Adds at least two services to Docker Compose: PowerSync service + MongoDB.
- Requires Postgres logical replication configuration and publication management.
- Requires a new auth/token boundary because Better Auth's browser/mobile cookie sessions are not enough for PowerSync client auth.
- Requires maintaining two write paths:
  - local SQLite writes on client;
  - backend upload handling for PowerSync CRUD transactions.
- Requires mapping BFitLog's ownership/partner visibility rules into sync streams before sensitive data can sync safely.
- Workout schema is still evolving; adopting PowerSync now would force local schema and upload contract churn.

## Recommendation

Do **not** adopt PowerSync in the main app immediately. Keep the current custom body-weight offline path and finish the online workout vertical slice first.

Before expanding custom offline sync beyond body weight, run a separate integration branch/prototype that proves:

1. Expo Android can install and run `@powersync/react-native` + `@journeyapps/react-native-quick-sqlite`.
2. Expo Web fallback/story is acceptable for BFitLog.
3. Hono can issue a short-lived PowerSync JWT for the current Better Auth session.
4. Self-hosted Docker Compose can run Postgres logical replication, MongoDB, and PowerSync service locally.
5. Sync streams correctly enforce own-data plus Partner Link read visibility.
6. Upload handling works for body weight logs first, then workout draft logs.

## Decision for current plan

- Continue online workout UX and history/detail work now.
- Keep body weight's custom offline repository unchanged.
- Do not implement offline workout sync until the dedicated PowerSync prototype proves the auth, self-hosting, and visibility model.
- If the prototype passes, migrate body weight and workout storage from AsyncStorage/API-first flows toward PowerSync-backed SQLite in a dedicated phase.
