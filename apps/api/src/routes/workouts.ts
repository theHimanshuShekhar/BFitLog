import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { auth } from "../auth/auth.js";
import { createDb } from "../db/client.js";
import {
	exerciseLogs,
	exercises,
	plannedExercises,
	setLogs,
	trainingDayChecklistItems,
	trainingDays,
	userTrainingPlans,
	workoutChecklistLogs,
	workoutLogs,
} from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

type ExerciseLogStatus = "planned" | "completed" | "skipped";

type SetInput = {
	setIndex?: unknown;
	weightKg?: unknown;
	reps?: unknown;
	durationSeconds?: unknown;
};

function requireUser(c: { get: (key: "user") => Variables["user"] }) {
	const user = c.get("user");
	if (!user) return null;
	return user;
}

function toDate(value: unknown, fallback = new Date()) {
	if (typeof value !== "string") return fallback;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? fallback : date;
}

function formatTarget(planned: {
	targetSets: number;
	targetMinReps: number | null;
	targetMaxReps: number | null;
	targetDurationSeconds: number | null;
}) {
	if (planned.targetDurationSeconds) {
		return `${planned.targetSets} × ${planned.targetDurationSeconds}s`;
	}
	if (planned.targetMinReps && planned.targetMaxReps) {
		return `${planned.targetSets} × ${planned.targetMinReps}-${planned.targetMaxReps}`;
	}
	return `${planned.targetSets} sets`;
}

