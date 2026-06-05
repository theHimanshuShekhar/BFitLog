import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";

export type WorkoutExercise = {
	id: string;
	plannedExerciseName: string;
	plannedExerciseTarget: string;
	restSeconds?: number | null;
	status: "planned" | "completed" | "skipped";
	goodForm: boolean | null;
	note: string | null;
	skipReason: string | null;
	substitutionNote?: string | null;
	originalExerciseId?: string | null;
	performedExerciseId?: string | null;
	sets: Array<{
		id: string;
		setIndex: number;
		weightKg: number | null;
		reps: number | null;
		durationSeconds: number | null;
	}>;
	substitutes: Array<{
		exercise: {
			id: string;
			name: string;
			equipment: string | null;
			trackingType: "reps_weight" | "duration";
		} | null;
		targetSets: number | null;
		targetMinReps: number | null;
		targetMaxReps: number | null;
		targetDurationSeconds: number | null;
		notes: string | null;
	}>;
};

export type WorkoutHistoryItem = {
	id: string;
	status: "completed";
	startedAt: string;
	completedAt: string | null;
	note: string | null;
	trainingDay: { sequence: number; title: string };
};

export type DraftWorkout = {
	id: string;
	userId: string;
	trainingDayId: string;
	status: "draft" | "completed" | "discarded";
	startedAt: string;
	completedAt: string | null;
	note: string | null;
	exercises: WorkoutExercise[];
	checklist: Array<{
		checklistItemId: string;
		kind: "warmup" | "cooldown";
		text: string;
		checked: boolean;
		sortOrder: number;
	}>;
};

export type WorkoutStats = {
	exercises: Array<{
		exerciseId: string;
		exerciseName: string;
		bestWeightKg: number | null;
		volumeKg: number;
		bestDurationSeconds: number | null;
		successfulTopRangeSessions: number;
		progressionHint: string | null;
	}>;
	consistency: Array<{ week: string; count: number }>;
};

export type TrainingDaySummary = {
	id: string;
	sequence: number;
	title: string;
};

export type ActivePlan = {
	id: string;
	template: {
		days: TrainingDaySummary[];
	};
};

function authHeaders(json = false) {
	const headers = new Headers();
	const cookie = authClient.getCookie();
	if (cookie) headers.set("Cookie", cookie);
	if (json) headers.set("Content-Type", "application/json");
	return {
		headers,
		credentials: cookie ? "omit" : ("include" as RequestCredentials),
	};
}

async function parseJson<T>(response: Response, label: string): Promise<T> {
	if (!response.ok) throw new Error(`${label} failed with ${response.status}`);
	return (await response.json()) as T;
}

export async function getActivePlan(): Promise<ActivePlan | null> {
	let response = await fetch(
		`${apiBaseUrl}/training-plan/active`,
		authHeaders(),
	);
	let body = await parseJson<{ plan: ActivePlan | null }>(
		response,
		"Load active plan",
	);
	if (body.plan) return body.plan;

	response = await fetch(`${apiBaseUrl}/training-plan/active/default`, {
		method: "POST",
		...authHeaders(),
	});
	body = await parseJson<{ plan: ActivePlan }>(response, "Create active plan");
	return body.plan;
}

export async function getWorkoutStats(): Promise<WorkoutStats> {
	const response = await fetch(`${apiBaseUrl}/stats/workouts`, authHeaders());
	return parseJson<WorkoutStats>(response, "Load workout stats");
}

export async function listCompletedWorkouts(): Promise<WorkoutHistoryItem[]> {
	const response = await fetch(`${apiBaseUrl}/workouts`, authHeaders());
	const body = await parseJson<{ workouts: WorkoutHistoryItem[] }>(
		response,
		"Load workout history",
	);
	return body.workouts;
}

export async function getNextTrainingDay(): Promise<TrainingDaySummary | null> {
	const response = await fetch(
		`${apiBaseUrl}/training-plan/next-day`,
		authHeaders(),
	);
	const body = await parseJson<{ day: TrainingDaySummary | null }>(
		response,
		"Load next training day",
	);
	return body.day;
}

