import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
import { truncateAppTables } from "../test-utils/db.js";
import { describe, expect, it, beforeEach } from "vitest";

describe("setup routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("reports setup not required because startup creates a default admin", async () => {
		const app = createApp();
		await ensureDefaultAdmin();
		const response = await app.request("/setup/status");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ setupRequired: false });
	});

	it("rejects legacy setup user creation", async () => {
		const app = createApp();
		const response = await app.request("/setup", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(410);
	});
});
