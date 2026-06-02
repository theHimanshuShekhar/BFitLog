import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { auth } from "../auth/auth.js";
import { createDb } from "../db/client.js";
import {
	exerciseMedia,
	exercises,
	plannedExercises,
	trainingDayChecklistItems,
	trainingDays,
	trainingPlanTemplates,
} from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);
const defaultTemplateId = "beginner-upper-lower-4-day";

type Variables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export const trainingPlanRoutes = new Hono<{ Variables: Variables }>().get(
	"/training-plan/template",
	async (c) => {
		if (!c.get("user")) return c.json({ error: "Unauthorized" }, 401);

		const [template] = await db
			.select()
			.from(trainingPlanTemplates)
			.where(eq(trainingPlanTemplates.id, defaultTemplateId));

		if (!template)
			return c.json({ error: "Training plan template not seeded" }, 404);

		const days = await db
			.select()
			.from(trainingDays)
			.where(eq(trainingDays.templateId, template.id))
			.orderBy(asc(trainingDays.sequence));
		const dayIds = days.map((day) => day.id);

		const [checklists, planned] = await Promise.all([
			dayIds.length
				? db
						.select()
						.from(trainingDayChecklistItems)
						.where(inArray(trainingDayChecklistItems.trainingDayId, dayIds))
						.orderBy(asc(trainingDayChecklistItems.sortOrder))
				: [],
			dayIds.length
				? db
						.select()
						.from(plannedExercises)
						.where(inArray(plannedExercises.trainingDayId, dayIds))
						.orderBy(asc(plannedExercises.sortOrder))
				: [],
		]);

		const exerciseIds = [...new Set(planned.map((item) => item.exerciseId))];
		const [exerciseRows, mediaRows] = await Promise.all([
			exerciseIds.length
				? db.select().from(exercises).where(inArray(exercises.id, exerciseIds))
				: [],
			exerciseIds.length
				? db
						.select()
						.from(exerciseMedia)
						.where(inArray(exerciseMedia.exerciseId, exerciseIds))
						.orderBy(asc(exerciseMedia.sortOrder))
				: [],
		]);

		const exercisesById = new Map(
			exerciseRows.map((exercise) => [exercise.id, exercise]),
		);
		const mediaByExercise = groupBy(mediaRows, (media) => media.exerciseId);
		const checklistByDay = groupBy(checklists, (item) => item.trainingDayId);
		const plannedByDay = groupBy(planned, (item) => item.trainingDayId);

		return c.json({
			template: {
				id: template.id,
				name: template.name,
				goal: template.goal,
				notes: template.notes,
				days: days.map((day) => ({
					id: day.id,
					sequence: day.sequence,
					title: day.title,
					checklist: (checklistByDay.get(day.id) ?? []).map((item) => ({
						id: item.id,
						kind: item.kind,
						text: item.text,
						sortOrder: item.sortOrder,
					})),
					exercises: (plannedByDay.get(day.id) ?? []).map((item) => {
						const exercise = exercisesById.get(item.exerciseId);
						return {
							id: item.id,
							sortOrder: item.sortOrder,
							targetSets: item.targetSets,
							targetMinReps: item.targetMinReps,
							targetMaxReps: item.targetMaxReps,
							targetDurationSeconds: item.targetDurationSeconds,
							restSeconds: item.restSeconds,
							notes: item.notes,
							exercise: exercise
								? {
										id: exercise.id,
										name: exercise.name,
										equipment: exercise.equipment,
										trackingType: exercise.trackingType,
										media: (mediaByExercise.get(exercise.id) ?? []).map(
											(media) => ({
												id: media.id,
												kind: media.kind,
												url: media.url,
											}),
										),
									}
								: null,
						};
					}),
				})),
			},
		});
	},
);

function groupBy<T>(items: T[], getKey: (item: T) => string) {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = getKey(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return groups;
}
