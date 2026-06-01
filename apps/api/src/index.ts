import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { readEnv } from "./env.js";

const env = readEnv();
const app = createApp();

serve({
	fetch: app.fetch,
	port: env.port,
});

console.log(`BFitLog API listening on http://localhost:${env.port}`);
