import { describe, expect, it } from "vitest";
import type { ReminderSettings, WorkoutFrequencyGoal } from "./goals-api";
import { GoalReminderRepository, GoalReminderStore } from "./goal-reminder-repository";

class MemoryStorage {
	private value: string | null = null;
	async getItem() {
		return this.value;
	}
	async setItem(_key: string, value: string) {
		this.value = value;
	}
}

const goal: WorkoutFrequencyGoal = {
	userId: "user-1",
	targetWorkoutsPerWeek: 4,
	updatedAt: "2026-06-05T10:00:00.000Z",
};

const settings: ReminderSettings = {
	userId: "user-1",
	workoutReminderEnabled: true,
	workoutReminderTime: "18:00",
	weighInReminderEnabled: false,
	weighInReminderTime: null,
	updatedAt: "2026-06-05T10:00:00.000Z",
};

describe("GoalReminderRepository", () => {
	it("persists offline edits and syncs them later", async () => {
		const pushed: Array<WorkoutFrequencyGoal | ReminderSettings> = [];
		const repository = new GoalReminderRepository(
			new GoalReminderStore(new MemoryStorage(), "goals:user-1"),
			"user-1",
			{
				async pullGoal() {
					return null;
				},
				async pullSettings() {
					return null;
				},
				async pushGoal(nextGoal) {
					pushed.push(nextGoal);
					return nextGoal;
				},
				async pushSettings(nextSettings) {
					pushed.push(nextSettings);
					return nextSettings;
				},
			},
		);

		await repository.saveGoal(goal);
		await repository.saveSettings(settings);
		await repository.sync();

		expect(pushed).toEqual([goal, settings]);
		await expect(repository.getGoal()).resolves.toEqual(goal);
		await expect(repository.getSettings()).resolves.toEqual(settings);
	});

	it("rejects records for a different user", async () => {
		const repository = new GoalReminderRepository(
			new GoalReminderStore(new MemoryStorage(), "goals:user-1"),
			"user-1",
		);

		await expect(
			repository.saveGoal({ ...goal, userId: "other-user" }),
		).rejects.toThrow("different user");
	});
});