export async function getWorkout(workoutId: string): Promise<DraftWorkout> {
	const response = await fetch(
		`${apiBaseUrl}/workouts/${workoutId}`,
		authHeaders(),
	);
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Load workout",
	);
	return body.workout;
}

export async function getDraftWorkout(): Promise<DraftWorkout | null> {
	const response = await fetch(`${apiBaseUrl}/workouts/draft`, authHeaders());
	const body = await parseJson<{ workout: DraftWorkout | null }>(
		response,
		"Load draft workout",
	);
	return body.workout;
}

export async function startDraftWorkout(
	trainingDayId: string,
): Promise<DraftWorkout> {
	const response = await fetch(`${apiBaseUrl}/workouts/draft`, {
		method: "POST",
		...authHeaders(true),
		body: JSON.stringify({
			trainingDayId,
			startedAt: new Date().toISOString(),
		}),
	});
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Start workout",
	);
	return body.workout;
}

export async function saveExerciseSet(
	workoutId: string,
	exercise: WorkoutExercise,
	sets: Array<{ setIndex: number; weightKg?: number; reps?: number; durationSeconds?: number }>,
	options: {
		note?: string;
		performedExerciseId?: string;
		substitutionNote?: string;
	} = {},
): Promise<WorkoutExercise> {
	const response = await fetch(
		`${apiBaseUrl}/workouts/${workoutId}/exercises/${exercise.id}`,
		{
			method: "PUT",
			...authHeaders(true),
			body: JSON.stringify({
				status: "completed",
				goodForm: true,
				note: options.note?.trim() || undefined,
				performedExerciseId: options.performedExerciseId?.trim() || undefined,
				substitutionNote: options.substitutionNote?.trim() || undefined,
				sets,
			}),
		},
	);
	const body = await parseJson<{ exercise: WorkoutExercise }>(
		response,
		"Save exercise",
	);
	return body.exercise;
}

export async function skipExercise(
	workoutId: string,
	exercise: WorkoutExercise,
	reason: string,
): Promise<WorkoutExercise> {
	const response = await fetch(
		`${apiBaseUrl}/workouts/${workoutId}/exercises/${exercise.id}`,
		{
			method: "PUT",
			...authHeaders(true),
			body: JSON.stringify({ status: "skipped", skipReason: reason }),
		},
	);
	const body = await parseJson<{ exercise: WorkoutExercise }>(
		response,
		"Skip exercise",
	);
	return body.exercise;
}

export async function updateWorkoutChecklist(
	workoutId: string,
	checklistItemId: string,
	checked: boolean,
): Promise<DraftWorkout> {
	const response = await fetch(
		`${apiBaseUrl}/workouts/${workoutId}/checklist/${checklistItemId}`,
		{
			method: "PUT",
			...authHeaders(true),
			body: JSON.stringify({ checked }),
		},
	);
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Update checklist",
	);
	return body.workout;
}

export async function updateWorkoutNote(
	workoutId: string,
	note: string,
): Promise<DraftWorkout> {
	const response = await fetch(`${apiBaseUrl}/workouts/${workoutId}`, {
		method: "PATCH",
		...authHeaders(true),
		body: JSON.stringify({ note }),
	});
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Update workout",
	);
	return body.workout;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
	const response = await fetch(`${apiBaseUrl}/workouts/${workoutId}`, {
		method: "DELETE",
		...authHeaders(),
	});
	await parseJson<{ ok: true }>(response, "Delete workout");
}

export async function completeWorkout(
	workoutId: string,
	note?: string,
): Promise<DraftWorkout> {
	const response = await fetch(`${apiBaseUrl}/workouts/${workoutId}/complete`, {
		method: "POST",
		...authHeaders(true),
		body: JSON.stringify({
			completedAt: new Date().toISOString(),
			note: note?.trim() || undefined,
		}),
	});
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Complete workout",
	);
	return body.workout;
}

export async function discardWorkout(workoutId: string): Promise<DraftWorkout> {
	const response = await fetch(`${apiBaseUrl}/workouts/${workoutId}/discard`, {
		method: "POST",
		...authHeaders(),
	});
	const body = await parseJson<{ workout: DraftWorkout }>(
		response,
		"Discard workout",
	);
	return body.workout;
}
