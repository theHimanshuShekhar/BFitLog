import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		async getItem() {
			return null;
		},
		async setItem() {},
	},
}));

vi.mock("./body-weight-sync-client", () => ({
	HttpBodyWeightSyncClient: class {},
}));

import { getBodyWeightRepository, resetBodyWeightRepositoriesForTest } from "./repository";

describe("getBodyWeightRepository", () => {
	it("returns separate repository instances per user", () => {
		resetBodyWeightRepositoriesForTest();

		const first = getBodyWeightRepository("user-a");
		const second = getBodyWeightRepository("user-b");

		expect(first).not.toBe(second);
		expect(getBodyWeightRepository("user-a")).toBe(first);
	});
});
