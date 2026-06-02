import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useAuth } from "@/auth/use-auth";
import { colors, spacing } from "@/theme";
import {
	completeWorkout,
	deleteWorkout,
	discardWorkout,
	getDraftWorkout,
	getWorkout,
	saveExerciseSet,
	skipExercise,
	updateWorkoutChecklist,
	updateWorkoutNote,
	type DraftWorkout,
	type WorkoutExercise,
} from "@/workouts/workout-api";

type ExerciseInput = {
	weightKg: string;
	reps: string;
	durationSeconds: string;
	note: string;
	skipReason: string;
	performedExerciseId: string;
	substitutionNote: string;
};

type RestTimer = { exerciseName: string; remainingSeconds: number } | null;

export default function WorkoutScreen() {
	const params = useLocalSearchParams<{ workoutId?: string }>();
	const session = useAuth();
	const [workout, setWorkout] = useState<DraftWorkout | null>(null);
	const [inputs, setInputs] = useState<Record<string, ExerciseInput>>({});
	const [workoutNote, setWorkoutNote] = useState("");
	const [status, setStatus] = useState<
		"loading" | "ready" | "saving" | "error"
	>("loading");
	const [error, setError] = useState<string | null>(null);
	const [restTimer, setRestTimer] = useState<RestTimer>(null);

	const loadDraft = useCallback(async () => {
		setStatus("loading");
		setError(null);
		try {
			const draft = params.workoutId
				? await getWorkout(params.workoutId)
				: await getDraftWorkout();
			setWorkout(draft);
			setInputs(
				Object.fromEntries(
					(draft?.exercises ?? []).map((exercise) => [
						exercise.id,
						inputFromExercise(exercise),
					]),
				),
			);
			setWorkoutNote(draft?.note ?? "");
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to load workout");
			setStatus("error");
		}
	}, [params.workoutId]);

	useFocusEffect(
		useCallback(() => {
			if (!session.isPending && session.data) void loadDraft();
		}, [loadDraft, session.data, session.isPending]),
	);

	if (session.isPending || status === "loading") {
		return <CenteredSpinner />;
	}

	if (!session.data) {
		router.replace("/login");
		return null;
	}

	if (status === "error") {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Workout</Text>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Could not load workout</Text>
					<Text style={styles.description}>{error}</Text>
				</View>
				<Pressable
					style={styles.secondaryButton}
					onPress={() => void loadDraft()}
				>
					<Text style={styles.secondaryButtonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	if (!workout) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Workout</Text>
				<Text style={styles.description}>
					No draft workout yet. Start the next training day from Home.
				</Text>
			</View>
		);
	}

	const updateInput = (exerciseId: string, patch: Partial<ExerciseInput>) => {
		setInputs((current) => ({
			...current,
			[exerciseId]: { ...emptyInput, ...current[exerciseId], ...patch },
		}));
	};

	const saveExercise = async (exercise: WorkoutExercise) => {
		const input = inputs[exercise.id];
		if (!input) return;
		setStatus("saving");
		try {
			const set: {
				weightKg?: number;
				reps?: number;
				durationSeconds?: number;
			} = {};
			if (input.weightKg) set.weightKg = Number(input.weightKg);
			if (input.reps) set.reps = Number(input.reps);
			if (input.durationSeconds)
				set.durationSeconds = Number(input.durationSeconds);
			const updated = await saveExerciseSet(workout.id, exercise, set, {
				note: input.note,
				performedExerciseId: input.performedExerciseId,
				substitutionNote: input.substitutionNote,
			});
			setWorkout(replaceExercise(workout, updated));
			setRestTimer({
				exerciseName: exercise.plannedExerciseName,
				remainingSeconds: exercise.restSeconds ?? 90,
			});
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to save exercise");
			setStatus("error");
		}
	};

	const skip = async (exercise: WorkoutExercise) => {
		const input = inputs[exercise.id];
		const reason = input?.skipReason.trim();
		if (!reason) {
			setError("Skip reason is required.");
			setStatus("error");
			return;
		}
		setStatus("saving");
		try {
			const updated = await skipExercise(workout.id, exercise, reason);
			setWorkout(replaceExercise(workout, updated));
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to skip exercise");
			setStatus("error");
		}
	};

	const toggleChecklist = async (checklistItemId: string, checked: boolean) => {
		setStatus("saving");
		try {
			setWorkout(await updateWorkoutChecklist(workout.id, checklistItemId, checked));
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to update checklist");
			setStatus("error");
		}
	};

	const saveWorkoutNote = async () => {
		setStatus("saving");
		try {
			setWorkout(await updateWorkoutNote(workout.id, workoutNote));
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to save workout note");
			setStatus("error");
		}
	};

	const removeWorkout = async () => {
		setStatus("saving");
		try {
			await deleteWorkout(workout.id);
			setWorkout(null);
			setStatus("ready");
			router.replace("/history" as never);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to delete workout");
			setStatus("error");
		}
	};

	const complete = async () => {
		setStatus("saving");
		try {
			const completed = await completeWorkout(workout.id, workoutNote);
			setWorkout(completed);
			setStatus("ready");
			router.replace("/history" as never);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to complete workout",
			);
			setStatus("error");
		}
	};

	const discard = async () => {
		setStatus("saving");
		try {
			await discardWorkout(workout.id);
			setWorkout(null);
			setStatus("ready");
			router.replace("/");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to discard workout",
			);
			setStatus("error");
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>
				{workout.status === "completed" ? "Completed workout" : "Workout draft"}
			</Text>
			<Text style={styles.description}>
				Started {new Date(workout.startedAt).toLocaleString()}
			</Text>
			<TextInput
				value={workoutNote}
				onChangeText={setWorkoutNote}
				placeholder="Workout note"
				placeholderTextColor={colors.mutedText}
				style={styles.fullInput}
				multiline
			/>
			{status === "saving" ? (
				<ActivityIndicator color={colors.primary} />
			) : null}

			{restTimer ? (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Rest timer</Text>
					<Text style={styles.status}>
						Rest after {restTimer.exerciseName}: {restTimer.remainingSeconds}s
					</Text>
					<Pressable
						style={styles.secondaryButton}
						onPress={() => setRestTimer(null)}
					>
						<Text style={styles.secondaryButtonText}>Skip rest timer</Text>
					</Pressable>
				</View>
			) : null}

			<Checklist
				title="Warmup"
				items={workout.checklist.filter((item) => item.kind === "warmup")}
				onToggle={(item) => void toggleChecklist(item.checklistItemId, !item.checked)}
			/>

			{workout.exercises.map((exercise) => {
				const input = inputs[exercise.id] ?? inputFromExercise(exercise);
				return (
					<View key={exercise.id} style={styles.card}>
						<Text style={styles.cardTitle}>{exercise.plannedExerciseName}</Text>
						<Text style={styles.status}>{exercise.plannedExerciseTarget}</Text>
						<Text style={styles.status}>Status: {exercise.status}</Text>
						{exercise.performedExerciseId &&
						exercise.performedExerciseId !== exercise.originalExerciseId ? (
							<Text style={styles.status}>
								Substitute: {exercise.performedExerciseId}
							</Text>
						) : null}
						{exercise.substitutionNote ? (
							<Text style={styles.status}>{exercise.substitutionNote}</Text>
						) : null}
						{exercise.sets[0] ? (
							<Text style={styles.status}>{formatSet(exercise.sets[0])}</Text>
						) : null}

						<View style={styles.inputRow}>
							<TextInput
								value={input.weightKg}
								onChangeText={(value) =>
									updateInput(exercise.id, { weightKg: value })
								}
								placeholder="kg"
								placeholderTextColor={colors.mutedText}
								keyboardType="decimal-pad"
								style={styles.input}
							/>
							<TextInput
								value={input.reps}
								onChangeText={(value) =>
									updateInput(exercise.id, { reps: value })
								}
								placeholder="reps"
								placeholderTextColor={colors.mutedText}
								keyboardType="number-pad"
								style={styles.input}
							/>
							<TextInput
								value={input.durationSeconds}
								onChangeText={(value) =>
									updateInput(exercise.id, { durationSeconds: value })
								}
								placeholder="sec"
								placeholderTextColor={colors.mutedText}
								keyboardType="number-pad"
								style={styles.input}
							/>
						</View>

						<TextInput
							value={input.note}
							onChangeText={(value) =>
								updateInput(exercise.id, { note: value })
							}
							placeholder="Exercise note"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
							multiline
						/>

						<TextInput
							value={input.performedExerciseId}
							onChangeText={(value) =>
								updateInput(exercise.id, { performedExerciseId: value })
							}
							placeholder="Substitute exercise ID (optional)"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
						/>

						<TextInput
							value={input.substitutionNote}
							onChangeText={(value) =>
								updateInput(exercise.id, { substitutionNote: value })
							}
							placeholder="Substitution note"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
						/>

						<TextInput
							value={input.skipReason}
							onChangeText={(value) =>
								updateInput(exercise.id, { skipReason: value })
							}
							placeholder="Skip reason"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
						/>

						<View style={styles.buttonRow}>
							<Pressable
								style={styles.primaryButton}
								onPress={() => void saveExercise(exercise)}
							>
								<Text style={styles.primaryButtonText}>Save set</Text>
							</Pressable>
							<Pressable
								style={styles.secondaryButtonCompact}
								onPress={() => void skip(exercise)}
							>
								<Text style={styles.secondaryButtonText}>Skip</Text>
							</Pressable>
						</View>
					</View>
				);
			})}

			<Checklist
				title="Cooldown"
				items={workout.checklist.filter((item) => item.kind === "cooldown")}
				onToggle={(item) => void toggleChecklist(item.checklistItemId, !item.checked)}
			/>

			<Pressable style={styles.secondaryButton} onPress={() => void saveWorkoutNote()}>
				<Text style={styles.secondaryButtonText}>Save workout note</Text>
			</Pressable>
			<Pressable style={styles.primaryButton} onPress={() => void complete()}>
				<Text style={styles.primaryButtonText}>Complete workout</Text>
			</Pressable>
			<Pressable style={styles.secondaryButton} onPress={() => void discard()}>
				<Text style={styles.secondaryButtonText}>Discard draft</Text>
			</Pressable>
			{workout.status === "completed" ? (
				<Pressable style={styles.secondaryButton} onPress={() => void removeWorkout()}>
					<Text style={styles.secondaryButtonText}>Delete workout</Text>
				</Pressable>
			) : null}
		</ScrollView>
	);
}

