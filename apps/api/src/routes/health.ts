import { Hono } from "hono";

export const healthRoutes = new Hono().get("/health", (c) => {
	return c.json({ ok: true });
});
