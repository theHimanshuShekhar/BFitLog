import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
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
	const body = await login.clone().json();
	const cookie = login.headers.get("set-cookie") ?? "";
	return { app, cookie, userId: body.user.id as string };
}

describe("body weight routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("requires authentication", async () => {
		const app = createApp();
		const response = await app.request("/body-weight/goal");
		expect(response.status).toBe(401);
	});

	it("upserts goal and body weight logs for current user", async () => {
		const { app, cookie, userId } = await createSession();
		const now = "2026-06-01T10:00:00.000Z";
		const logId = "00000000-0000-4000-8000-000000000123";

		const goalResponse = await app.request("/body-weight/goal", {
			method: "PUT",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				userId,
				targetKg: 85,
				direction: "lose",
				updatedAt: now,
			}),
		});
		expect(goalResponse.status).toBe(200);
		await expect(goalResponse.json()).resolves.toEqual({
			goal: { userId, targetKg: 85, direction: "lose", updatedAt: now },
		});

		const logResponse = await app.request(`/body-weight/logs/${logId}`, {
			method: "PUT",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				id: logId,
				userId,
				measuredAt: now,
				weightKg: 90.5,
				createdAt: now,
				updatedAt: now,
			}),
		});
		expect(logResponse.status).toBe(200);

		const logsResponse = await app.request("/body-weight/logs", {
			headers: { cookie },
		});
		expect(logsResponse.status).toBe(200);
		const logsBody = await logsResponse.json();
		expect(logsBody.logs).toHaveLength(1);
		expect(logsBody.logs[0]).toMatchObject({
			id: logId,
			userId,
			weightKg: 90.5,
		});
	});
});
