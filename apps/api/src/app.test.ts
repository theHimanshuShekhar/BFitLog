import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("api app", () => {
	it("responds to health checks", async () => {
		const app = createApp();
		const response = await app.request("/health");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("serves API v1 metadata under the single-domain API prefix", async () => {
		const app = createApp();
		const response = await app.request("/api/v1/");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			api: "BFitLog",
			version: "v1",
		});
	});

	it("allows configured CORS origins", async () => {
		const app = createApp({
			corsAllowedOrigins: ["https://bfitlog.example.com"],
		});
		const response = await app.request("/health", {
			headers: { origin: "https://bfitlog.example.com" },
		});

		expect(response.headers.get("access-control-allow-origin")).toBe(
			"https://bfitlog.example.com",
		);
	});

	it("does not reflect unconfigured CORS origins", async () => {
		const app = createApp({
			corsAllowedOrigins: ["https://bfitlog.example.com"],
		});
		const response = await app.request("/health", {
			headers: { origin: "https://evil.example.com" },
		});

		expect(response.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("serves the Expo web app fallback after API routes", async () => {
		const webRoot = await mkdtemp(join(tmpdir(), "bfitlog-web-"));
		await writeFile(join(webRoot, "index.html"), "<div>BFitLog web</div>");
		const app = createApp({ webRoot });

		const response = await app.request("/login", {
			headers: { accept: "text/html" },
		});

		expect(response.status).toBe(200);
		await expect(response.text()).resolves.toContain("BFitLog web");
	});

	it("keeps API-prefixed unknown routes out of the web fallback", async () => {
		const webRoot = await mkdtemp(join(tmpdir(), "bfitlog-web-"));
		await writeFile(join(webRoot, "index.html"), "<div>BFitLog web</div>");
		const app = createApp({ webRoot });

		const response = await app.request("/api/v1/workouts/not-found", {
			headers: { accept: "text/html" },
		});

		expect(response.status).not.toBe(200);
	});
});
