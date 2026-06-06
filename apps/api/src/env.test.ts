import { describe, expect, it } from "vitest";
import { readEnv } from "./env.js";

describe("readEnv", () => {
	it("allows explicit insecure cookies for local HTTP Docker verification", () => {
		const env = readEnv({
			NODE_ENV: "production",
			BETTER_AUTH_URL: "http://localhost:3000",
			BETTER_AUTH_SECRET: "test-secret-with-enough-entropy",
			BETTER_AUTH_SECURE_COOKIES: "false",
		});

		expect(env.useSecureCookies).toBe(false);
	});

	it("rejects a missing production Better Auth secret", () => {
		expect(() =>
			readEnv({
				NODE_ENV: "production",
				BETTER_AUTH_URL: "https://bfitlog.example.com",
			}),
		).toThrow("BETTER_AUTH_SECRET");
	});

	it("does not include development origins in production trusted origins", () => {
		const env = readEnv({
			NODE_ENV: "production",
			BETTER_AUTH_URL: "https://bfitlog.example.com",
			BETTER_AUTH_SECRET: "test-secret-with-enough-entropy",
			BETTER_AUTH_TRUSTED_ORIGINS: "https://app.example.com,bfitlog://",
		});

		expect(env.betterAuthTrustedOrigins).toEqual([
			"https://bfitlog.example.com",
			"https://app.example.com",
			"bfitlog://",
		]);
		expect(env.betterAuthTrustedOrigins).not.toContain("http://localhost:3000");
		expect(env.betterAuthTrustedOrigins).not.toContain("http://localhost:8081");
	});
});
