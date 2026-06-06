import type { ReminderSettings, WorkoutFrequencyGoal } from "./goals-api";

export type GoalReminderStorage = {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
};

type GoalReminderState = {
	goal: WorkoutFrequencyGoal | null;
	settings: ReminderSettings | null;
	dirtyGoal: boolean;
	dirtySettings: boolean;
};

export type GoalReminderSyncClient = {
	pullGoal(): Promise<WorkoutFrequencyGoal | null>;
	pullSettings(): Promise<ReminderSettings | null>;
	pushGoal(goal: WorkoutFrequencyGoal): Promise<WorkoutFrequencyGoal>;
	pushSettings(settings: ReminderSettings): Promise<ReminderSettings>;
};

const emptyState: GoalReminderState = {
	goal: null,
	settings: null,
	dirtyGoal: false,
	dirtySettings: false,
};

export class GoalReminderStore {
	constructor(
		private readonly storage: GoalReminderStorage,
		private readonly key: string,
	) {}

	async load(): Promise<GoalReminderState> {
		const raw = await this.storage.getItem(this.key);
		if (!raw) return emptyState;
		return { ...emptyState, ...(JSON.parse(raw) as Partial<GoalReminderState>) };
	}

	async save(state: GoalReminderState): Promise<void> {
		await this.storage.setItem(this.key, JSON.stringify(state));
	}
}

export class GoalReminderRepository {
	constructor(
		private readonly store: GoalReminderStore,
		private readonly userId: string,
		private readonly syncClient?: GoalReminderSyncClient,
	) {}

	async getGoal() {
		const goal = (await this.store.load()).goal;
		return goal?.userId === this.userId ? goal : null;
	}

	async getSettings() {
		const settings = (await this.store.load()).settings;
		return settings?.userId === this.userId ? settings : null;
	}

	async saveGoal(goal: WorkoutFrequencyGoal): Promise<void> {
		if (goal.userId !== this.userId) {
			throw new Error("Cannot save workout goal for a different user");
		}
		const state = await this.store.load();
		await this.store.save({ ...state, goal, dirtyGoal: true });
	}

	async saveSettings(settings: ReminderSettings): Promise<void> {
		if (settings.userId !== this.userId) {
			throw new Error("Cannot save reminder settings for a different user");
		}
		const state = await this.store.load();
		await this.store.save({ ...state, settings, dirtySettings: true });
	}

	async sync(): Promise<void> {
		if (!this.syncClient) return;
		let state = await this.store.load();
		let nextGoal = state.goal;
		let nextSettings = state.settings;

		if (state.dirtyGoal && state.goal) {
			nextGoal = await this.syncClient.pushGoal(state.goal);
		} else {
			nextGoal = await this.syncClient.pullGoal();
		}
		state = { ...state, goal: nextGoal, dirtyGoal: false };
		await this.store.save(state);

		if (state.dirtySettings && state.settings) {
			nextSettings = await this.syncClient.pushSettings(state.settings);
		} else {
			nextSettings = await this.syncClient.pullSettings();
		}
		await this.store.save({
			...state,
			settings: nextSettings,
			dirtySettings: false,
		});
	}
}
