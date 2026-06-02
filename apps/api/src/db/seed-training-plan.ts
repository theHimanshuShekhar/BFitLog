import { createDb } from "./client.js";
import {
	exerciseMedia,
	exercises,
	plannedExercises,
	plannedExerciseSubstitutes,
	trainingDayChecklistItems,
	trainingDays,
	trainingPlanTemplates,
} from "./schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

const templateId = "beginner-upper-lower-4-day";
const now = new Date();

const exerciseRows = [
	[
		"smith-machine-bench-press",
		"Smith Machine Bench Press",
		"Smith Machine",
		"reps_weight",
	],
	[
		"seated-cable-row",
		"Seated Cable Row",
		"Adjustable Cable Machine",
		"reps_weight",
	],
	[
		"dumbbell-shoulder-press",
		"Dumbbell Shoulder Press",
		"Free Weights",
		"reps_weight",
	],
	["lat-pulldown", "Lat Pulldown", "Adjustable Cable Machine", "reps_weight"],
	[
		"chest-press-machine",
		"Chest Press Machine",
		"Chest Press Machine",
		"reps_weight",
	],
	[
		"smith-machine-squat",
		"Smith Machine Squat",
		"Smith Machine",
		"reps_weight",
	],
	["leg-extension", "Leg Extension", "Leg Extension Machine", "reps_weight"],
	["leg-curl", "Leg Curl", "Leg Curl Machine", "reps_weight"],
	["calf-raises", "Calf Raises", "Free Weights", "reps_weight"],
	["plank", "Plank", "Bodyweight", "duration"],
	[
		"incline-smith-machine-press",
		"Incline Smith Machine Press",
		"Smith Machine",
		"reps_weight",
	],
	[
		"cable-face-pull",
		"Cable Face Pull",
		"Adjustable Cable Machine",
		"reps_weight",
	],
	["dumbbell-row", "Dumbbell Row", "Free Weights", "reps_weight"],
	["cable-curl", "Cable Curl", "Adjustable Cable Machine", "reps_weight"],
	[
		"triceps-pushdown",
		"Triceps Pushdown",
		"Adjustable Cable Machine",
		"reps_weight",
	],
	[
		"smith-machine-deadlift",
		"Smith Machine Deadlift",
		"Smith Machine",
		"reps_weight",
	],
	[
		"bulgarian-split-squat",
		"Bulgarian Split Squat",
		"Free Weights",
		"reps_weight",
	],
	[
		"smith-machine-front-squat",
		"Smith Machine Front Squat",
		"Smith Machine",
		"reps_weight",
	],
	["seated-leg-curl", "Seated Leg Curl", "Leg Curl Machine", "reps_weight"],
	[
		"kneeling-cable-crunch",
		"Kneeling Cable Crunch",
		"Adjustable Cable Machine",
		"reps_weight",
	],
] as const;

