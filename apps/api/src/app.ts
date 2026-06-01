import { auth } from "./auth/auth.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyWeightRoutes } from "./routes/body-weight.js";
import { healthRoutes } from "./routes/health.js";
import { setupRoutes } from "./routes/setup.js";

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export function createApp() {
	const app = new Hono<{ Variables: Variables }>();

	app.use(
		"*",
		cors({
			origin: (origin) => origin,
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

	app.on(["POST", "GET"], "/api/auth/*", (c) => {
		return auth.handler(c.req.raw);
	});

	app.route("/", healthRoutes);
	app.route("/", setupRoutes);
	app.route("/", bodyWeightRoutes);

	return app;
}

export type AppType = ReturnType<typeof createApp>;
