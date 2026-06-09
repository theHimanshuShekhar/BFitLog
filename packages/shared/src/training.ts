import { z } from "zod";
import { isoDateTimeSchema, userIdSchema, uuidSchema } from "./sync";
import { kgSchema } from "./body-weight";

const entityIdSchema = z.string().trim().min(1).max(200);
const noteSchema = z.string().trim().max(1000).optional();

export const exerciseTrackingTypeSchema = z.enum(["reps_weight", "duration"]);
export const exerciseMediaKindSchema = z.enum(["gif", "video"]);
export const checklistKindSchema = z.enum(["warmup", "cooldown"]);
export const workoutLogStatusSchema = z.enum([
	"draft",
	"completed",
	"discarded",
]);
export const exerciseLogStatusSchema = z.enum([
	"planned",
	"completed",
	"skipped",
]);

export const exerciseMediaSchema = z.object({
	id: entityIdSchema,
	kind: exerciseMediaKindSchema,
	url: z.string().url(),
	sortOrder: z.number().int().nonnegative().optional(),
});

export const exerciseSchema = z
	.object({
		id: entityIdSchema,
		name: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
		equipment: z.string().trim().max(200).nullable().optional(),
		machine: z.string().trim().max(200).nullable().optional(),
		trackingType: exerciseTrackingTypeSchema,
		recommendedSets: z.number().int().positive().nullable().optional(),
		recommendedMinReps: z.number().int().positive().nullable().optional(),
		recommendedMaxReps: z.number().int().positive().nullable().optional(),
		recommendedDurationSeconds: z.number().int().positive().nullable().optional(),
		demoGifUrl: z.string().url().nullable().optional(),
		demoVideoUrl: z.string().url().nullable().optional(),
		substituteExerciseId: entityIdSchema.nullable().optional(),
		media: z.array(exerciseMediaSchema).default([]),
	})
	.refine(
		(value) =>
			value.trackingType !== "reps_weight" ||
			(Boolean(value.recommendedMinReps) &&
				Boolean(value.recommendedMaxReps) &&
				!value.recommendedDurationSeconds),
		{
			message: "Rep-based exercises require recommended reps, not duration",
			path: ["recommendedMinReps"],
		},
	)
	.refine(
		(value) =>
			value.trackingType !== "duration" ||
			(Boolean(value.recommendedDurationSeconds) &&
				!value.recommendedMinReps &&
				!value.recommendedMaxReps),
		{
			message: "Time-based exercises require recommended duration, not reps",
			path: ["recommendedDurationSeconds"],
		},
	)
	.refine(
		(value) =>
			!value.recommendedMinReps ||
			!value.recommendedMaxReps ||
			value.recommendedMinReps <= value.recommendedMaxReps,
		{
			message: "Minimum reps cannot exceed maximum reps",
			path: ["recommendedMaxReps"],
		},
	);

export const exerciseSubstituteSchema = z.object({
	exercise: exerciseSchema,
	targetSets: z.number().int().positive().nullable().optional(),
	targetMinReps: z.number().int().positive().nullable().optional(),
	targetMaxReps: z.number().int().positive().nullable().optional(),
	targetDurationSeconds: z.number().int().positive().nullable().optional(),
	notes: noteSchema.nullable().optional(),
});

export const plannedExerciseSchema = z
	.object({
		id: entityIdSchema,
		sortOrder: z.number().int().nonnegative(),
		targetSets: z.number().int().positive(),
		targetMinReps: z.number().int().positive().nullable().optional(),
		targetMaxReps: z.number().int().positive().nullable().optional(),
		targetDurationSeconds: z.number().int().positive().nullable().optional(),
		restSeconds: z.number().int().nonnegative(),
		notes: noteSchema.nullable().optional(),
		exercise: exerciseSchema.nullable(),
		substitutes: z.array(exerciseSubstituteSchema).default([]),
	})
	.refine(
		(value) =>
			Boolean(value.targetDurationSeconds) ||
			(Boolean(value.targetMinReps) && Boolean(value.targetMaxReps)),
		{
			message: "Planned exercise requires reps or duration target",
			path: ["targetMinReps"],
		},
	)
	.refine(
		(value) =>
			!value.targetMinReps ||
			!value.targetMaxReps ||
			value.targetMinReps <= value.targetMaxReps,
		{
			message: "Minimum reps cannot exceed maximum reps",
			path: ["targetMaxReps"],
		},
	);

export const checklistItemSchema = z.object({
	id: entityIdSchema,
	kind: checklistKindSchema,
	text: z.string().trim().min(1).max(500),
	sortOrder: z.number().int().nonnegative(),
});