export const workoutRoutes = new Hono<{ Variables: Variables }>()
	.get("/workouts", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const rows = await db
			.select({
				id: workoutLogs.id,
				userId: workoutLogs.userId,
				trainingDayId: workoutLogs.trainingDayId,
				status: workoutLogs.status,
				startedAt: workoutLogs.startedAt,
				completedAt: workoutLogs.completedAt,
				note: workoutLogs.note,
				trainingDaySequence: trainingDays.sequence,
				trainingDayTitle: trainingDays.title,
			})
			.from(workoutLogs)
			.innerJoin(trainingDays, eq(trainingDays.id, workoutLogs.trainingDayId))
			.where(
				and(
					eq(workoutLogs.userId, user.id),
					eq(workoutLogs.status, "completed"),
				),
			)
			.orderBy(desc(workoutLogs.completedAt), desc(workoutLogs.startedAt));

		return c.json({
			workouts: rows.map((row) => ({
				id: row.id,
				userId: row.userId,
				trainingDayId: row.trainingDayId,
				status: row.status,
				startedAt: row.startedAt.toISOString(),
				completedAt: row.completedAt?.toISOString() ?? null,
				note: row.note,
				trainingDay: {
					sequence: row.trainingDaySequence,
					title: row.trainingDayTitle,
				},
			})),
		});
	})
	.get("/workouts/draft", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const [draft] = await db
			.select()
			.from(workoutLogs)
			.where(
				and(eq(workoutLogs.userId, user.id), eq(workoutLogs.status, "draft")),
			)
			.orderBy(desc(workoutLogs.startedAt))
			.limit(1);

		if (!draft) return c.json({ workout: null });
		return c.json({ workout: await loadWorkout(draft.id, user.id) });
	})
	.post("/workouts/draft", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = (await c.req.json().catch(() => null)) as {
			trainingDayId?: unknown;
			startedAt?: unknown;
		} | null;
		if (!body || typeof body.trainingDayId !== "string") {
			return c.json({ error: "trainingDayId is required" }, 400);
		}

		const [activePlan] = await db
			.select()
			.from(userTrainingPlans)
			.where(eq(userTrainingPlans.userId, user.id))
			.orderBy(desc(userTrainingPlans.activeAt))
			.limit(1);
		if (!activePlan?.templateId)
			return c.json({ error: "No active training plan" }, 409);

		const [trainingDay] = await db
			.select()
			.from(trainingDays)
			.where(
				and(
					eq(trainingDays.id, body.trainingDayId),
					eq(trainingDays.templateId, activePlan.templateId),
				),
			);
		if (!trainingDay) return c.json({ error: "Training day not found" }, 404);

		const now = new Date();
		const workoutId = crypto.randomUUID();
		await db.insert(workoutLogs).values({
			id: workoutId,
			userId: user.id,
			userTrainingPlanId: activePlan.id,
			trainingDayId: trainingDay.id,
			status: "draft",
			startedAt: toDate(body.startedAt, now),
			createdAt: now,
			updatedAt: now,
		});

		const planned = await db
			.select({
				id: plannedExercises.id,
				exerciseId: plannedExercises.exerciseId,
				sortOrder: plannedExercises.sortOrder,
				targetSets: plannedExercises.targetSets,
				targetMinReps: plannedExercises.targetMinReps,
				targetMaxReps: plannedExercises.targetMaxReps,
				targetDurationSeconds: plannedExercises.targetDurationSeconds,
				restSeconds: plannedExercises.restSeconds,
				exerciseName: exercises.name,
			})
			.from(plannedExercises)
			.innerJoin(exercises, eq(exercises.id, plannedExercises.exerciseId))
			.where(eq(plannedExercises.trainingDayId, trainingDay.id))
			.orderBy(asc(plannedExercises.sortOrder));

		if (planned.length) {
			await db.insert(exerciseLogs).values(
				planned.map((item) => ({
					id: crypto.randomUUID(),
					workoutLogId: workoutId,
					plannedExerciseId: item.id,
					plannedExerciseName: item.exerciseName,
					plannedExerciseTarget: formatTarget(item),
					restSeconds: item.restSeconds,
					originalExerciseId: item.exerciseId,
					performedExerciseId: item.exerciseId,
					status: "planned" as const,
					sortOrder: item.sortOrder,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		const checklist = await db
			.select()
			.from(trainingDayChecklistItems)
			.where(eq(trainingDayChecklistItems.trainingDayId, trainingDay.id));
		if (checklist.length) {
			await db.insert(workoutChecklistLogs).values(
				checklist.map((item) => ({
					workoutLogId: workoutId,
					checklistItemId: item.id,
					checked: false,
					updatedAt: now,
				})),
			);
		}

		return c.json({ workout: await loadWorkout(workoutId, user.id) }, 201);
	})
	.get("/workouts/:workoutId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workout = await loadWorkout(c.req.param("workoutId"), user.id);
		if (!workout) return c.json({ error: "Workout not found" }, 404);
		return c.json({ workout });
	})
	.put("/workouts/:workoutId/exercises/:exerciseLogId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const exerciseLogId = c.req.param("exerciseLogId");
		const [workout] = await db
			.select()
			.from(workoutLogs)
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);
		if (!workout) return c.json({ error: "Workout not found" }, 404);
		if (workout.status !== "draft" && workout.status !== "completed")
			return c.json({ error: "Workout is not editable" }, 409);

		const body = (await c.req.json().catch(() => null)) as {
			status?: unknown;
			goodForm?: unknown;
			note?: unknown;
			skipReason?: unknown;
			substitutionNote?: unknown;
			performedExerciseId?: unknown;
			sets?: SetInput[];
		} | null;
		if (!body || !isExerciseLogStatus(body.status)) {
			return c.json({ error: "Valid exercise status is required" }, 400);
		}
		if (
			body.status === "skipped" &&
			(typeof body.skipReason !== "string" || !body.skipReason.trim())
		) {
			return c.json({ error: "skipReason is required when skipping" }, 400);
		}

		const now = new Date();
		await db
			.update(exerciseLogs)
			.set({
				status: body.status,
				goodForm: typeof body.goodForm === "boolean" ? body.goodForm : null,
				note: typeof body.note === "string" ? body.note : null,
				skipReason:
					typeof body.skipReason === "string" ? body.skipReason.trim() : null,
				substitutionNote:
					typeof body.substitutionNote === "string"
						? body.substitutionNote
						: null,
				performedExerciseId:
					typeof body.performedExerciseId === "string"
						? body.performedExerciseId
						: undefined,
				updatedAt: now,
			})
			.where(
				and(
					eq(exerciseLogs.id, exerciseLogId),
					eq(exerciseLogs.workoutLogId, workoutId),
				),
			);

		await db.delete(setLogs).where(eq(setLogs.exerciseLogId, exerciseLogId));
		const sets = Array.isArray(body.sets) ? body.sets : [];
		if (sets.length) {
			await db.insert(setLogs).values(
				sets.map((set, index) => ({
					id: crypto.randomUUID(),
					exerciseLogId,
					setIndex: typeof set.setIndex === "number" ? set.setIndex : index + 1,
					weightKg:
						typeof set.weightKg === "number" ? set.weightKg.toString() : null,
					reps: typeof set.reps === "number" ? set.reps : null,
					durationSeconds:
						typeof set.durationSeconds === "number"
							? set.durationSeconds
							: null,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		const exercise = await loadExerciseLog(exerciseLogId);
		return c.json({ exercise });
	})
	.post("/workouts/:workoutId/complete", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const body = (await c.req.json().catch(() => ({}))) as {
			completedAt?: unknown;
			note?: unknown;
		};
		const now = new Date();
		await db
			.update(workoutLogs)
			.set({
				status: "completed",
				completedAt: toDate(body.completedAt, now),
				note: typeof body.note === "string" ? body.note : null,
				updatedAt: now,
			})
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);

		return c.json({ workout: await loadWorkout(workoutId, user.id) });
	})
	.patch("/workouts/:workoutId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const body = (await c.req.json().catch(() => null)) as {
			note?: unknown;
			completedAt?: unknown;
		} | null;
		const [workout] = await db
			.select()
			.from(workoutLogs)
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);
		if (!workout) return c.json({ error: "Workout not found" }, 404);
		if (workout.status !== "draft" && workout.status !== "completed") {
			return c.json({ error: "Workout is not editable" }, 409);
		}

		await db
			.update(workoutLogs)
			.set({
				note: typeof body?.note === "string" ? body.note.trim() || null : workout.note,
				completedAt:
					workout.status === "completed"
						? toDate(body?.completedAt, workout.completedAt ?? new Date())
						: workout.completedAt,
				updatedAt: new Date(),
			})
			.where(eq(workoutLogs.id, workoutId));
		return c.json({ workout: await loadWorkout(workoutId, user.id) });
	})
	.put("/workouts/:workoutId/checklist/:checklistItemId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const checklistItemId = c.req.param("checklistItemId");
		const body = (await c.req.json().catch(() => null)) as {
			checked?: unknown;
		} | null;
		if (typeof body?.checked !== "boolean") {
			return c.json({ error: "checked boolean is required" }, 400);
		}
		const [workout] = await db
			.select()
			.from(workoutLogs)
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);
		if (!workout) return c.json({ error: "Workout not found" }, 404);
		if (workout.status !== "draft" && workout.status !== "completed") {
			return c.json({ error: "Workout checklist is not editable" }, 409);
		}

		await db
			.update(workoutChecklistLogs)
			.set({ checked: body.checked, updatedAt: new Date() })
			.where(
				and(
					eq(workoutChecklistLogs.workoutLogId, workoutId),
					eq(workoutChecklistLogs.checklistItemId, checklistItemId),
				),
			);
		return c.json({ workout: await loadWorkout(workoutId, user.id) });
	})
	.delete("/workouts/:workoutId", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const now = new Date();
		await db
			.update(workoutLogs)
			.set({ status: "discarded", updatedAt: now, deletedAt: now })
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);
		return c.json({ ok: true });
	})
	.post("/workouts/:workoutId/discard", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const workoutId = c.req.param("workoutId");
		const now = new Date();
		await db
			.update(workoutLogs)
			.set({ status: "discarded", updatedAt: now, deletedAt: now })
			.where(
				and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, user.id)),
			);

		return c.json({ workout: await loadWorkout(workoutId, user.id) });
	});