const mediaRows = [
	[
		"smith-machine-bench-press",
		"gif",
		"https://makeagif.com/gif/smith-machine-regular-bench-press-OpkHjQ",
	],
	[
		"smith-machine-bench-press",
		"video",
		"https://www.youtube.com/shorts/XFYMLdlaq04",
	],
	[
		"seated-cable-row",
		"gif",
		"https://makeagif.com/gif/seated-cable-row-5UBTxV",
	],
	["seated-cable-row", "video", "https://www.youtube.com/shorts/8QuMq1GMMng"],
	[
		"dumbbell-shoulder-press",
		"gif",
		"https://makeagif.com/gif/dumbbell-shoulder-press-exercise-guide-3lRNNd",
	],
	[
		"dumbbell-shoulder-press",
		"video",
		"https://www.youtube.com/shorts/k6tzKisR3NY",
	],
	[
		"lat-pulldown",
		"gif",
		"https://makeagif.com/gif/exercise-videos-wide-grip-lat-pulldowns-Axi0ao",
	],
	["lat-pulldown", "video", "https://www.youtube.com/shorts/hnSqbBk15tw"],
	[
		"chest-press-machine",
		"gif",
		"https://makeagif.com/gif/chest-press-machine-5gW5Ar",
	],
	[
		"chest-press-machine",
		"video",
		"https://www.youtube.com/shorts/E8iUR2lhgR8",
	],
	[
		"smith-machine-squat",
		"gif",
		"https://makeagif.com/gif/squat-smith-machine-T9MTe8",
	],
	[
		"smith-machine-squat",
		"video",
		"https://www.youtube.com/shorts/jPrzu4kp47o",
	],
	["leg-extension", "gif", "https://makeagif.com/gif/leg-extension-o1DpT2"],
	["leg-extension", "video", "https://www.youtube.com/shorts/iQ92TuvBqRo"],
	[
		"leg-curl",
		"gif",
		"https://makeagif.com/gif/how-to-seated-leg-curl-life-fitness-machine-v9gqd1",
	],
	["leg-curl", "video", "https://www.youtube.com/shorts/d6sg829PgNs"],
	[
		"calf-raises",
		"gif",
		"https://makeagif.com/gif/dumbbell-seated-one-leg-calf-raise-GlK5fU",
	],
	["calf-raises", "video", "https://www.youtube.com/shorts/yQZDGjL-xT4"],
	[
		"plank",
		"gif",
		"https://makeagif.com/gif/dont-make-this-mistake-when-planking-B4ha6k",
	],
	["plank", "video", "https://www.youtube.com/shorts/htqqk_uojIs"],
	[
		"incline-smith-machine-press",
		"gif",
		"https://makeagif.com/gif/incline-bench-press-setup-on-smith-machine-qTrgcx",
	],
	[
		"incline-smith-machine-press",
		"video",
		"https://www.youtube.com/shorts/VXaBbUYMfIs",
	],
	[
		"cable-face-pull",
		"gif",
		"https://makeagif.com/gif/how-to-do-cable-face-pulls-i4nFKk",
	],
	["cable-face-pull", "video", "https://www.youtube.com/shorts/qEyoBOpvqR4"],
	[
		"dumbbell-row",
		"gif",
		"https://makeagif.com/gif/single-arm-dumbbell-row-afIFO6",
	],
	["dumbbell-row", "video", "https://www.youtube.com/shorts/KNaPpyFyyUA"],
	["cable-curl", "gif", "https://makeagif.com/gif/cable-curl-b0dVOM"],
	["cable-curl", "video", "https://www.youtube.com/shorts/CrbTqNOlFgE"],
	[
		"triceps-pushdown",
		"gif",
		"https://makeagif.com/gif/tricep-pushdown-low-res-lXUvI7",
	],
	["triceps-pushdown", "video", "https://www.youtube.com/shorts/1FjkhpZsaxc"],
	[
		"smith-machine-deadlift",
		"gif",
		"https://makeagif.com/gif/smith-machine-deadlift-SdA6Ih",
	],
	[
		"smith-machine-deadlift",
		"video",
		"https://www.youtube.com/shorts/Wl4tdsx2Sy8",
	],
	[
		"bulgarian-split-squat",
		"gif",
		"https://makeagif.com/gif/how-to-bulgarian-split-squat-SQ4XWJ",
	],
	[
		"bulgarian-split-squat",
		"video",
		"https://www.youtube.com/shorts/lG3MsPmEQQk",
	],
	[
		"smith-machine-front-squat",
		"gif",
		"https://makeagif.com/gif/smith-machine-front-squat-50-set-u6lqAR",
	],
	[
		"smith-machine-front-squat",
		"video",
		"https://www.youtube.com/shorts/ABoVPaOFaGo",
	],
	[
		"seated-leg-curl",
		"gif",
		"https://makeagif.com/gif/how-to-seated-leg-curl-life-fitness-machine-v9gqd1",
	],
	["seated-leg-curl", "video", "https://www.youtube.com/shorts/d6sg829PgNs"],
	[
		"kneeling-cable-crunch",
		"gif",
		"https://makeagif.com/gif/awesome-ab-exercise-pull-down-cable-crunch-r7gTjv",
	],
	[
		"kneeling-cable-crunch",
		"video",
		"https://www.youtube.com/shorts/BUYxE7yvpUM",
	],
] as const;

