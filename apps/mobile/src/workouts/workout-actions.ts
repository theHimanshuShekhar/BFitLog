export type WorkoutStatus = "draft" | "completed" | "discarded";
export type WorkoutDetailAction = "save-note" | "complete" | "discard" | "delete";

export function getWorkoutDetailTitle(status: WorkoutStatus) {
	return status === "completed" ? "Workout detail" : "Workout draft";
}

export function getWorkoutDetailActions(status: WorkoutStatus): WorkoutDetailAction[] {
	if (status === "completed") return ["save-note", "delete"];
	if (status === "draft") return ["save-note", "complete", "discard"];
	return [];
}
