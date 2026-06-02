import { bodyWeightGoalSchema, bodyWeightLogSchema } from "@bfitlog/shared";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client.js";
import { bodyWeightGoals, bodyWeightLogs } from "../db/schema.js";
import type { auth } from "../auth/auth.js";
import { canReadUserData } from "./visibility.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

function toIso(value: Date | null) {
	return value?.toISOString();
}

function requireUser(c: { get: (key: "user") => Variables["user"] }) {
	const user = c.get("user");
	if (!user) return null;
	return user;
}

export const bodyWeightRoutes = new Hono<{ Variables: Variables }>()
	.get("/body-weight/goal", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const targetUserId = c.req.query("userId") ?? user.id;
		if (!(await canReadUserData(user.id, targetUserId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
		const [goal] = await db
			.select()
			.from(bodyWeightGoals)
			.where(eq(bodyWeightGoals.userId, targetUserId));
		if (!goal) return c.json({ goal: null });

		return c.json({
			goal: {
				userId: goal.userId,
				targetKg: Number(goal.targetKg),
				direction: goal.direction,
				updatedAt: goal.updatedAt.toISOString(),
			},
		});
	})
	.put("/body-weight/goal", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = bodyWeightGoalSchema.safeParse(await c.req.json());
		if (!body.success)
			return c.json(
				{ error: "Invalid body weight goal", issues: body.error.issues },
				400,
			);
		if (body.data.userId !== user.id)
			return c.json({ error: "Cannot edit another user's goal" }, 403);

		const incomingUpdatedAt = new Date(body.data.updatedAt);
		const [existing] = await db
			.select()
			.from(bodyWeightGoals)
			.where(eq(bodyWeightGoals.userId, user.id));

		if (!existing) {
			await db.insert(bodyWeightGoals).values({
				userId: user.id,
				targetKg: body.data.targetKg.toFixed(1),
				direction: body.data.direction,
				updatedAt: incomingUpdatedAt,
			});
		} else if (incomingUpdatedAt >= existing.updatedAt) {
			await db
				.update(bodyWeightGoals)
				.set({
					targetKg: body.data.targetKg.toFixed(1),
					direction: body.data.direction,
					updatedAt: incomingUpdatedAt,
				})
				.where(eq(bodyWeightGoals.userId, user.id));
		}

		const [goal] = await db
			.select()
			.from(bodyWeightGoals)
			.where(eq(bodyWeightGoals.userId, user.id));
		return c.json({
			goal: goal
				? {
						userId: goal.userId,
						targetKg: Number(goal.targetKg),
						direction: goal.direction,
						updatedAt: goal.updatedAt.toISOString(),
					}
				: null,
		});
	})
	.get("/body-weight/logs", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const targetUserId = c.req.query("userId") ?? user.id;
		if (!(await canReadUserData(user.id, targetUserId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
		const logs = await db
			.select()
			.from(bodyWeightLogs)
			.where(eq(bodyWeightLogs.userId, targetUserId))
			.orderBy(desc(bodyWeightLogs.measuredAt));

		return c.json({
			logs: logs.map((log) => ({
				id: log.id,
				userId: log.userId,
				measuredAt: log.measuredAt.toISOString(),
				weightKg: Number(log.weightKg),
				note: log.note ?? undefined,
				createdAt: log.createdAt.toISOString(),
				updatedAt: log.updatedAt.toISOString(),
				deletedAt: toIso(log.deletedAt),
			})),
		});
	})
	.put("/body-weight/logs/:id", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = bodyWeightLogSchema.safeParse(await c.req.json());
		if (!body.success)
			return c.json(
				{ error: "Invalid body weight log", issues: body.error.issues },
				400,
			);
		if (body.data.id !== c.req.param("id"))
			return c.json({ error: "Route id and body id must match" }, 400);
		if (body.data.userId !== user.id)
			return c.json({ error: "Cannot edit another user's log" }, 403);

		const incomingUpdatedAt = new Date(body.data.updatedAt);
		const [existing] = await db
			.select()
			.from(bodyWeightLogs)
			.where(
				and(
					eq(bodyWeightLogs.id, body.data.id),
					eq(bodyWeightLogs.userId, user.id),
				),
			);

		const values = {
			id: body.data.id,
			userId: user.id,
			measuredAt: new Date(body.data.measuredAt),
			weightKg: body.data.weightKg.toFixed(1),
			note: body.data.note,
			createdAt: new Date(body.data.createdAt),
			updatedAt: incomingUpdatedAt,
			deletedAt: body.data.deletedAt ? new Date(body.data.deletedAt) : null,
		};

		if (!existing) {
			await db.insert(bodyWeightLogs).values(values);
		} else if (incomingUpdatedAt >= existing.updatedAt) {
			await db
				.update(bodyWeightLogs)
				.set(values)
				.where(eq(bodyWeightLogs.id, body.data.id));
		}

		return c.json({ ok: true });
	})
	.delete("/body-weight/logs/:id", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const now = new Date();
		await db
			.update(bodyWeightLogs)
			.set({ updatedAt: now, deletedAt: now })
			.where(
				and(
					eq(bodyWeightLogs.id, c.req.param("id")),
					eq(bodyWeightLogs.userId, user.id),
				),
			);

		return c.json({ ok: true, deletedAt: now.toISOString() });
	});
