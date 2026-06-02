import { describe, expect, it } from "vitest";
import { validateSetupForm } from "./setup-validation";

describe("setup form validation", () => {
	it("returns field-level messages for empty setup form", () => {
		expect(
			validateSetupForm({
				adminUsername: "",
				adminDisplayName: "",
				adminPassword: "",
				partnerUsername: "",
				partnerDisplayName: "",
				partnerPassword: "",
			}),
		).toMatchObject({
			adminUsername: "Admin username is required.",
			adminDisplayName: "Admin display name is required.",
			adminPassword: "Admin password must be at least 8 characters.",
			partnerUsername: "Partner username is required.",
		});
	});

	it("requires distinct usernames", () => {
		expect(
			validateSetupForm({
				adminUsername: "same",
				adminDisplayName: "Admin",
				adminPassword: "password123",
				partnerUsername: "same",
				partnerDisplayName: "Partner",
				partnerPassword: "password123",
			}),
		).toMatchObject({ partnerUsername: "Partner username must be different from admin username." });
	});

	it("accepts a valid setup form", () => {
		expect(
			validateSetupForm({
				adminUsername: "admin",
				adminDisplayName: "Admin",
				adminPassword: "password123",
				partnerUsername: "partner",
				partnerDisplayName: "Partner",
				partnerPassword: "password123",
			}),
		).toEqual({});
	});
});