function isExerciseLogStatus(value: unknown): value is ExerciseLogStatus {
	return value === "planned" || value === "completed" || value === "skipped";
}

async function loadWorkout(workoutId: string, userId: string) {
	const [workout] = await db
		.select()
		.from(workoutLogs)
		.where(and(eq(workoutLogs.id, workoutId), eq(workoutLogs.userId, userId)));
	if (!workout) return null;

	const [exerciseRows, checklistRows] = await Promise.all([
		db
			.select()
			.from(exerciseLogs)
			.where(eq(exerciseLogs.workoutLogId, workout.id))
			.orderBy(asc(exerciseLogs.sortOrder)),
		db
			.select({
				checklistItemId: workoutChecklistLogs.checklistItemId,
				checked: workoutChecklistLogs.checked,
				kind: trainingDayChecklistItems.kind,
				text: trainingDayChecklistItems.text,
				sortOrder: trainingDayChecklistItems.sortOrder,
			})
			.from(workoutChecklistLogs)
			.innerJoin(
				trainingDayChecklistItems,
				eq(trainingDayChecklistItems.id, workoutChecklistLogs.checklistItemId),
			)
			.where(eq(workoutChecklistLogs.workoutLogId, workout.id))
			.orderBy(asc(trainingDayChecklistItems.sortOrder)),
	]);

	const exerciseIds = exerciseRows.map((row) => row.id);
	const sets = exerciseIds.length
		? await db
				.select()
				.from(setLogs)
				.where(inArray(setLogs.exerciseLogId, exerciseIds))
				.orderBy(asc(setLogs.setIndex))
		: [];
	const setsByExercise = groupBy(sets, (set) => set.exerciseLogId);

	return {
		id: workout.id,
		userId: workout.userId,
		userTrainingPlanId: workout.userTrainingPlanId,
		trainingDayId: workout.trainingDayId,
		status: workout.status,
		startedAt: workout.startedAt.toISOString(),
		completedAt: workout.completedAt?.toISOString() ?? null,
		note: workout.note,
		exercises: exerciseRows.map((exercise) =>
			serializeExerciseLog(exercise, setsByExercise.get(exercise.id) ?? []),
		),
		checklist: checklistRows.map((item) => ({
			checklistItemId: item.checklistItemId,
			kind: item.kind,
			text: item.text,
			checked: item.checked,
			sortOrder: item.sortOrder,
		})),
	};
}

