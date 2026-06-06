import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveExerciseSet, type WorkoutExercise } from "./workout-api";

vi.mock("@/api/client", () => ({ apiBaseUrl: "http://api.test" }));
vi.mock("@/auth/auth-client", () => ({
	authClient: { getCookie: () => "session-cookie" },
}));

const fetchMock = vi.fn();

const exercise: WorkoutExercise = {
	id: "exercise-log-1",
	plannedExerciseName: "Bench Press",
	plannedExerciseTarget: "3 sets · 8-10 reps",
	restSeconds: 90,
	status: "planned",
	goodForm: null,
	note: null,
	skipReason: null,
	originalExerciseId: "bench-press",
	performedExerciseId: "bench-press",
	sets: [],
	substitutes: [],
};

describe("saveExerciseSet", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});

	it("sends the selected Good Form value instead of forcing true", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ exercise: { ...exercise, goodForm: false } }), {
				status: 200,
			}),
		);

		await saveExerciseSet(
			"workout-1",
			exercise,
			[{ setIndex: 1, weightKg: 40, reps: 8 }],
			{ goodForm: false },
		);

		const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(JSON.parse(String(request.body))).toMatchObject({
			goodForm: false,
		});
	});
});
