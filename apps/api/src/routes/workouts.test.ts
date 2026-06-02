import { createApp } from "../app.js";
import { seedTrainingPlan } from "../db/seed-training-plan.js";
import { truncateAppTables } from "../test-utils/db.js";
import { beforeEach, describe, expect, it } from "vitest";

const setupBody = {
	admin: {
		username: "admin",
		password: "password1234",
		displayName: "Admin User",
	},
	partner: {
		username: "partner",
		password: "password1234",
		displayName: "Partner User",
	},
};

async function createSessionWithActivePlan() {
	await seedTrainingPlan();
	const app = createApp();
	await app.request("/setup", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(setupBody),
	});
	const login = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "admin", password: "password1234" }),
	});
	const loginBody = await login.clone().json();
	const cookie = login.headers.get("set-cookie") ?? "";
	const activePlanResponse = await app.request(
		"/training-plan/active/default",
		{
			method: "POST",
			headers: { cookie },
		},
	);
	const activePlanBody = await activePlanResponse.json();
	return {
		app,
		cookie,
		userId: loginBody.user.id as string,
		plan: activePlanBody.plan,
	};
}

describe("workout routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("requires authentication", async () => {
		const app = createApp();
		const response = await app.request("/workouts/draft");
		expect(response.status).toBe(401);
	});

	it("starts and resumes a draft workout from the active plan day", async () => {
		const { app, cookie, userId, plan } = await createSessionWithActivePlan();
		const trainingDayId = plan.template.days[0].id as string;
		const startedAt = "2026-06-02T10:00:00.000Z";

		const start = await app.request("/workouts/draft", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ trainingDayId, startedAt }),
		});

		expect(start.status).toBe(201);
		const started = await start.json();
		expect(started.workout).toMatchObject({
			userId,
			trainingDayId,
			status: "draft",
			startedAt,
		});
		expect(started.workout.exercises).toHaveLength(5);
		expect(started.workout.exercises[0]).toMatchObject({
			status: "planned",
			plannedExerciseName: "Smith Machine Bench Press",
			plannedExerciseTarget: "3 × 8-10",
			sets: [],
		});
		expect(started.workout.checklist).toHaveLength(3);

		const draft = await app.request("/workouts/draft", { headers: { cookie } });
		expect(draft.status).toBe(200);
		const resumed = await draft.json();
		expect(resumed.workout.id).toBe(started.workout.id);
	});

	it("suggests the next training day after completed workouts", async () => {
		const { app, cookie, plan } = await createSessionWithActivePlan();
		const day1 = plan.template.days[0];
		const day2 = plan.template.days[1];

		const initial = await app.request("/training-plan/next-day", { headers: { cookie } });
		expect(initial.status).toBe(200);
		const initialBody = await initial.json();
		expect(initialBody.day.id).toBe(day1.id);

		const start = await app.request("/workouts/draft", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ trainingDayId: day1.id, startedAt: "2026-06-02T10:00:00.000Z" }),
		});
		const started = await start.json();
		await app.request(`/workouts/${started.workout.id}/complete`, {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ completedAt: "2026-06-02T11:00:00.000Z" }),
		});

		const next = await app.request("/training-plan/next-day", { headers: { cookie } });
		expect(next.status).toBe(200);
		const nextBody = await next.json();
		expect(nextBody.day.id).toBe(day2.id);
	});

	it("updates exercise logs, set logs, and completes a draft workout", async () => {
		const { app, cookie, plan } = await createSessionWithActivePlan();
		const trainingDayId = plan.template.days[0].id as string;

		const start = await app.request("/workouts/draft", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				trainingDayId,
				startedAt: "2026-06-02T10:00:00.000Z",
			}),
		});
		const started = await start.json();
		const exerciseLogId = started.workout.exercises[0].id as string;

		const update = await app.request(
			`/workouts/${started.workout.id}/exercises/${exerciseLogId}`,
			{
				method: "PUT",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					status: "completed",
					goodForm: true,
					note: "Felt solid",
					sets: [
						{ setIndex: 1, weightKg: 20, reps: 12 },
						{ setIndex: 2, weightKg: 22.5, reps: 10 },
					],
				}),
			},
		);
		expect(update.status).toBe(200);
		const updated = await update.json();
		expect(updated.exercise).toMatchObject({
			status: "completed",
			goodForm: true,
			note: "Felt solid",
		});
		expect(updated.exercise.sets).toHaveLength(2);

		const complete = await app.request(
			`/workouts/${started.workout.id}/complete`,
			{
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					completedAt: "2026-06-02T11:00:00.000Z",
					note: "Done",
				}),
			},
		);
		expect(complete.status).toBe(200);
		const completed = await complete.json();
		expect(completed.workout).toMatchObject({
			status: "completed",
			note: "Done",
		});
	});
});
