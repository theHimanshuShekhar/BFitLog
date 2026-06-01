import { setupRequestSchema } from "@bfitlog/shared";
import { count } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth/auth.js";
import { createDb } from "../db/client.js";
import { partnerLinks, user } from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

function internalEmailForUsername(username: string) {
	return `${username.toLowerCase()}@users.bfitlog.local`;
}

async function hasUsers() {
	const [row] = await db.select({ value: count() }).from(user);
	return (row?.value ?? 0) > 0;
}

export const setupRoutes = new Hono()
	.get("/setup/status", async (c) => {
		return c.json({ setupRequired: !(await hasUsers()) });
	})
	.post("/setup", async (c) => {
		if (await hasUsers()) {
			return c.json({ error: "Setup has already been completed" }, 409);
		}

		const body = setupRequestSchema.safeParse(await c.req.json());
		if (!body.success) {
			return c.json(
				{ error: "Invalid setup request", issues: body.error.issues },
				400,
			);
		}

		if (
			body.data.admin.username.toLowerCase() ===
			body.data.partner.username.toLowerCase()
		) {
			return c.json(
				{ error: "Admin and partner usernames must be different" },
				400,
			);
		}

		const admin = await auth.api.signUpEmail({
			body: {
				name: body.data.admin.displayName,
				email: internalEmailForUsername(body.data.admin.username),
				password: body.data.admin.password,
				username: body.data.admin.username,
				role: "admin",
			},
			headers: c.req.raw.headers,
		});

		const partner = await auth.api.signUpEmail({
			body: {
				name: body.data.partner.displayName,
				email: internalEmailForUsername(body.data.partner.username),
				password: body.data.partner.password,
				username: body.data.partner.username,
				role: "member",
			},
			headers: c.req.raw.headers,
		});

		await db.insert(partnerLinks).values({
			userAId: admin.user.id,
			userBId: partner.user.id,
		});

		return c.json(
			{
				admin: {
					id: admin.user.id,
					username: admin.user.username,
					displayName: admin.user.name,
					role: admin.user.role,
				},
				partner: {
					id: partner.user.id,
					username: partner.user.username,
					displayName: partner.user.name,
					role: partner.user.role,
				},
			},
			201,
		);
	});
