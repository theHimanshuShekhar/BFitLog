import { describe, expect, it } from "vitest";
import { getWorkoutDetailActions, getWorkoutDetailTitle } from "./workout-actions";

describe("workout detail actions", () => {
	it("shows completed workout history as an editable detail with delete but no draft actions", () => {
		expect(getWorkoutDetailTitle("completed")).toBe("Workout detail");
		expect(getWorkoutDetailActions("completed")).toEqual([
			"save-note",
			"delete",
		]);
	});

	it("keeps draft-only complete and discard actions on draft workouts", () => {
		expect(getWorkoutDetailTitle("draft")).toBe("Workout draft");
		expect(getWorkoutDetailActions("draft")).toEqual([
			"save-note",
			"complete",
			"discard",
		]);
	});
});
