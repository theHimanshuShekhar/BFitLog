import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { ensureDefaultAdmin } from "./bootstrap.js";
import { readEnv } from "./env.js";

const env = readEnv();
await ensureDefaultAdmin();
const app = createApp();

serve({
	fetch: app.fetch,
	port: env.port,
});

console.log(`BFitLog API listening on http://localhost:${env.port}`);
