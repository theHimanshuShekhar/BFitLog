import { describe, expect, it } from "vitest";
import { formatWorkoutSubstituteLabel } from "./workout-substitutes";

describe("workout substitute labels", () => {
	it("shows preferred substitute name, target, and note", () => {
		expect(
			formatWorkoutSubstituteLabel({
				exercise: { name: "Chest Press Machine" },
				targetSets: 3,
				targetMinReps: 8,
				targetMaxReps: 10,
				targetDurationSeconds: null,
				notes: "Machine chest press if Smith machine is unavailable.",
			}),
		).toBe(
			"Chest Press Machine · 3 × 8-10 — Machine chest press if Smith machine is unavailable.",
		);
	});

	it("shows duration substitute targets", () => {
		expect(
			formatWorkoutSubstituteLabel({
				exercise: { name: "Plank" },
				targetSets: 3,
				targetMinReps: null,
				targetMaxReps: null,
				targetDurationSeconds: 45,
				notes: null,
			}),
		).toBe("Plank · 3 × 45s");
	});
});
