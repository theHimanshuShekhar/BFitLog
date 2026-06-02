import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { auth } from "../auth/auth.js";
import { createDb } from "../db/client.js";
import {
	notificationDevices,
	reminderSettings,
	workoutFrequencyGoals,
} from "../db/schema.js";
import { canReadUserData } from "./visibility.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

function requireUser(c: { get: (key: "user") => Variables["user"] }) {
	const user = c.get("user");
	if (!user) return null;
	return user;
}

function isReminderTime(value: unknown) {
	return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export const goalRoutes = new Hono<{ Variables: Variables }>()
	.get("/goals/workout-frequency", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);
		const targetUserId = c.req.query("userId") ?? user.id;
		if (!(await canReadUserData(user.id, targetUserId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
		const [goal] = await db
			.select()
			.from(workoutFrequencyGoals)
			.where(eq(workoutFrequencyGoals.userId, targetUserId));
		return c.json({ goal: goal ?? null });
	})
	.put("/goals/workout-frequency", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);
		const body = (await c.req.json().catch(() => null)) as {
			targetWorkoutsPerWeek?: unknown;
			updatedAt?: unknown;
		} | null;
		if (
			typeof body?.targetWorkoutsPerWeek !== "number" ||
			body.targetWorkoutsPerWeek < 1 ||
			body.targetWorkoutsPerWeek > 14
		) {
			return c.json({ error: "Target workouts per week must be 1-14" }, 400);
		}
		const updatedAt =
			typeof body.updatedAt === "string" ? new Date(body.updatedAt) : new Date();
		await db
			.insert(workoutFrequencyGoals)
			.values({
				userId: user.id,
				targetWorkoutsPerWeek: body.targetWorkoutsPerWeek,
				updatedAt,
			})
			.onConflictDoUpdate({
				target: workoutFrequencyGoals.userId,
				set: {
					targetWorkoutsPerWeek: body.targetWorkoutsPerWeek,
					updatedAt,
				},
			});
		const [goal] = await db
			.select()
			.from(workoutFrequencyGoals)
			.where(eq(workoutFrequencyGoals.userId, user.id));
		return c.json({ goal });
	})
	.get("/reminders/settings", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);
		const [settings] = await db
			.select()
			.from(reminderSettings)
			.where(eq(reminderSettings.userId, user.id));
		return c.json({ settings: settings ?? null });
	})
	.put("/reminders/settings", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);
		const body = (await c.req.json().catch(() => null)) as {
			workoutReminderEnabled?: unknown;
			workoutReminderTime?: unknown;
			weighInReminderEnabled?: unknown;
			weighInReminderTime?: unknown;
			updatedAt?: unknown;
		} | null;
		if (
			typeof body?.workoutReminderEnabled !== "boolean" ||
			typeof body.weighInReminderEnabled !== "boolean"
		) {
			return c.json({ error: "Reminder enabled flags are required" }, 400);
		}
		if (
			body.workoutReminderEnabled &&
			!isReminderTime(body.workoutReminderTime)
		) {
			return c.json({ error: "Workout reminder time must be HH:MM" }, 400);
		}
		if (body.weighInReminderEnabled && !isReminderTime(body.weighInReminderTime)) {
			return c.json({ error: "Weigh-in reminder time must be HH:MM" }, 400);
		}
		const updatedAt =
			typeof body.updatedAt === "string" ? new Date(body.updatedAt) : new Date();
		const values = {
			userId: user.id,
			workoutReminderEnabled: body.workoutReminderEnabled,
			workoutReminderTime: body.workoutReminderEnabled
				? String(body.workoutReminderTime)
				: null,
			weighInReminderEnabled: body.weighInReminderEnabled,
			weighInReminderTime: body.weighInReminderEnabled
				? String(body.weighInReminderTime)
				: null,
			updatedAt,
		};
		await db
			.insert(reminderSettings)
			.values(values)
			.onConflictDoUpdate({
				target: reminderSettings.userId,
				set: values,
			});
		const [settings] = await db
			.select()
			.from(reminderSettings)
			.where(eq(reminderSettings.userId, user.id));
		return c.json({ settings });
	})
	.put("/reminders/devices/:deviceId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);
		const deviceId = c.req.param("deviceId");
		const body = (await c.req.json().catch(() => null)) as {
			platform?: unknown;
			pushToken?: unknown;
			notificationsEnabled?: unknown;
		} | null;
		if (typeof body?.platform !== "string") {
			return c.json({ error: "Platform is required" }, 400);
		}
		if (typeof body.notificationsEnabled !== "boolean") {
			return c.json({ error: "notificationsEnabled is required" }, 400);
		}
		const [existing] = await db
			.select()
			.from(notificationDevices)
			.where(eq(notificationDevices.deviceId, deviceId));
		const values = {
			id: existing?.id ?? crypto.randomUUID(),
			userId: user.id,
			deviceId,
			platform: body.platform,
			pushToken: typeof body.pushToken === "string" ? body.pushToken : null,
			notificationsEnabled: body.notificationsEnabled,
			updatedAt: new Date(),
		};
		if (existing) {
			await db
				.update(notificationDevices)
				.set(values)
				.where(eq(notificationDevices.id, existing.id));
		} else {
			await db.insert(notificationDevices).values(values);
		}
		return c.json({ device: values });
	});
