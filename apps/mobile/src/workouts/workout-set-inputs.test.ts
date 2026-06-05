import { describe, expect, it } from "vitest";
import {
	addWorkoutSetInput,
	buildWorkoutSetPayload,
	removeWorkoutSetInput,
	workoutSetInputsFromSavedSets,
} from "./workout-set-inputs";

describe("workout set inputs", () => {
	it("creates editable inputs from all saved sets in set index order", () => {
		expect(
			workoutSetInputsFromSavedSets([
				{ id: "set-2", setIndex: 2, weightKg: 82.5, reps: 8, durationSeconds: null },
				{ id: "set-1", setIndex: 1, weightKg: 80, reps: 10, durationSeconds: null },
			]),
		).toEqual([
			{ setIndex: 1, weightKg: "80", reps: "10", durationSeconds: "" },
			{ setIndex: 2, weightKg: "82.5", reps: "8", durationSeconds: "" },
		]);
	});

	it("adds and removes editable set rows while keeping one row available", () => {
		const one = [{ setIndex: 1, weightKg: "80", reps: "8", durationSeconds: "" }];
		expect(addWorkoutSetInput(one)).toEqual([
			{ setIndex: 1, weightKg: "80", reps: "8", durationSeconds: "" },
			{ setIndex: 2, weightKg: "", reps: "", durationSeconds: "" },
		]);
		expect(removeWorkoutSetInput(one, 0)).toEqual([
			{ setIndex: 1, weightKg: "", reps: "", durationSeconds: "" },
		]);
	});

	it("builds a compact save payload from non-empty set rows", () => {
		expect(
			buildWorkoutSetPayload([
				{ setIndex: 1, weightKg: "80", reps: "8", durationSeconds: "" },
				{ setIndex: 2, weightKg: "", reps: "", durationSeconds: "" },
				{ setIndex: 3, weightKg: "", reps: "", durationSeconds: "45" },
			]),
		).toEqual([
			{ setIndex: 1, weightKg: 80, reps: 8 },
			{ setIndex: 3, durationSeconds: 45 },
		]);
	});
});
