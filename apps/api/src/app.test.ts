import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("api app", () => {
	it("responds to health checks", async () => {
		const app = createApp();
		const response = await app.request("/health");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});
});
