import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { count, eq, ne } from "drizzle-orm";
import { auth } from "./auth/auth.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { adminRoutes } from "./routes/admin.js";
import { bodyWeightRoutes } from "./routes/body-weight.js";
import { goalRoutes } from "./routes/goals.js";
import { healthRoutes } from "./routes/health.js";
import { setupRoutes } from "./routes/setup.js";
import { trainingPlanRoutes } from "./routes/training-plan.js";
import { visibleUserRoutes } from "./routes/visible-users.js";
import { workoutRoutes } from "./routes/workouts.js";
import { defaultAdminUsername } from "./bootstrap.js";
import { createDb } from "./db/client.js";
import { user } from "./db/schema.js";
import { readEnv } from "./env.js";

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

type AppOptions = {
	corsAllowedOrigins?: string[];
	webRoot?: string;
};

const authRateLimit = new Map<string, { count: number; resetAt: number }>();
const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);
const defaultWebRoot = fileURLToPath(new URL("../web", import.meta.url));
const apiPrefix = "/api/v1";

export function createApp(options: AppOptions = {}) {
	const app = new Hono<{ Variables: Variables }>();
	const env = readEnv();
	const corsAllowedOrigins =
		options.corsAllowedOrigins ?? env.corsAllowedOrigins;

	app.use("*", async (c, next) => {
		const startedAt = Date.now();
		await next();
		console.info(
			JSON.stringify({
				method: c.req.method,
				path: new URL(c.req.url).pathname,
				status: c.res.status,
				durationMs: Date.now() - startedAt,
			}),
		);
	});

	app.use("/api/auth/*", rateLimitAuth);
	app.use(`${apiPrefix}/auth/*`, rateLimitAuth);

	app.use(
		"*",
		cors({
			origin: (origin) => {
				if (!origin) return null;
				if (corsAllowedOrigins.length === 0) return origin;
				return corsAllowedOrigins.includes(origin) ? origin : null;
			},
			allowHeaders: ["Content-Type", "Authorization", "Cookie"],
			allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
			exposeHeaders: ["Content-Length", "Set-Cookie"],
			maxAge: 600,
			credentials: true,
		}),
	);

	app.use("*", async (c, next) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		c.set("user", session?.user ?? null);
		c.set("session", session?.session ?? null);

		await next();
	});

	app.use("*", async (c, next) => {
		const currentUser = c.get("user") as { username?: string } | null;
		if (currentUser?.username !== defaultAdminUsername) {
			await next();
			return;
		}

		const [realUserCount] = await db
			.select({ value: count() })
			.from(user)
			.where(ne(user.username, defaultAdminUsername));
		if ((realUserCount?.value ?? 0) > 0) {
			await next();
			return;
		}

		const path = new URL(c.req.url).pathname;
		if (!isApiPath(path)) {
			await next();
			return;
		}
		const canBootstrapFirstUser =
			(path === "/admin/users" || path === `${apiPrefix}/admin/users`) &&
			(c.req.method === "GET" || c.req.method === "POST");
		const isAlwaysAllowed =
			path === "/health" ||
			path === `${apiPrefix}/health` ||
			path === "/setup/status" ||
			path === `${apiPrefix}/setup/status` ||
			path.startsWith("/api/auth/") ||
			path.startsWith(`${apiPrefix}/auth/`);

		if (canBootstrapFirstUser || isAlwaysAllowed) {
			await next();
			return;
		}

		return c.json(
			{
				error: "Create your first real admin user before using the app.",
			},
			403,
		);
	});

	app.on(["POST", "GET"], "/api/auth/*", (c) => {
		return auth.handler(c.req.raw);
	});
	app.on(["POST", "GET"], `${apiPrefix}/auth/*`, (c) => {
		const url = new URL(c.req.raw.url);
		url.pathname = url.pathname.replace(`${apiPrefix}/auth`, "/api/auth");
		return auth.handler(new Request(url, c.req.raw));
	});

	app.get(apiPrefix, apiMetadata);
	app.get(`${apiPrefix}/`, apiMetadata);
	registerApiRoutes(app, "");
	registerApiRoutes(app, apiPrefix);

	const webRoot = options.webRoot ?? defaultWebRoot;
	app.use("*", serveStatic({ root: webRoot }));
	app.get("*", async (c) => {
		const accept = c.req.header("accept") ?? "";
		if (!accept.includes("text/html") && !accept.includes("*/*")) {
			return c.notFound();
		}

		const indexPath = `${webRoot}/index.html`;
		if (!existsSync(indexPath)) return c.notFound();
		return c.html(await readFile(indexPath, "utf8"));
	});

	return app;
}
async function rateLimitAuth(c: Context, next: Next) {
	const key = c.req.header("x-forwarded-for") ?? "local";
	const now = Date.now();
	const current = authRateLimit.get(key);
	if (!current || current.resetAt < now) {
		authRateLimit.set(key, { count: 1, resetAt: now + 60_000 });
		await next();
		return;
	}
	if (current.count >= 60) return c.json({ error: "Too many requests" }, 429);
	current.count += 1;
	await next();
}

function apiMetadata(c: Context) {
	return c.json({ ok: true, api: "BFitLog", version: "v1" });
}


function isApiPath(path: string) {
	const unprefixedPath = path.startsWith(`${apiPrefix}/`)
		? path.slice(apiPrefix.length)
		: path;
	return (
		path === apiPrefix ||
		path === `${apiPrefix}/` ||
		unprefixedPath === "/health" ||
		unprefixedPath.startsWith("/api/auth/") ||
		unprefixedPath.startsWith("/auth/") ||
		unprefixedPath.startsWith("/setup") ||
		unprefixedPath.startsWith("/admin") ||
		unprefixedPath.startsWith("/body-weight") ||
		unprefixedPath.startsWith("/goals") ||
		unprefixedPath.startsWith("/reminders") ||
		unprefixedPath.startsWith("/training-plan") ||
		unprefixedPath.startsWith("/workouts") ||
		unprefixedPath.startsWith("/stats") ||
		unprefixedPath.startsWith("/visible-users")
	);
}

function registerApiRoutes(
	app: Hono<{ Variables: Variables }>,
	prefix: "" | typeof apiPrefix,
) {
	app.route(prefix, healthRoutes);
	app.route(prefix, setupRoutes);
	app.route(prefix, adminRoutes);
	app.route(prefix, bodyWeightRoutes);
	app.route(prefix, goalRoutes);
	app.route(prefix, trainingPlanRoutes);
	app.route(prefix, workoutRoutes);
	app.route(prefix, visibleUserRoutes);
}

export type AppType = ReturnType<typeof createApp>;
