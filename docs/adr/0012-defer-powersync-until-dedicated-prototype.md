# Defer PowerSync adoption until a dedicated prototype passes

BFitLog still needs offline workout logging, and PowerSync remains a strong candidate for a durable local-first sync layer. A documentation spike found that PowerSync fits the long-term direction, but adopting it now would add service, database, auth, and local schema complexity before the workout model has stabilized.

PowerSync self-hosting requires a PowerSync service, MongoDB storage, Postgres logical replication, a replication role/publication, sync streams scoped by authenticated user identity, and a JWT/JWKS auth path. BFitLog currently uses Better Auth cookie sessions and custom AsyncStorage offline handling for body weight logs, so a PowerSync migration would require new authentication and upload contracts.

Therefore, BFitLog will not adopt PowerSync in the main app yet. The project will continue building the online workout vertical slice and the existing body weight offline repository. Before broadening custom offline sync or replacing it, create a separate PowerSync prototype that proves Expo Android, Expo Web expectations, Better Auth-to-PowerSync JWT issuance, Docker Compose self-hosting, ownership/Partner Link visibility, and body-weight upload handling.

See `docs/spikes/2026-06-02-powersync.md` for spike notes.
