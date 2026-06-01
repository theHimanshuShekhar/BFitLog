import { createApp } from "../app.js";
import { truncateAppTables } from "../test-utils/db.js";
import { describe, expect, it, beforeEach } from "vitest";

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

describe("setup routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("reports setup required when no users exist", async () => {
		const app = createApp();
		const response = await app.request("/setup/status");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ setupRequired: true });
	});

	it("creates admin and partner once", async () => {
		const app = createApp();
		const first = await app.request("/setup", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(setupBody),
		});

		expect(first.status).toBe(201);
		const body = await first.json();
		expect(body.admin).toMatchObject({ username: "admin", role: "admin" });
		expect(body.partner).toMatchObject({ username: "partner", role: "member" });

		const status = await app.request("/setup/status");
		await expect(status.json()).resolves.toEqual({ setupRequired: false });

		const second = await app.request("/setup", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(setupBody),
		});
		expect(second.status).toBe(409);
	});
});
