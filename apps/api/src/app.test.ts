import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("api app", () => {
	it("responds to health checks", async () => {
		const app = createApp();
		const response = await app.request("/health");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("allows configured CORS origins", async () => {
		const app = createApp({ corsAllowedOrigins: ["https://bfitlog.example.com"] });
		const response = await app.request("/health", {
			headers: { origin: "https://bfitlog.example.com" },
		});

		expect(response.headers.get("access-control-allow-origin")).toBe(
			"https://bfitlog.example.com",
		);
	});

	it("does not reflect unconfigured CORS origins", async () => {
		const app = createApp({ corsAllowedOrigins: ["https://bfitlog.example.com"] });
		const response = await app.request("/health", {
			headers: { origin: "https://evil.example.com" },
		});

		expect(response.headers.get("access-control-allow-origin")).toBeNull();
	});
});
