import AsyncStorage from "@react-native-async-storage/async-storage";
import { BodyWeightRepository } from "./body-weight-repository";
import { BodyWeightStore } from "./body-weight-store";
import { HttpBodyWeightSyncClient } from "./body-weight-sync-client";

let repository: BodyWeightRepository | null = null;

export function getBodyWeightRepository() {
	repository ??= new BodyWeightRepository(
		new BodyWeightStore(AsyncStorage),
		new HttpBodyWeightSyncClient(),
	);
	return repository;
}
