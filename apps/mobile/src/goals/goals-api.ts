import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";

export type WorkoutFrequencyGoal = {
	userId: string;
	targetWorkoutsPerWeek: number;
	updatedAt: string;
};

export type ReminderSettings = {
	userId: string;
	workoutReminderEnabled: boolean;
	workoutReminderTime: string | null;
	weighInReminderEnabled: boolean;
	weighInReminderTime: string | null;
	updatedAt: string;
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

export async function getWorkoutFrequencyGoal() {
	const response = await fetch(`${apiBaseUrl}/goals/workout-frequency`, authHeaders());
	const body = await parseJson<{ goal: WorkoutFrequencyGoal | null }>(
		response,
		"Load workout frequency goal",
	);
	return body.goal;
}

export async function saveWorkoutFrequencyGoal(targetWorkoutsPerWeek: number) {
	const response = await fetch(`${apiBaseUrl}/goals/workout-frequency`, {
		method: "PUT",
		...authHeaders(true),
		body: JSON.stringify({
			targetWorkoutsPerWeek,
			updatedAt: new Date().toISOString(),
		}),
	});
	const body = await parseJson<{ goal: WorkoutFrequencyGoal }>(
		response,
		"Save workout frequency goal",
	);
	return body.goal;
}

export async function getReminderSettings() {
	const response = await fetch(`${apiBaseUrl}/reminders/settings`, authHeaders());
	const body = await parseJson<{ settings: ReminderSettings | null }>(
		response,
		"Load reminder settings",
	);
	return body.settings;
}

export async function saveReminderSettings(input: {
	workoutReminderEnabled: boolean;
	workoutReminderTime: string;
	weighInReminderEnabled: boolean;
	weighInReminderTime: string;
}) {
	const response = await fetch(`${apiBaseUrl}/reminders/settings`, {
		method: "PUT",
		...authHeaders(true),
		body: JSON.stringify({ ...input, updatedAt: new Date().toISOString() }),
	});
	const body = await parseJson<{ settings: ReminderSettings }>(
		response,
		"Save reminder settings",
	);
	return body.settings;
}
