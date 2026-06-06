import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoalReminderRepository, GoalReminderStore } from "./goal-reminder-repository";
import { HttpGoalReminderSyncClient } from "./goals-api";

const repositories = new Map<string, GoalReminderRepository>();

export function getGoalReminderRepository(userId: string) {
	const existing = repositories.get(userId);
	if (existing) return existing;
	const repository = new GoalReminderRepository(
		new GoalReminderStore(AsyncStorage, `bfitlog:goals-reminders:${userId}`),
		userId,
		new HttpGoalReminderSyncClient(),
	);
	repositories.set(userId, repository);
	return repository;
}

export function resetGoalReminderRepositoriesForTest() {
	repositories.clear();
}
