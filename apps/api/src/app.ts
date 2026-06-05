import { count, eq, ne } from "drizzle-orm";
import { auth } from "./auth/auth.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { adminRoutes } from "./routes/admin.js";
import { bodyWeightRoutes } from "./routes/body-weight.js";
import { goalRoutes } from "./routes/goals.js";
import { healthRoutes } from "./routes/health.js";
import { setupRoutes } from "./routes/setup.js";
import { trainingPlanRoutes } from "./routes/training-plan.js";
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
};

const authRateLimit = new Map<string, { count: number; resetAt: number }>();
const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

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

	app.use("/api/auth/*", async (c, next) => {
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
	});

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
		const canBootstrapFirstUser =
			path === "/admin/users" &&
			(c.req.method === "GET" || c.req.method === "POST");
		const isAlwaysAllowed =
			path === "/health" ||
			path === "/setup/status" ||
			path.startsWith("/api/auth/");

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

	app.route("/", healthRoutes);
	app.route("/", setupRoutes);
	app.route("/", adminRoutes);
	app.route("/", bodyWeightRoutes);
	app.route("/", goalRoutes);
	app.route("/", trainingPlanRoutes);
	app.route("/", workoutRoutes);

	return app;
}

export type AppType = ReturnType<typeof createApp>;