const dayRows = [
	["day-1-upper-a", 1, "Upper Body A"],
	["day-2-lower-a", 2, "Lower Body A"],
	["day-3-upper-b", 3, "Upper Body B"],
	["day-4-lower-b", 4, "Lower Body B"],
] as const;

const warmups = [
	"5 minutes light cardio: walking, cycling, or elliptical at a comfortable pace.",
	"Dynamic stretches for the day: controlled arm/leg/hip/torso movements.",
];

const planned = [
	[
		"day-1-upper-a",
		"smith-machine-bench-press",
		1,
		3,
		8,
		10,
		null,
		"Keep back slightly arched, feet flat.",
	],
	[
		"day-1-upper-a",
		"seated-cable-row",
		2,
		3,
		10,
		12,
		null,
		"Squeeze shoulder blades together.",
	],
	[
		"day-1-upper-a",
		"dumbbell-shoulder-press",
		3,
		3,
		8,
		10,
		null,
		"Keep back straight, core engaged.",
	],
	[
		"day-1-upper-a",
		"lat-pulldown",
		4,
		3,
		10,
		12,
		null,
		"Pull bar to upper chest.",
	],
	[
		"day-1-upper-a",
		"chest-press-machine",
		5,
		3,
		10,
		12,
		null,
		"Adjust seat to align handles with chest.",
	],
	[
		"day-2-lower-a",
		"smith-machine-squat",
		1,
		3,
		8,
		10,
		null,
		"Keep knees in line with toes.",
	],
	[
		"day-2-lower-a",
		"leg-extension",
		2,
		3,
		10,
		12,
		null,
		"Control the weight; don't lock knees.",
	],
	[
		"day-2-lower-a",
		"leg-curl",
		3,
		3,
		10,
		12,
		null,
		"Keep hips down, slow negative.",
	],
	[
		"day-2-lower-a",
		"calf-raises",
		4,
		3,
		12,
		15,
		null,
		"Hold dumbbells for added weight.",
	],
	[
		"day-2-lower-a",
		"plank",
		5,
		3,
		null,
		null,
		60,
		"Keep body straight, core tight.",
	],
	[
		"day-3-upper-b",
		"incline-smith-machine-press",
		1,
		3,
		8,
		10,
		null,
		"Set bench to 30-45 degree incline.",
	],
	[
		"day-3-upper-b",
		"cable-face-pull",
		2,
		3,
		12,
		15,
		null,
		"Pull rope to forehead, elbows high.",
	],
	[
		"day-3-upper-b",
		"dumbbell-row",
		3,
		3,
		8,
		10,
		null,
		"Each arm; keep back flat, pull to hip.",
	],
	[
		"day-3-upper-b",
		"cable-curl",
		4,
		3,
		10,
		12,
		null,
		"Keep elbows pinned to sides.",
	],
	[
		"day-3-upper-b",
		"triceps-pushdown",
		5,
		3,
		10,
		12,
		null,
		"Keep elbows stationary.",
	],
	[
		"day-4-lower-b",
		"smith-machine-deadlift",
		1,
		3,
		6,
		8,
		null,
		"Keep back straight, hinge at hips.",
	],
	[
		"day-4-lower-b",
		"bulgarian-split-squat",
		2,
		3,
		8,
		10,
		null,
		"Each leg; hold dumbbells, rear foot elevated.",
	],
	[
		"day-4-lower-b",
		"smith-machine-front-squat",
		3,
		3,
		10,
		12,
		null,
		"Keep knees in line with toes, upright torso.",
	],
	[
		"day-4-lower-b",
		"seated-leg-curl",
		4,
		3,
		10,
		12,
		null,
		"Keep torso upright.",
	],
	[
		"day-4-lower-b",
		"kneeling-cable-crunch",
		5,
		3,
		12,
		15,
		null,
		"Crunch torso forward, squeeze abs.",
	],
] as const;