export const trainingDaySchema = z.object({
	id: entityIdSchema,
	sequence: z.number().int().positive(),
	name: z.string().trim().min(1).max(200).optional(),
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(2000).nullable().optional(),
	notes: noteSchema.nullable().optional(),
	checklist: z.array(checklistItemSchema).default([]),
	exercises: z.array(plannedExerciseSchema).default([]),
});

export const trainingPlanTemplateSchema = z.object({
	id: entityIdSchema,
	name: z.string().trim().min(1).max(200),
	goal: z.string().trim().max(1000).nullable().optional(),
	description: z.string().trim().max(2000).nullable().optional(),
	notes: noteSchema.nullable().optional(),
	days: z.array(trainingDaySchema).default([]),
});

export const setLogSchema = z.object({
	id: uuidSchema,
	exerciseLogId: uuidSchema,
	setIndex: z.number().int().positive(),
	weightKg: kgSchema.nullable().optional(),
	reps: z.number().int().positive().nullable().optional(),
	durationSeconds: z.number().int().positive().nullable().optional(),
});

export const workoutChecklistLogSchema = z.object({
	checklistItemId: entityIdSchema,
	kind: checklistKindSchema,
	text: z.string().trim().min(1).max(500),
	checked: z.boolean(),
	sortOrder: z.number().int().nonnegative(),
});

export const exerciseLogSchema = z
	.object({
		id: uuidSchema,
		workoutLogId: uuidSchema,
		plannedExerciseId: entityIdSchema.nullable().optional(),
		plannedExerciseName: z.string().trim().min(1).max(200),
		plannedExerciseTarget: z.string().trim().min(1).max(100),
		originalExerciseId: entityIdSchema.nullable().optional(),
		performedExerciseId: entityIdSchema.nullable().optional(),
		status: exerciseLogStatusSchema,
		goodForm: z.boolean().nullable().optional(),
		note: noteSchema.nullable().optional(),
		skipReason: noteSchema.nullable().optional(),
		substitutionNote: noteSchema.nullable().optional(),
		sortOrder: z.number().int().nonnegative(),
		sets: z.array(setLogSchema).default([]),
	})
	.refine((value) => value.status !== "skipped" || Boolean(value.skipReason), {
		message: "Skipped exercises require a reason",
		path: ["skipReason"],
	});

export const workoutLogSchema = z
	.object({
		id: uuidSchema,
		userId: userIdSchema,
		userTrainingPlanId: entityIdSchema.nullable().optional(),
		trainingDayId: entityIdSchema,
		status: workoutLogStatusSchema,
		startedAt: isoDateTimeSchema,
		completedAt: isoDateTimeSchema.nullable().optional(),
		note: noteSchema.nullable().optional(),
		exercises: z.array(exerciseLogSchema).default([]),
		checklist: z.array(workoutChecklistLogSchema).default([]),
	})
	.refine(
		(value) => value.status !== "completed" || Boolean(value.completedAt),
		{
			message: "Completed workouts require completedAt",
			path: ["completedAt"],
		},
	);

export const progressionHintSchema = z.object({
	exerciseId: entityIdSchema,
	exerciseName: z.string().trim().min(1).max(200),
	reason: z.string().trim().min(1).max(1000),
	currentWeightKg: kgSchema.nullable().optional(),
	suggestedWeightKg: kgSchema.nullable().optional(),
	ready: z.boolean(),
});

export type ExerciseTrackingType = z.infer<typeof exerciseTrackingTypeSchema>;
export type ExerciseMediaKind = z.infer<typeof exerciseMediaKindSchema>;
export type ChecklistKind = z.infer<typeof checklistKindSchema>;
export type WorkoutLogStatus = z.infer<typeof workoutLogStatusSchema>;
export type ExerciseLogStatus = z.infer<typeof exerciseLogStatusSchema>;
export type ExerciseMedia = z.infer<typeof exerciseMediaSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSubstitute = z.infer<typeof exerciseSubstituteSchema>;
export type PlannedExercise = z.infer<typeof plannedExerciseSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type TrainingDay = z.infer<typeof trainingDaySchema>;
export type TrainingPlanTemplate = z.infer<typeof trainingPlanTemplateSchema>;
export type SetLog = z.infer<typeof setLogSchema>;
export type WorkoutChecklistLog = z.infer<typeof workoutChecklistLogSchema>;
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;
export type WorkoutLog = z.infer<typeof workoutLogSchema>;
export type ProgressionHint = z.infer<typeof progressionHintSchema>;
