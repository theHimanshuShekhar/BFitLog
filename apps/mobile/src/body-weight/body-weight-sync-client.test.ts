import { describe, expect, it } from "vitest";
import { buildAuthRequestInit } from "../api/auth-request";

describe("body weight sync auth requests", () => {
	it("includes browser credentials when no native cookie is available", () => {
		const init = buildAuthRequestInit("", {
			headers: { "content-type": "application/json" },
		});

		expect(init.credentials).toBe("include");
	});

	it("uses an explicit cookie header for native requests", () => {
		const init = buildAuthRequestInit("better-auth.session_token=value");

		expect(init.credentials).toBe("omit");
		expect(new Headers(init.headers).get("Cookie")).toBe(
			"better-auth.session_token=value",
		);
	});
});
