import { Hono } from "hono";

export const setupRoutes = new Hono()
	.get("/setup/status", async (c) => {
		return c.json({ setupRequired: false });
	})
	.post("/setup", async (c) => {
		return c.json(
			{
				error:
					"First-run setup has moved to the default admin account. Log in with the startup-created admin account and create real users from Settings.",
			},
			410,
		);
	});
