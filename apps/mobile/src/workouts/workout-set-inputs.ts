export type SavedWorkoutSet = {
	id: string;
	setIndex: number;
	weightKg: number | null;
	reps: number | null;
	durationSeconds: number | null;
};

export type WorkoutSetInput = {
	setIndex: number;
	weightKg: string;
	reps: string;
	durationSeconds: string;
};

export type WorkoutSetPayload = {
	setIndex: number;
	weightKg?: number;
	reps?: number;
	durationSeconds?: number;
};

export const emptyWorkoutSetInput: WorkoutSetInput = {
	setIndex: 1,
	weightKg: "",
	reps: "",
	durationSeconds: "",
};

export function workoutSetInputsFromSavedSets(
	sets: SavedWorkoutSet[],
): WorkoutSetInput[] {
	if (sets.length === 0) return [{ ...emptyWorkoutSetInput }];
	return [...sets]
		.sort((left, right) => left.setIndex - right.setIndex)
		.map((set) => ({
			setIndex: set.setIndex,
			weightKg: set.weightKg == null ? "" : String(set.weightKg),
			reps: set.reps == null ? "" : String(set.reps),
			durationSeconds:
				set.durationSeconds == null ? "" : String(set.durationSeconds),
		}));
}

export function addWorkoutSetInput(inputs: WorkoutSetInput[]): WorkoutSetInput[] {
	return [
		...inputs,
		{ ...emptyWorkoutSetInput, setIndex: nextSetIndex(inputs) },
	];
}

export function removeWorkoutSetInput(
	inputs: WorkoutSetInput[],
	index: number,
): WorkoutSetInput[] {
	const remaining = inputs.filter((_, inputIndex) => inputIndex !== index);
	if (remaining.length === 0) return [{ ...emptyWorkoutSetInput }];
	return remaining.map((input, inputIndex) => ({
		...input,
		setIndex: inputIndex + 1,
	}));
}

export function buildWorkoutSetPayload(
	inputs: WorkoutSetInput[],
): WorkoutSetPayload[] {
	return inputs.flatMap((input) => {
		const set: WorkoutSetPayload = { setIndex: input.setIndex };
		const weightKg = Number(input.weightKg);
		const reps = Number(input.reps);
		const durationSeconds = Number(input.durationSeconds);
		if (input.weightKg.trim() && Number.isFinite(weightKg)) set.weightKg = weightKg;
		if (input.reps.trim() && Number.isFinite(reps)) set.reps = reps;
		if (input.durationSeconds.trim() && Number.isFinite(durationSeconds)) {
			set.durationSeconds = durationSeconds;
		}
		return set.weightKg === undefined &&
			set.reps === undefined &&
			set.durationSeconds === undefined
			? []
			: [set];
	});
}

function nextSetIndex(inputs: WorkoutSetInput[]) {
	return inputs.reduce((max, input) => Math.max(max, input.setIndex), 0) + 1;
}