const substitutes = [
	[
		"day-1-upper-a-smith-machine-bench-press",
		"chest-press-machine",
		"Machine chest press if the Smith machine is unavailable.",
	],
	[
		"day-1-upper-a-seated-cable-row",
		"dumbbell-row",
		"Dumbbell row if cables are unavailable.",
	],
	[
		"day-1-upper-a-lat-pulldown",
		"seated-cable-row",
		"Cable row if the pulldown station is unavailable.",
	],
	[
		"day-2-lower-a-leg-curl",
		"seated-leg-curl",
		"Use the seated curl variation if available.",
	],
	[
		"day-3-upper-b-incline-smith-machine-press",
		"chest-press-machine",
		"Use chest press machine if incline Smith setup is unavailable.",
	],
	[
		"day-3-upper-b-dumbbell-row",
		"seated-cable-row",
		"Cable row if dumbbells are unavailable.",
	],
	[
		"day-4-lower-b-smith-machine-front-squat",
		"smith-machine-squat",
		"Back squat variation if front squat setup is uncomfortable.",
	],
	[
		"day-4-lower-b-seated-leg-curl",
		"leg-curl",
		"Use available leg curl machine variation.",
	],
] as const;

export async function seedTrainingPlan() {
	await db
		.insert(trainingPlanTemplates)
		.values({
			id: templateId,
			name: "4-Day Beginner Upper/Lower Split",
			goal: "Weight loss and muscle building",
			notes:
				"Use a rotating Day 1–4 sequence. Rest 60–90 seconds between sets. Increase weight after hitting top reps with good form for two sessions.",
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing();

	for (const [id, name, equipment, trackingType] of exerciseRows) {
		await db
			.insert(exercises)
			.values({
				id,
				name,
				equipment,
				trackingType,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();
	}

	for (const [exerciseId, kind, url] of mediaRows) {
		await db
			.insert(exerciseMedia)
			.values({
				id: `${exerciseId}-${kind}`,
				exerciseId,
				kind,
				url,
				sortOrder: kind === "gif" ? 0 : 1,
			})
			.onConflictDoNothing();
	}

	for (const [id, sequence, title] of dayRows) {
		await db
			.insert(trainingDays)
			.values({ id, templateId, sequence, title })
			.onConflictDoNothing();
		for (const [index, text] of warmups.entries()) {
			await db
				.insert(trainingDayChecklistItems)
				.values({
					id: `${id}-warmup-${index + 1}`,
					trainingDayId: id,
					kind: "warmup",
					text,
					sortOrder: index + 1,
				})
				.onConflictDoNothing();
		}
		await db
			.insert(trainingDayChecklistItems)
			.values({
				id: `${id}-cooldown-1`,
				trainingDayId: id,
				kind: "cooldown",
				text: "Cool down with easy walking and gentle stretches for worked muscle groups.",
				sortOrder: 1,
			})
			.onConflictDoNothing();
	}

	for (const [
		dayId,
		exerciseId,
		sortOrder,
		targetSets,
		minReps,
		maxReps,
		durationSeconds,
		notes,
	] of planned) {
		await db
			.insert(plannedExercises)
			.values({
				id: `${dayId}-${exerciseId}`,
				trainingDayId: dayId,
				exerciseId,
				sortOrder,
				targetSets,
				targetMinReps: minReps,
				targetMaxReps: maxReps,
				targetDurationSeconds: durationSeconds,
				restSeconds: 90,
				notes,
			})
			.onConflictDoNothing();
	}

	for (const [plannedExerciseId, exerciseId, notes] of substitutes) {
		await db
			.insert(plannedExerciseSubstitutes)
			.values({ plannedExerciseId, exerciseId, notes })
			.onConflictDoNothing();
	}

	console.log(`Seeded training plan template: ${templateId}`);
}

if (process.env.NODE_ENV !== "test") {
	await seedTrainingPlan();
}
