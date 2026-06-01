import { describe, expect, it } from "vitest";
import { bodyWeightGoalSchema, bodyWeightLogSchema } from "./body-weight";

const userId = "better-auth-user-id";
const logId = "00000000-0000-4000-8000-000000000002";
const now = "2026-06-01T12:00:00.000Z";

describe("body weight schemas", () => {
	it("accepts a valid body weight goal", () => {
		expect(
			bodyWeightGoalSchema.parse({
				userId,
				targetKg: 85.5,
				direction: "lose",
				updatedAt: now,
			}),
		).toEqual({
			userId,
			targetKg: 85.5,
			direction: "lose",
			updatedAt: now,
		});
	});

	it("rejects invalid goal directions", () => {
		expect(() =>
			bodyWeightGoalSchema.parse({
				userId,
				targetKg: 85,
				direction: "cut",
				updatedAt: now,
			}),
		).toThrow();
	});

	it("rejects non-positive body weights", () => {
		expect(() =>
			bodyWeightLogSchema.parse({
				id: logId,
				userId,
				measuredAt: now,
				weightKg: 0,
				createdAt: now,
				updatedAt: now,
			}),
		).toThrow();
	});

	it("accepts a valid body weight log", () => {
		expect(
			bodyWeightLogSchema.parse({
				id: logId,
				userId,
				measuredAt: now,
				weightKg: 90.1,
				note: "Morning",
				createdAt: now,
				updatedAt: now,
			}),
		).toMatchObject({ id: logId, userId, weightKg: 90.1 });
	});
});