function CenteredSpinner() {
	return (
		<View style={styles.centered}>
			<ActivityIndicator color={colors.primary} />
		</View>
	);
}

function Checklist({
	title,
	items,
	onToggle,
}: {
	title: string;
	items: DraftWorkout["checklist"];
	onToggle?: (item: DraftWorkout["checklist"][number]) => void;
}) {
	if (!items.length) return null;
	return (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{title}</Text>
			{items.map((item) => (
				<Pressable
					key={item.checklistItemId}
					style={styles.checklistRow}
					onPress={() => onToggle?.(item)}
				>
					<Text style={styles.status}>
						{item.checked ? "☑" : "☐"} {item.text}
					</Text>
				</Pressable>
			))}
		</View>
	);
}

const emptyInput: ExerciseInput = {
	weightKg: "",
	reps: "",
	durationSeconds: "",
	note: "",
	skipReason: "",
	performedExerciseId: "",
	substitutionNote: "",
};

function inputFromExercise(exercise: WorkoutExercise): ExerciseInput {
	const firstSet = exercise.sets[0];
	return {
		weightKg: firstSet?.weightKg ? String(firstSet.weightKg) : "",
		reps: firstSet?.reps ? String(firstSet.reps) : "",
		durationSeconds: firstSet?.durationSeconds
			? String(firstSet.durationSeconds)
			: "",
		note: exercise.note ?? "",
		skipReason:
			exercise.status === "skipped" ? (exercise.skipReason ?? "") : "",
		performedExerciseId:
			exercise.performedExerciseId === exercise.originalExerciseId
				? ""
				: (exercise.performedExerciseId ?? ""),
		substitutionNote: exercise.substitutionNote ?? "",
	};
}

