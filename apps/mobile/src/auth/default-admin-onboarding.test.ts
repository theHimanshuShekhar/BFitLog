import { describe, expect, it } from "vitest";
import {
	isDefaultAdminUser,
	routeAfterLogin,
} from "./default-admin-onboarding";

describe("default admin onboarding", () => {
	it("sends the startup default admin to the first-user page", () => {
		expect(routeAfterLogin({ username: "admin" })).toBe("/first-user");
	});

	it("lets real users continue to the app", () => {
		expect(routeAfterLogin({ username: "realadmin" })).toBe("/");
	});

	it("detects only the startup default admin user", () => {
		expect(isDefaultAdminUser({ username: "admin" })).toBe(true);
		expect(isDefaultAdminUser({ username: "administrator" })).toBe(false);
		expect(isDefaultAdminUser(null)).toBe(false);
	});
});
