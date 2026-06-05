export type WorkoutSubstitute = {
	exercise: { name: string } | null;
	targetSets: number | null;
	targetMinReps: number | null;
	targetMaxReps: number | null;
	targetDurationSeconds: number | null;
	notes: string | null;
};

export function formatWorkoutSubstituteLabel(substitute: WorkoutSubstitute) {
	const parts = [substitute.exercise?.name ?? "Unknown exercise"];
	const target = formatSubstituteTarget(substitute);
	if (target) parts.push(target);
	const label = parts.join(" · ");
	return substitute.notes ? `${label} — ${substitute.notes}` : label;
}

function formatSubstituteTarget(substitute: WorkoutSubstitute) {
	if (substitute.targetSets == null) return null;
	if (substitute.targetDurationSeconds != null) {
		return `${substitute.targetSets} × ${substitute.targetDurationSeconds}s`;
	}
	if (substitute.targetMinReps != null && substitute.targetMaxReps != null) {
		return `${substitute.targetSets} × ${substitute.targetMinReps}-${substitute.targetMaxReps}`;
	}
	return null;
}
