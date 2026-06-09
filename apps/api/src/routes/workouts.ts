import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { auth } from "../auth/auth.js";
import { canReadUserData } from "./visibility.js";
import { createDb } from "../db/client.js";
import {
	exerciseLogs,
	exercises,
	plannedExercises,
	plannedExerciseSubstitutes,
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

function formatTarget(prescription: {
	targetSets: number | null;
	targetMinReps: number | null;
	targetMaxReps: number | null;
	targetDurationSeconds: number | null;
}) {
	const sets = prescription.targetSets ?? 1;
	if (prescription.targetDurationSeconds) {
		return `${sets} × ${prescription.targetDurationSeconds}s`;
	}
	if (prescription.targetMinReps && prescription.targetMaxReps) {
		return `${sets} × ${prescription.targetMinReps}-${prescription.targetMaxReps}`;
	}
	return `${sets} sets`;
}

export const workoutRoutes = new Hono<{ Variables: Variables }>()
	.get("/stats/workouts", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const targetUserId = c.req.query("userId") ?? user.id;
		if (!(await canReadUserData(user.id, targetUserId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
		const completed = await db
			.select({
				id: workoutLogs.id,
				completedAt: workoutLogs.completedAt,
			})
			.from(workoutLogs)
			.where(
				and(
					eq(workoutLogs.userId, targetUserId),
					eq(workoutLogs.status, "completed"),
				),
			);
		const workoutIds = completed.map((workout) => workout.id);
		const rows = workoutIds.length
			? await db
					.select({
						exerciseLogId: exerciseLogs.id,
						workoutLogId: exerciseLogs.workoutLogId,
						plannedExerciseTarget: exerciseLogs.plannedExerciseTarget,
						status: exerciseLogs.status,
						goodForm: exerciseLogs.goodForm,
						performedExerciseId: exerciseLogs.performedExerciseId,
						exerciseName: exercises.name,
						weightKg: setLogs.weightKg,
						reps: setLogs.reps,
						durationSeconds: setLogs.durationSeconds,
					})
					.from(exerciseLogs)
					.leftJoin(setLogs, eq(setLogs.exerciseLogId, exerciseLogs.id))
					.leftJoin(
						exercises,
						eq(exercises.id, exerciseLogs.performedExerciseId),
					)
					.where(inArray(exerciseLogs.workoutLogId, workoutIds))
			: [];

		const exerciseStats = new Map<
			string,
			{
				exerciseId: string;
				exerciseName: string;
				bestWeightKg: number | null;
				volumeKg: number;
				bestDurationSeconds: number | null;
				successfulTopRangeSessions: number;
				progressionHint: string | null;
			}
		>();
		const successfulCandidates = new Map<
			string,
			{
				exerciseId: string;
				workoutLogId: string;
				goodForm: boolean | null;
				targetSets: number | null;
				targetMaxReps: number | null;
				reps: number[];
			}
		>();
		for (const row of rows) {
			if (row.status === "skipped" || !row.performedExerciseId) continue;
			const current = exerciseStats.get(row.performedExerciseId) ?? {
				exerciseId: row.performedExerciseId,
				exerciseName: row.exerciseName ?? row.performedExerciseId,
				bestWeightKg: null,
				volumeKg: 0,
				bestDurationSeconds: null,
				successfulTopRangeSessions: 0,
				progressionHint: null,
			};
			const weight = row.weightKg ? Number(row.weightKg) : null;
			if (weight !== null) {
				current.bestWeightKg = Math.max(current.bestWeightKg ?? 0, weight);
				current.volumeKg += weight * (row.reps ?? 0);
			}
			if (row.durationSeconds) {
				current.bestDurationSeconds = Math.max(
					current.bestDurationSeconds ?? 0,
					row.durationSeconds,
				);
			}
			const target = parseRepTarget(row.plannedExerciseTarget);
			const candidate = successfulCandidates.get(row.exerciseLogId) ?? {
				exerciseId: row.performedExerciseId,
				workoutLogId: row.workoutLogId,
				goodForm: row.goodForm,
				targetSets: target?.sets ?? null,
				targetMaxReps: target?.maxReps ?? null,
				reps: [],
			};
			if (typeof row.reps === "number") candidate.reps.push(row.reps);
			successfulCandidates.set(row.exerciseLogId, candidate);
			exerciseStats.set(row.performedExerciseId, current);
		}
		const successfulSessions = new Map<string, Set<string>>();
		for (const candidate of successfulCandidates.values()) {
			const { targetSets, targetMaxReps } = candidate;
			if (
				candidate.goodForm &&
				targetSets !== null &&
				targetMaxReps !== null &&
				candidate.reps.length >= targetSets &&
				candidate.reps.slice(0, targetSets).every((reps) => reps >= targetMaxReps)
			) {
				const sessions =
					successfulSessions.get(candidate.exerciseId) ?? new Set<string>();
				sessions.add(candidate.workoutLogId);
				successfulSessions.set(candidate.exerciseId, sessions);
			}
		}
		for (const stat of exerciseStats.values()) {
			stat.successfulTopRangeSessions =
				successfulSessions.get(stat.exerciseId)?.size ?? 0;
			stat.progressionHint =
				stat.successfulTopRangeSessions >= 2
					? "Consider increasing load next time; do not auto-change the plan."
					: null;
		}

		const consistencyByWeek = new Map<string, number>();
		for (const workout of completed) {
			if (!workout.completedAt) continue;
			const week = weekKey(workout.completedAt);
			consistencyByWeek.set(week, (consistencyByWeek.get(week) ?? 0) + 1);
		}

		return c.json({
			exercises: [...exerciseStats.values()],
			consistency: [...consistencyByWeek.entries()].map(([week, count]) => ({
				week,
				count,
			})),
		});
	})
	.get("/workouts", async (c) => {
		const user = requireUser(c);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const targetUserId = c.req.query("userId") ?? user.id;
		if (!(await canReadUserData(user.id, targetUserId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
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
					eq(workoutLogs.userId, targetUserId),
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
				recommendedSets: exercises.recommendedSets,
				recommendedMinReps: exercises.recommendedMinReps,
				recommendedMaxReps: exercises.recommendedMaxReps,
				recommendedDurationSeconds: exercises.recommendedDurationSeconds,
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
					plannedExerciseTarget: formatTarget({
						targetSets: item.recommendedSets ?? item.targetSets,
						targetMinReps: item.recommendedMinReps ?? item.targetMinReps,
						targetMaxReps: item.recommendedMaxReps ?? item.targetMaxReps,
						targetDurationSeconds:
							item.recommendedDurationSeconds ?? item.targetDurationSeconds,
					}),
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

		const [workoutLog] = await db
			.select({ userId: workoutLogs.userId })
			.from(workoutLogs)
			.where(eq(workoutLogs.id, c.req.param("workoutId")))
			.limit(1);
		if (!workoutLog) return c.json({ error: "Workout not found" }, 404);
		if (!(await canReadUserData(user.id, workoutLog.userId))) {
			return c.json({ error: "Forbidden" }, 403);
		}
		const workout = await loadWorkout(c.req.param("workoutId"), workoutLog.userId);
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
		const sets = Array.isArray(body.sets) ? body.sets : [];
		const invalidSet = sets.find((set) => !isValidSetInput(set));
		if (invalidSet) return c.json({ error: "Invalid set payload" }, 400);
		const status = body.status;

		const now = new Date();
		await db.transaction(async (tx) => {
			await tx
				.update(exerciseLogs)
				.set({
					status,
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

			await tx.delete(setLogs).where(eq(setLogs.exerciseLogId, exerciseLogId));
			if (sets.length) {
				await tx.insert(setLogs).values(
					sets.map((set, index) => ({
						id: crypto.randomUUID(),
						exerciseLogId,
						setIndex:
							typeof set.setIndex === "number" ? set.setIndex : index + 1,
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
		});

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
				note:
					typeof body?.note === "string"
						? body.note.trim() || null
						: workout.note,
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

function isValidSetInput(set: SetInput) {
	if (set.setIndex !== undefined) {
		if (typeof set.setIndex !== "number") return false;
		if (!Number.isInteger(set.setIndex) || set.setIndex < 1) return false;
	}
	if (set.weightKg !== undefined) {
		if (typeof set.weightKg !== "number") return false;
		if (!Number.isFinite(set.weightKg) || set.weightKg <= 0) return false;
	}
	if (set.reps !== undefined) {
		if (typeof set.reps !== "number") return false;
		if (!Number.isInteger(set.reps) || set.reps < 1) return false;
	}
	if (set.durationSeconds !== undefined) {
		if (typeof set.durationSeconds !== "number") return false;
		if (!Number.isInteger(set.durationSeconds) || set.durationSeconds < 1) {
			return false;
		}
	}
	return true;
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
	const plannedExerciseIds = exerciseRows.flatMap((row) =>
		row.plannedExerciseId ? [row.plannedExerciseId] : [],
	);
	const [sets, substituteRows] = await Promise.all([
		exerciseIds.length
			? db
					.select()
					.from(setLogs)
					.where(inArray(setLogs.exerciseLogId, exerciseIds))
					.orderBy(asc(setLogs.setIndex))
			: [],
		loadSubstitutes(plannedExerciseIds),
	]);
	const setsByExercise = groupBy(sets, (set) => set.exerciseLogId);
	const substitutesByPlannedExercise = groupBy(
		substituteRows,
		(row) => row.plannedExerciseId,
	);

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
			serializeExerciseLog(
				exercise,
				setsByExercise.get(exercise.id) ?? [],
				exercise.plannedExerciseId
					? (substitutesByPlannedExercise.get(exercise.plannedExerciseId) ?? [])
					: [],
			),
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
	const [sets, substituteRows] = await Promise.all([
		db
			.select()
			.from(setLogs)
			.where(eq(setLogs.exerciseLogId, exerciseLogId))
			.orderBy(asc(setLogs.setIndex)),
		loadSubstitutes(exercise.plannedExerciseId ? [exercise.plannedExerciseId] : []),
	]);
	return serializeExerciseLog(exercise, sets, substituteRows);
}

function serializeExerciseLog(
	exercise: typeof exerciseLogs.$inferSelect,
	sets: Array<typeof setLogs.$inferSelect>,
	substitutes: SubstituteRow[] = [],
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
		substitutes: substitutes.map((substitute) => ({
			exercise: {
				id: substitute.exerciseId,
				name: substitute.exerciseName,
				equipment: substitute.exerciseEquipment,
				trackingType: substitute.exerciseTrackingType,
			},
			targetSets: substitute.targetSets,
			targetMinReps: substitute.targetMinReps,
			targetMaxReps: substitute.targetMaxReps,
			targetDurationSeconds: substitute.targetDurationSeconds,
			notes: substitute.notes,
		})),
	};
}

type SubstituteRow = Awaited<ReturnType<typeof loadSubstitutes>>[number];

async function loadSubstitutes(plannedExerciseIds: string[]) {
	if (plannedExerciseIds.length === 0) return [];
	return db
		.select({
			plannedExerciseId: plannedExerciseSubstitutes.plannedExerciseId,
			exerciseId: plannedExerciseSubstitutes.exerciseId,
			targetSets: plannedExerciseSubstitutes.targetSets,
			targetMinReps: plannedExerciseSubstitutes.targetMinReps,
			targetMaxReps: plannedExerciseSubstitutes.targetMaxReps,
			targetDurationSeconds:
				plannedExerciseSubstitutes.targetDurationSeconds,
			notes: plannedExerciseSubstitutes.notes,
			exerciseName: exercises.name,
			exerciseEquipment: exercises.equipment,
			exerciseTrackingType: exercises.trackingType,
		})
		.from(plannedExerciseSubstitutes)
		.innerJoin(
			exercises,
			eq(exercises.id, plannedExerciseSubstitutes.exerciseId),
		)
		.where(
			inArray(
				plannedExerciseSubstitutes.plannedExerciseId,
				plannedExerciseIds,
			),
		);
}

function parseRepTarget(target: string) {
	const match = target.match(/(\d+)\s*×\s*\d+-(\d+)/);
	if (!match?.[1] || !match[2]) return null;
	return { sets: Number(match[1]), maxReps: Number(match[2]) };
}

function weekKey(date: Date) {
	const start = new Date(date);
	start.setUTCHours(0, 0, 0, 0);
	start.setUTCDate(start.getUTCDate() - start.getUTCDay());
	return start.toISOString().slice(0, 10);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = getKey(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return groups;
}
