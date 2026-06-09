import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { ensureDefaultAdmin } from "./bootstrap.js";
import { runMigrations } from "./db/migrate.js";
import { seedTrainingPlan } from "./db/seed-training-plan.js";
import { readEnv } from "./env.js";

const env = readEnv();
await runMigrations();
await ensureDefaultAdmin();
await seedTrainingPlan();
const app = createApp();

serve({
	fetch: app.fetch,
	port: env.port,
});

console.log(`BFitLog API listening on http://localhost:${env.port}`);
