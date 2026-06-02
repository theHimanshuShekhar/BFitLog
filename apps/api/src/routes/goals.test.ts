import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
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

describe("goal and reminder routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("upserts workout frequency goals for the current user", async () => {
		const { app, cookie } = await createSession();
		const response = await app.request("/goals/workout-frequency", {
			method: "PUT",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ targetWorkoutsPerWeek: 4 }),
		});
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.goal.targetWorkoutsPerWeek).toBe(4);

		const get = await app.request("/goals/workout-frequency", {
			headers: { cookie },
		});
		expect(get.status).toBe(200);
		const getBody = await get.json();
		expect(getBody.goal.targetWorkoutsPerWeek).toBe(4);
	});

	it("upserts reminder settings and notification devices", async () => {
		const { app, cookie } = await createSession();
		const settings = await app.request("/reminders/settings", {
			method: "PUT",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				workoutReminderEnabled: true,
				workoutReminderTime: "18:30",
				weighInReminderEnabled: true,
				weighInReminderTime: "07:00",
			}),
		});
		expect(settings.status).toBe(200);
		const settingsBody = await settings.json();
		expect(settingsBody.settings).toMatchObject({
			workoutReminderEnabled: true,
			workoutReminderTime: "18:30",
			weighInReminderEnabled: true,
			weighInReminderTime: "07:00",
		});

		const device = await app.request("/reminders/devices/web-test", {
			method: "PUT",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				platform: "web",
				notificationsEnabled: false,
			}),
		});
		expect(device.status).toBe(200);
		const deviceBody = await device.json();
		expect(deviceBody.device).toMatchObject({
			deviceId: "web-test",
			platform: "web",
			notificationsEnabled: false,
		});
	});
});