function replaceExercise(
	workout: DraftWorkout,
	exercise: WorkoutExercise,
): DraftWorkout {
	return {
		...workout,
		exercises: workout.exercises.map((item) =>
			item.id === exercise.id ? exercise : item,
		),
	};
}

function formatSet(set: WorkoutExercise["sets"][number]) {
	if (set.durationSeconds)
		return `Set ${set.setIndex}: ${set.durationSeconds}s`;
	return `Set ${set.setIndex}: ${set.weightKg ?? "-"} kg × ${set.reps ?? "-"} reps`;
}

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	container: {
		flexGrow: 1,
		gap: spacing.md,
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	title: { color: colors.text, fontSize: 32, fontWeight: "800" },
	description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	checklistRow: { paddingVertical: spacing.xs },
	inputRow: { flexDirection: "row", gap: spacing.sm },
	input: {
		flex: 1,
		minWidth: 72,
		padding: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		color: colors.text,
		backgroundColor: colors.surface,
	},
	fullInput: {
		padding: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		color: colors.text,
		backgroundColor: colors.surface,
	},
	buttonRow: { flexDirection: "row", gap: spacing.sm },
	primaryButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
	},
	primaryButtonText: {
		color: colors.background,
		fontSize: 16,
		fontWeight: "800",
	},
	secondaryButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonCompact: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
		flex: 1,
	},
	secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
