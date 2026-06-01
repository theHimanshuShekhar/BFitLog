# Use a self-hosted TypeScript and Postgres backend

BFitLog will use a self-hosted TypeScript API with Hono, Postgres, Drizzle ORM, and Drizzle Kit migrations, deployed as a single Docker Compose stack via Dockhand. This supports synced web and Android clients for two users while avoiding hosted-backend lock-in and keeping the app self-hostable.
