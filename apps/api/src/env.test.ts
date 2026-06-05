import { describe, expect, it } from "vitest";
import { readEnv } from "./env.js";

describe("readEnv", () => {
	it("allows explicit insecure cookies for local HTTP Docker verification", () => {
		const env = readEnv({
			NODE_ENV: "production",
			BETTER_AUTH_URL: "http://localhost:3000",
			BETTER_AUTH_SECURE_COOKIES: "false",
		});

		expect(env.useSecureCookies).toBe(false);
	});
});