async function loadExerciseLog(exerciseLogId: string) {
	const [exercise] = await db
		.select()
		.from(exerciseLogs)
		.where(eq(exerciseLogs.id, exerciseLogId));
	if (!exercise) return null;
	const sets = await db
		.select()
		.from(setLogs)
		.where(eq(setLogs.exerciseLogId, exerciseLogId))
		.orderBy(asc(setLogs.setIndex));
	return serializeExerciseLog(exercise, sets);
}

function serializeExerciseLog(
	exercise: typeof exerciseLogs.$inferSelect,
	sets: Array<typeof setLogs.$inferSelect>,
) {
	return {
		id: exercise.id,
		workoutLogId: exercise.workoutLogId,
		plannedExerciseId: exercise.plannedExerciseId,
		plannedExerciseName: exercise.plannedExerciseName,
		plannedExerciseTarget: exercise.plannedExerciseTarget,
		restSeconds: exercise.restSeconds,
		originalExerciseId: exercise.originalExerciseId,
		performedExerciseId: exercise.performedExerciseId,
		status: exercise.status,
		goodForm: exercise.goodForm,
		note: exercise.note,
		skipReason: exercise.skipReason,
		substitutionNote: exercise.substitutionNote,
		sortOrder: exercise.sortOrder,
		sets: sets.map((set) => ({
			id: set.id,
			setIndex: set.setIndex,
			weightKg: set.weightKg ? Number(set.weightKg) : null,
			reps: set.reps,
			durationSeconds: set.durationSeconds,
		})),
	};
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = getKey(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return groups;
}
