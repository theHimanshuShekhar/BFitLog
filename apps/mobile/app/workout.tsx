import { router, useFocusEffect } from "expo-router";
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
	discardWorkout,
	getDraftWorkout,
	saveExerciseSet,
	skipExercise,
	type DraftWorkout,
	type WorkoutExercise,
} from "@/workouts/workout-api";

type ExerciseInput = {
	weightKg: string;
	reps: string;
	durationSeconds: string;
	note: string;
	skipReason: string;
};

export default function WorkoutScreen() {
	const session = useAuth();
	const [workout, setWorkout] = useState<DraftWorkout | null>(null);
	const [inputs, setInputs] = useState<Record<string, ExerciseInput>>({});
	const [workoutNote, setWorkoutNote] = useState("");
	const [status, setStatus] = useState<
		"loading" | "ready" | "saving" | "error"
	>("loading");
	const [error, setError] = useState<string | null>(null);

	const loadDraft = useCallback(async () => {
		setStatus("loading");
		setError(null);
		try {
			const draft = await getDraftWorkout();
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
	}, []);

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
			const updated = await saveExerciseSet(
				workout.id,
				exercise,
				set,
				input.note,
			);
			setWorkout(replaceExercise(workout, updated));
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to save exercise");
			setStatus("error");
		}
	};

	const skip = async (exercise: WorkoutExercise) => {
		const input = inputs[exercise.id];
		const reason = input?.skipReason.trim() || "Skipped during workout";
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
			<Text style={styles.title}>Workout draft</Text>
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

			<Checklist
				title="Warmup"
				items={workout.checklist.filter((item) => item.kind === "warmup")}
			/>

			{workout.exercises.map((exercise) => {
				const input = inputs[exercise.id] ?? inputFromExercise(exercise);
				return (
					<View key={exercise.id} style={styles.card}>
						<Text style={styles.cardTitle}>{exercise.plannedExerciseName}</Text>
						<Text style={styles.status}>{exercise.plannedExerciseTarget}</Text>
						<Text style={styles.status}>Status: {exercise.status}</Text>
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
							onChangeText={(value) => updateInput(exercise.id, { note: value })}
							placeholder="Exercise note"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
							multiline
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
			/>

			<Pressable style={styles.primaryButton} onPress={() => void complete()}>
				<Text style={styles.primaryButtonText}>Complete workout</Text>
			</Pressable>
			<Pressable style={styles.secondaryButton} onPress={() => void discard()}>
				<Text style={styles.secondaryButtonText}>Discard draft</Text>
			</Pressable>
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
}: {
	title: string;
	items: DraftWorkout["checklist"];
}) {
	if (!items.length) return null;
	return (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{title}</Text>
			{items.map((item) => (
				<Text key={item.checklistItemId} style={styles.status}>
					• {item.text}
				</Text>
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
		skipReason: exercise.status === "skipped" ? (exercise.skipReason ?? "") : "",
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
