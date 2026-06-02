import { describe, expect, it } from "vitest";
import {
	exerciseSchema,
	plannedExerciseSchema,
	trainingPlanTemplateSchema,
	workoutLogSchema,
} from "./training";

const now = "2026-06-01T12:00:00.000Z";
const workoutId = "00000000-0000-4000-8000-000000000101";
const exerciseLogId = "00000000-0000-4000-8000-000000000102";
const setLogId = "00000000-0000-4000-8000-000000000103";

describe("training schemas", () => {
	it("accepts exercises with media", () => {
		expect(
			exerciseSchema.parse({
				id: "goblet-squat",
				name: "Goblet Squat",
				description: "Squat holding a dumbbell or kettlebell.",
				equipment: "Dumbbell",
				trackingType: "reps_weight",
				media: [
					{
						id: "goblet-squat-video",
						kind: "video",
						url: "https://example.com/video",
					},
				],
			}),
		).toMatchObject({ id: "goblet-squat", media: [{ kind: "video" }] });
	});

	it("rejects planned exercises without any target", () => {
		expect(() =>
			plannedExerciseSchema.parse({
				id: "planned-1",
				sortOrder: 1,
				targetSets: 3,
				restSeconds: 90,
				exercise: null,
			}),
		).toThrow();
	});

	it("accepts a complete training plan template", () => {
		const template = trainingPlanTemplateSchema.parse({
			id: "beginner-upper-lower-4-day",
			name: "4-Day Beginner Upper/Lower Split",
			goal: "Build strength",
			notes: "Rotate days sequentially.",
			days: [
				{
					id: "day-1",
					sequence: 1,
					title: "Upper A",
					checklist: [
						{
							id: "warmup-1",
							kind: "warmup",
							text: "5 min easy cardio",
							sortOrder: 1,
						},
					],
					exercises: [
						{
							id: "planned-1",
							sortOrder: 1,
							targetSets: 3,
							targetMinReps: 8,
							targetMaxReps: 12,
							restSeconds: 90,
							exercise: {
								id: "goblet-squat",
								name: "Goblet Squat",
								equipment: "Dumbbell",
								trackingType: "reps_weight",
								media: [],
							},
							substitutes: [],
						},
					],
				},
			],
		});
		expect(template.days[0]?.exercises[0]?.targetMaxReps).toBe(12);
	});

	it("accepts workout logs with exercise and set logs", () => {
		expect(
			workoutLogSchema.parse({
				id: workoutId,
				userId: "user-1",
				trainingDayId: "day-1",
				status: "completed",
				startedAt: now,
				completedAt: now,
				note: "Solid session",
				exercises: [
					{
						id: exerciseLogId,
						workoutLogId: workoutId,
						plannedExerciseId: "planned-1",
						plannedExerciseName: "Goblet Squat",
						plannedExerciseTarget: "3 × 8-12",
						status: "completed",
						goodForm: true,
						sortOrder: 1,
						sets: [
							{
								id: setLogId,
								exerciseLogId,
								setIndex: 1,
								weightKg: 24,
								reps: 12,
							},
						],
					},
				],
				checklist: [],
			}),
		).toMatchObject({
			status: "completed",
			exercises: [{ sets: [{ reps: 12 }] }],
		});
	});
});
