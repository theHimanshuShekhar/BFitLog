import { asc, count, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth/auth.js";
import {
	defaultAdminUsername,
	deleteDefaultAdminIfRealAdminExists,
	internalEmailForUsername,
} from "../bootstrap.js";
import { createDb } from "../db/client.js";
import { user } from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

function isAdmin(currentUser: Variables["user"]) {
	return (currentUser as { role?: string } | null)?.role === "admin";
}

export const adminRoutes = new Hono<{ Variables: Variables }>()
	.use("/admin/*", async (c, next) => {
		const currentUser = c.get("user");
		if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
		if (!isAdmin(currentUser)) return c.json({ error: "Forbidden" }, 403);
		await next();
	})
	.get("/admin/users", async (c) => {
		const users = await db
			.select({
				id: user.id,
				username: user.username,
				displayName: user.name,
				role: user.role,
				createdAt: user.createdAt,
			})
			.from(user)
			.orderBy(asc(user.createdAt));

		return c.json({
			users: users.map((item) => ({
				...item,
				createdAt: item.createdAt.toISOString(),
			})),
		});
	})
	.post("/admin/users", async (c) => {
		const body = (await c.req.json().catch(() => null)) as {
			username?: unknown;
			displayName?: unknown;
			password?: unknown;
			role?: unknown;
		} | null;

		if (typeof body?.username !== "string" || !isValidUsername(body.username)) {
			return c.json(
				{
					error:
						"Username must be at least 2 characters and use letters, numbers, underscores, or hyphens",
				},
				400,
			);
		}
		if (body.username.toLowerCase() === defaultAdminUsername) {
			return c.json({ error: "Cannot create another default admin user" }, 400);
		}
		if (typeof body.displayName !== "string" || !body.displayName.trim()) {
			return c.json({ error: "Display name is required" }, 400);
		}
		if (
			typeof body.password !== "string" ||
			body.password.length < 8 ||
			body.password.length > 128
		) {
			return c.json({ error: "Password must be 8-128 characters" }, 400);
		}

		const [realUserCount] = await db
			.select({ value: count() })
			.from(user)
			.where(ne(user.username, defaultAdminUsername));
		const role =
			(realUserCount?.value ?? 0) === 0
				? "admin"
				: body.role === "admin"
					? "admin"
					: "member";

		const created = await auth.api.signUpEmail({
			body: {
				name: body.displayName.trim(),
				email: internalEmailForUsername(body.username.trim()),
				password: body.password,
				username: body.username.trim(),
			},
			headers: c.req.raw.headers,
		});

		await db.update(user).set({ role }).where(eq(user.id, created.user.id));
		const defaultAdminDeleted = await deleteDefaultAdminIfRealAdminExists();

		return c.json(
			{
				user: {
					id: created.user.id,
					username: created.user.username,
					displayName: created.user.name,
					role,
				},
				defaultAdminDeleted,
			},
			201,
		);
	})
	.post("/admin/users/:userId/password", async (c) => {
		const body = (await c.req.json().catch(() => null)) as {
			newPassword?: unknown;
		} | null;
		if (
			typeof body?.newPassword !== "string" ||
			body.newPassword.length < 8 ||
			body.newPassword.length > 128
		) {
			return c.json({ error: "Password must be 8-128 characters" }, 400);
		}

		const targetUserId = c.req.param("userId");
		const [targetUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.id, targetUserId));
		if (!targetUser) return c.json({ error: "User not found" }, 404);

		await auth.api.setUserPassword({
			body: {
				userId: targetUserId,
				newPassword: body.newPassword,
			},
			headers: c.req.raw.headers,
		});

		return c.json({ ok: true });
	});

function isValidUsername(username: string) {
	return username.trim().length >= 2 && /^[a-zA-Z0-9_-]+$/.test(username);
}
