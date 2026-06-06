import { asc, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import type { auth } from "../auth/auth.js";
import { createDb } from "../db/client.js";
import { partnerLinks, user as userTable } from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export const visibleUserRoutes = new Hono<{ Variables: Variables }>().get(
	"/visible-users",
	async (c) => {
		const user = c.get("user");
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const links = await db
			.select()
			.from(partnerLinks)
			.where(or(eq(partnerLinks.userAId, user.id), eq(partnerLinks.userBId, user.id)));
		const linkedIds = links.map((link) =>
			link.userAId === user.id ? link.userBId : link.userAId,
		);
		const visibleIds = [user.id, ...linkedIds];
		const rows = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				name: userTable.name,
				role: userTable.role,
			})
			.from(userTable)
			.where(inArray(userTable.id, visibleIds))
			.orderBy(asc(userTable.username));
		const byId = new Map(rows.map((row) => [row.id, row]));

		return c.json({
			users: visibleIds.flatMap((id) => {
				const row = byId.get(id);
				return row ? [row] : [];
			}),
		});
	},
);
