import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";

export type BodyWeightState = {
	goal: BodyWeightGoal | null;
	logs: BodyWeightLog[];
	dirtyGoal: boolean;
	dirtyLogIds: string[];
};

export type KeyValueStorage = {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
};

const defaultState: BodyWeightState = {
	goal: null,
	logs: [],
	dirtyGoal: false,
	dirtyLogIds: [],
};

export class BodyWeightStore {
	constructor(
		private readonly storage: KeyValueStorage,
		private readonly key = "bfitlog:body-weight",
	) {}

	async load(): Promise<BodyWeightState> {
		const raw = await this.storage.getItem(this.key);
		if (!raw) return { ...defaultState };

		const parsed = JSON.parse(raw) as Partial<BodyWeightState>;
		return {
			goal: parsed.goal ?? null,
			logs: parsed.logs ?? [],
			dirtyGoal: parsed.dirtyGoal ?? false,
			dirtyLogIds: parsed.dirtyLogIds ?? [],
		};
	}

	async save(state: BodyWeightState): Promise<void> {
		await this.storage.setItem(this.key, JSON.stringify(state));
	}
}

export class MemoryStorage implements KeyValueStorage {
	private readonly values = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
}
