import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";
import { describe, expect, it } from "vitest";
import {
	BodyWeightRepository,
	type BodyWeightSyncClient,
} from "./body-weight-repository";
import { BodyWeightStore, MemoryStorage } from "./body-weight-store";

const userId = "better-auth-user";
const logId = "00000000-0000-4000-8000-000000000111";
const now = "2026-06-01T10:00:00.000Z";

function createRepository(
	syncClient?: BodyWeightSyncClient,
	repositoryUserId = userId,
	store = new BodyWeightStore(new MemoryStorage()),
) {
	return new BodyWeightRepository(store, syncClient, repositoryUserId);
}

describe("BodyWeightRepository", () => {
	it("saves and lists body weight logs locally before sync", async () => {
		const repository = createRepository();
		const log: BodyWeightLog = {
			id: logId,
			userId,
			measuredAt: now,
			weightKg: 91.2,
			createdAt: now,
			updatedAt: now,
		};

		await repository.saveLog(log);

		await expect(repository.listLogs()).resolves.toEqual([log]);
	});

	it("keeps body weight state isolated by repository storage key", async () => {
		const storage = new MemoryStorage();
		const userRepository = createRepository(
			undefined,
			userId,
			new BodyWeightStore(storage, `bfitlog:body-weight:${userId}`),
		);
		const otherRepository = createRepository(
			undefined,
			"other-user",
			new BodyWeightStore(storage, "bfitlog:body-weight:other-user"),
		);
		const userGoal: BodyWeightGoal = {
			userId,
			targetKg: 85,
			direction: "lose",
			updatedAt: now,
		};
		const otherGoal: BodyWeightGoal = {
			userId: "other-user",
			targetKg: 75,
			direction: "maintain",
			updatedAt: now,
		};
		const userLog: BodyWeightLog = {
			id: logId,
			userId,
			measuredAt: now,
			weightKg: 91.2,
			createdAt: now,
			updatedAt: now,
		};
		const otherLog: BodyWeightLog = {
			id: "00000000-0000-4000-8000-000000000222",
			userId: "other-user",
			measuredAt: now,
			weightKg: 72.4,
			createdAt: now,
			updatedAt: now,
		};

		await userRepository.saveGoal(userGoal);
		await userRepository.saveLog(userLog);
		await otherRepository.saveGoal(otherGoal);
		await otherRepository.saveLog(otherLog);

		await expect(userRepository.getGoal()).resolves.toEqual(userGoal);
		await expect(userRepository.listLogs()).resolves.toEqual([userLog]);
		await expect(otherRepository.getGoal()).resolves.toEqual(otherGoal);
		await expect(otherRepository.listLogs()).resolves.toEqual([otherLog]);
	});

	it("pushes dirty goal and logs during sync", async () => {
		const pushedLogs: BodyWeightLog[] = [];
		let pushedGoal: BodyWeightGoal | null = null;
		const syncClient: BodyWeightSyncClient = {
			async pushGoal(goal) {
				pushedGoal = goal;
				return goal;
			},
			async pushLog(log) {
				pushedLogs.push(log);
			},
			async pullGoal() {
				return pushedGoal;
			},
			async pullLogs() {
				return pushedLogs;
			},
		};
		const repository = createRepository(syncClient);
		const goal: BodyWeightGoal = {
			userId,
			targetKg: 85,
			direction: "lose",
			updatedAt: now,
		};
		const log: BodyWeightLog = {
			id: logId,
			userId,
			measuredAt: now,
			weightKg: 91.2,
			createdAt: now,
			updatedAt: now,
		};

		await repository.saveGoal(goal);
		await repository.saveLog(log);
		await repository.sync();

		expect(pushedGoal).toEqual(goal);
		expect(pushedLogs).toEqual([log]);
		await expect(repository.getGoal()).resolves.toEqual(goal);
		await expect(repository.listLogs()).resolves.toEqual([log]);
	});

	it("hides deleted logs by default", async () => {
		const repository = createRepository();
		const log: BodyWeightLog = {
			id: logId,
			userId,
			measuredAt: now,
			weightKg: 91.2,
			createdAt: now,
			updatedAt: now,
		};

		await repository.saveLog(log);
		await repository.deleteLog(log.id, "2026-06-01T11:00:00.000Z");

		await expect(repository.listLogs()).resolves.toEqual([]);
		await expect(repository.listLogs(true)).resolves.toHaveLength(1);
	});
});
