import { describe, expect, it } from "vitest";
import { pauseRestTimer, resumeRestTimer, tickRestTimer } from "./rest-timer";

describe("rest timer", () => {
	it("counts down to zero without going negative", () => {
		expect(
			tickRestTimer({ exerciseName: "Bench", remainingSeconds: 2, paused: false }),
		).toEqual({ exerciseName: "Bench", remainingSeconds: 1, paused: false });
		expect(
			tickRestTimer({ exerciseName: "Bench", remainingSeconds: 1, paused: false }),
		).toBeNull();
	});

	it("does not count down while paused and resumes later", () => {
		const timer = { exerciseName: "Bench", remainingSeconds: 30, paused: false };
		expect(tickRestTimer(pauseRestTimer(timer))).toEqual({
			exerciseName: "Bench",
			remainingSeconds: 30,
			paused: true,
		});
		expect(tickRestTimer(resumeRestTimer(pauseRestTimer(timer)))).toEqual({
			exerciseName: "Bench",
			remainingSeconds: 29,
			paused: false,
		});
	});
});
