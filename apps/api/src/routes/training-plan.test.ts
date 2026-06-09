import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
import { seedTrainingPlan } from "../db/seed-training-plan.js";
import { truncateAppTables } from "../test-utils/db.js";
import { beforeEach, describe, expect, it } from "vitest";

async function createSession() {
	const app = createApp();
	await ensureDefaultAdmin();
	const defaultLogin = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "admin", password: "admin" }),
	});
	const defaultCookie = defaultLogin.headers.get("set-cookie") ?? "";
	await app.request("/admin/users", {
		method: "POST",
		headers: { "content-type": "application/json", cookie: defaultCookie },
		body: JSON.stringify({
			username: "realadmin",
			displayName: "Real Admin",
			password: "password1234",
		}),
	});
	const login = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "realadmin", password: "password1234" }),
	});
	return { app, cookie: login.headers.get("set-cookie") ?? "" };
}

describe("training plan routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("returns the seeded training plan template to authenticated users", async () => {
		await seedTrainingPlan();
		const { app, cookie } = await createSession();

		const response = await app.request("/training-plan/template", {
			headers: { cookie },
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.template.name).toBe("4-Day Beginner Upper/Lower Split");
		expect(body.template.days).toHaveLength(4);
		expect(body.template.days[0].exercises).toHaveLength(5);
		expect(body.template.days[0].exercises[0].exercise.media).toHaveLength(2);
		expect(
			body.template.days[0].exercises.every(
				(exercise: { substitutes: unknown[] }) =>
					exercise.substitutes.length > 0,
			),
		).toBe(true);
		const warmupTextsByDay = body.template.days.map(
			(day: { checklist: Array<{ kind: string; text: string }> }) =>
				day.checklist
					.filter((item) => item.kind === "warmup")
					.map((item) => item.text),
		);
		expect(warmupTextsByDay).toEqual([
			[
				"5 minutes light cardio: walking, cycling, or elliptical at a comfortable pace.",
				"Arm circles (forward/backward): 30 seconds each direction.",
				"Shoulder rolls (forward/backward): 10 each direction.",
				"Cat-cow stretch: 10 slow reps.",
				"Torso twists: 10 each side.",
				"Chest openers (interlace fingers behind back, lift arms): 10 reps.",
				"Arm swings (cross-body): 10 each arm.",
				"Bodyweight squats: 10 slow reps.",
				"Leg swings (front-to-back and side-to-side): 10 each leg.",
			],
			[
				"5 minutes light cardio: walking, cycling, or elliptical at a comfortable pace.",
				"Leg swings (front-to-back and side-to-side): 10 each leg.",
				"Hip circles: 10 each direction.",
				"Bodyweight squats: 15 slow reps.",
				"Walking lunges (optional, if comfortable): 10 each leg.",
				"Glute bridges: 15 reps.",
				"Calf raises: 15 reps.",
				"Ankle rolls: 10 each direction.",
				"Torso twists: 10 each side.",
			],
			[
				"5 minutes light cardio: walking, cycling, or elliptical at a comfortable pace.",
				"Arm circles (forward/backward): 30 seconds each direction.",
				"Shoulder rolls (forward/backward): 10 each direction.",
				"Cat-cow stretch: 10 slow reps.",
				"Torso twists: 10 each side.",
				"Chest openers (interlace fingers behind back, lift arms): 10 reps.",
				"Arm swings (cross-body): 10 each arm.",
				"Wrist circles: 10 each direction.",
				"Bodyweight squats: 10 slow reps.",
				"Leg swings (front-to-back and side-to-side): 10 each leg.",
			],
			[
				"5 minutes light cardio: walking, cycling, or elliptical at a comfortable pace.",
				"Leg swings (front-to-back and side-to-side): 10 each leg.",
				"Hip circles: 10 each direction.",
				"Bodyweight squats: 15 slow reps.",
				"Glute bridges: 15 reps.",
				"Cat-cow stretch: 10 slow reps.",
				"Hip hinges (mimic deadlift with bodyweight): 10 reps.",
				"Calf raises: 15 reps.",
				"Ankle rolls: 10 each direction.",
				"Torso twists: 10 each side.",
			],
		]);
	});

	it("creates and returns the current user's active default plan", async () => {
		await seedTrainingPlan();
		const { app, cookie } = await createSession();

		const empty = await app.request("/training-plan/active", {
			headers: { cookie },
		});
		expect(empty.status).toBe(200);
		await expect(empty.json()).resolves.toEqual({ plan: null });

		const created = await app.request("/training-plan/active/default", {
			method: "POST",
			headers: { cookie },
		});
		expect(created.status).toBe(201);
		const createdBody = await created.json();
		expect(createdBody.plan.name).toBe("4-Day Beginner Upper/Lower Split");
		expect(createdBody.plan.template.days).toHaveLength(4);

		const active = await app.request("/training-plan/active", {
			headers: { cookie },
		});
		expect(active.status).toBe(200);
		const activeBody = await active.json();
		expect(activeBody.plan.id).toBe(createdBody.plan.id);
	});
});
