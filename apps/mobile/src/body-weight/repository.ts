import AsyncStorage from "@react-native-async-storage/async-storage";
import { BodyWeightRepository } from "./body-weight-repository";
import { BodyWeightStore } from "./body-weight-store";
import { HttpBodyWeightSyncClient } from "./body-weight-sync-client";

const repositories = new Map<string, BodyWeightRepository>();

export function getBodyWeightRepository(userId: string) {
	const repository = repositories.get(userId);
	if (repository) return repository;

	const nextRepository = new BodyWeightRepository(
		new BodyWeightStore(AsyncStorage, `bfitlog:body-weight:${userId}`),
		new HttpBodyWeightSyncClient(),
		userId,
	);
	repositories.set(userId, nextRepository);
	return nextRepository;
}

export function resetBodyWeightRepositoriesForTest() {
	repositories.clear();
}
