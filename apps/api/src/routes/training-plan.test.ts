import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
import { seedTrainingPlan } from "../db/seed-training-plan.js";
import { truncateAppTables } from "../test-utils/db.js";
import { beforeEach, describe, expect, it } from "vitest";

async function createSession() {
	const app = createApp();
	await ensureDefaultAdmin();
	const login = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "admin", password: "admin" }),
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
