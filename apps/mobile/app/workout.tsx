import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { confirmDestructive } from "@/confirm";
import { formatDateTime, formatKg, formatSeconds } from "@/format";
import {
	getWorkoutDetailActions,
	getWorkoutDetailTitle,
} from "@/workouts/workout-actions";
import {
	addWorkoutSetInput,
	buildWorkoutSetPayload,
	emptyWorkoutSetInput,
	removeWorkoutSetInput,
	workoutSetInputsFromSavedSets,
	type WorkoutSetInput,
} from "@/workouts/workout-set-inputs";
import { formatWorkoutSubstituteLabel } from "@/workouts/workout-substitutes";
import {
	pauseRestTimer,
	resumeRestTimer,
	tickRestTimer,
	type RestTimerState,
} from "@/workouts/rest-timer";
import { colors, layout, radius, spacing } from "@/theme";
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
	sets: WorkoutSetInput[];
	note: string;
	goodForm: boolean;
	skipReason: string;
	performedExerciseId: string;
	substitutionNote: string;
};
type RestTimer = RestTimerState | null;


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

	useEffect(() => {
		if (!restTimer || restTimer.paused) return undefined;
		const interval = setInterval(() => {
			setRestTimer((current) => tickRestTimer(current));
		}, 1000);
		return () => clearInterval(interval);
	}, [restTimer]);

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
					accessibilityRole="button"
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

	const actions = getWorkoutDetailActions(workout.status);
	const updateInput = (exerciseId: string, patch: Partial<ExerciseInput>) => {
		setInputs((current) => ({
			...current,
			[exerciseId]: { ...emptyInput, ...current[exerciseId], ...patch },
		}));
	};

	const updateSetInput = (
		exerciseId: string,
		setIndex: number,
		patch: Partial<WorkoutSetInput>,
	) => {
		setInputs((current) => {
			const input = { ...emptyInput, ...current[exerciseId] };
			return {
				...current,
				[exerciseId]: {
					...input,
					sets: input.sets.map((set, index) =>
						index === setIndex ? { ...set, ...patch } : set,
					),
				},
			};
		});
	};

	const addSetInput = (exerciseId: string) => {
		setInputs((current) => {
			const input = { ...emptyInput, ...current[exerciseId] };
			return {
				...current,
				[exerciseId]: { ...input, sets: addWorkoutSetInput(input.sets) },
			};
		});
	};

	const removeSetInput = (exerciseId: string, setIndex: number) => {
		setInputs((current) => {
			const input = { ...emptyInput, ...current[exerciseId] };
			return {
				...current,
				[exerciseId]: {
					...input,
					sets: removeWorkoutSetInput(input.sets, setIndex),
				},
			};
		});
	};

	const saveExercise = async (exercise: WorkoutExercise) => {
		const input = inputs[exercise.id];
		if (!input) return;
		setStatus("saving");
		try {
			const sets = buildWorkoutSetPayload(input.sets);
			const updated = await saveExerciseSet(workout.id, exercise, sets, {
				goodForm: input.goodForm,
				note: input.note,
				performedExerciseId: input.performedExerciseId,
				substitutionNote: input.substitutionNote,
			});
			setWorkout(replaceExercise(workout, updated));
			setRestTimer({
				exerciseName: exercise.plannedExerciseName,
				remainingSeconds: exercise.restSeconds ?? 90,
				paused: false,
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
			setWorkout(
				await updateWorkoutChecklist(workout.id, checklistItemId, checked),
			);
			setStatus("ready");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to update checklist",
			);
			setStatus("error");
		}
	};

	const saveWorkoutNote = async () => {
		setStatus("saving");
		try {
			setWorkout(await updateWorkoutNote(workout.id, workoutNote));
			setStatus("ready");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to save workout note",
			);
			setStatus("error");
		}
	};

	const removeWorkout = async () => {
		if (!(await confirmDestructive("Delete this workout?"))) return;
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
		if (!(await confirmDestructive("Discard this draft workout?", "Discard"))) return;
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
			<Text style={styles.title}>{getWorkoutDetailTitle(workout.status)}</Text>
			<Text style={styles.description}>
				Started {formatDateTime(workout.startedAt)}
			</Text>
			{workout.completedAt ? (
				<Text style={styles.description}>
					Completed {formatDateTime(workout.completedAt)}
				</Text>
			) : null}
			<TextInput
				accessibilityLabel="Workout note"
				value={workoutNote}
				onChangeText={setWorkoutNote}
				placeholder="Workout note…"
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
						Rest after {restTimer.exerciseName}:{" "}
						{formatSeconds(restTimer.remainingSeconds)}
					</Text>
					<Pressable
						accessibilityRole="button"
						style={styles.secondaryButton}
						onPress={() =>
							setRestTimer((current) =>
								current?.paused
									? resumeRestTimer(current)
									: pauseRestTimer(current),
							)
						}
					>
						<Text style={styles.secondaryButtonText}>
							{restTimer.paused ? "Resume rest timer" : "Pause rest timer"}
						</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
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
				onToggle={(item) =>
					void toggleChecklist(item.checklistItemId, !item.checked)
				}
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
						{exercise.substitutes.length ? (
							<View style={styles.substituteBox}>
								<Text style={styles.status}>Preferred substitutes</Text>
								{exercise.substitutes.map((substitute) => (
									<Pressable
										key={substitute.exercise?.id ?? substitute.notes ?? "substitute"}
										accessibilityRole="button"
										style={styles.secondaryButtonCompact}
										onPress={() =>
											updateInput(exercise.id, {
												performedExerciseId: substitute.exercise?.id ?? "",
												substitutionNote: substitute.notes ?? "",
											})
										}
									>
										<Text style={styles.secondaryButtonText}>
											{formatWorkoutSubstituteLabel(substitute)}
										</Text>
									</Pressable>
								))}
							</View>
						) : null}
						{input.sets.map((setInput, setInputIndex) => (
							<View key={setInput.setIndex} style={styles.setCard}>
								<Text style={styles.status}>Set {setInputIndex + 1}</Text>
								<View style={styles.inputRow}>
									<TextInput
										accessibilityLabel={`Set ${setInputIndex + 1} weight in kilograms`}
										value={setInput.weightKg}
										onChangeText={(value) =>
											updateSetInput(exercise.id, setInputIndex, {
												weightKg: value,
											})
										}
										placeholder="e.g. 80.0…"
										placeholderTextColor={colors.mutedText}
										inputMode="decimal"
										keyboardType="decimal-pad"
										style={styles.input}
									/>
									<TextInput
										accessibilityLabel={`Set ${setInputIndex + 1} reps`}
										value={setInput.reps}
										onChangeText={(value) =>
											updateSetInput(exercise.id, setInputIndex, { reps: value })
										}
										placeholder="e.g. 8…"
										placeholderTextColor={colors.mutedText}
										inputMode="numeric"
										keyboardType="number-pad"
										style={styles.input}
									/>
									<TextInput
										accessibilityLabel={`Set ${setInputIndex + 1} duration in seconds`}
										value={setInput.durationSeconds}
										onChangeText={(value) =>
											updateSetInput(exercise.id, setInputIndex, {
												durationSeconds: value,
											})
										}
										placeholder="e.g. 60…"
										placeholderTextColor={colors.mutedText}
										inputMode="numeric"
										keyboardType="number-pad"
										style={styles.input}
									/>
								</View>
								<Pressable
									accessibilityRole="button"
									style={styles.secondaryButtonCompact}
									onPress={() => removeSetInput(exercise.id, setInputIndex)}
								>
									<Text style={styles.secondaryButtonText}>Remove set</Text>
								</Pressable>
							</View>
						))}

						<Pressable
							accessibilityRole="button"
							style={styles.secondaryButtonCompact}
							onPress={() => addSetInput(exercise.id)}
						>
							<Text style={styles.secondaryButtonText}>Add set</Text>
						</Pressable>

						<Pressable
							accessibilityRole="checkbox"
							accessibilityState={{ checked: input.goodForm }}
							style={styles.secondaryButtonCompact}
							onPress={() =>
								updateInput(exercise.id, { goodForm: !input.goodForm })
							}
						>
							<Text style={styles.secondaryButtonText}>
								{input.goodForm ? "Good form ✓" : "Mark good form"}
							</Text>
						</Pressable>

						<TextInput
							accessibilityLabel="Exercise note"
							value={input.note}
							onChangeText={(value) =>
								updateInput(exercise.id, { note: value })
							}
							placeholder="e.g. Smooth tempo…"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
							multiline
						/>

						<TextInput
							accessibilityLabel="Substitute exercise id"
							value={input.performedExerciseId}
							onChangeText={(value) =>
								updateInput(exercise.id, { performedExerciseId: value })
							}
							placeholder="e.g. exercise-id…"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
							autoCorrect={false}
						/>

						<TextInput
							accessibilityLabel="Substitution note"
							value={input.substitutionNote}
							onChangeText={(value) =>
								updateInput(exercise.id, { substitutionNote: value })
							}
							placeholder="Substitution note…"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
						/>

						<TextInput
							accessibilityLabel="Skip reason"
							value={input.skipReason}
							onChangeText={(value) =>
								updateInput(exercise.id, { skipReason: value })
							}
							placeholder="Skip reason…"
							placeholderTextColor={colors.mutedText}
							style={styles.fullInput}
						/>

						<View style={styles.buttonRow}>
							<Pressable
								accessibilityRole="button"
								style={styles.primaryButton}
								onPress={() => void saveExercise(exercise)}
							>
								<Text style={styles.primaryButtonText}>Save set</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
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
				onToggle={(item) =>
					void toggleChecklist(item.checklistItemId, !item.checked)
				}
			/>

			{actions.includes("save-note") ? (
				<Pressable
					accessibilityRole="button"
					style={styles.secondaryButton}
					onPress={() => void saveWorkoutNote()}
				>
					<Text style={styles.secondaryButtonText}>Save workout note</Text>
				</Pressable>
			) : null}
			{actions.includes("complete") ? (
				<Pressable
					accessibilityRole="button"
					style={styles.primaryButton}
					onPress={() => void complete()}
				>
					<Text style={styles.primaryButtonText}>Complete workout</Text>
				</Pressable>
			) : null}
			{actions.includes("discard") ? (
				<Pressable
					accessibilityRole="button"
					style={styles.secondaryButton}
					onPress={() => void discard()}
				>
					<Text style={styles.secondaryButtonText}>Discard draft</Text>
				</Pressable>
			) : null}
			{actions.includes("delete") ? (
				<Pressable
					accessibilityRole="button"
					style={styles.secondaryButton}
					onPress={() => void removeWorkout()}
				>
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
					accessibilityRole="button"
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
	sets: [{ ...emptyWorkoutSetInput }],
	goodForm: false,
	note: "",
	skipReason: "",
	performedExerciseId: "",
	substitutionNote: "",
};

function inputFromExercise(exercise: WorkoutExercise): ExerciseInput {
	return {
		sets: workoutSetInputsFromSavedSets(exercise.sets),
		goodForm: exercise.goodForm ?? false,
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
		return `Set ${set.setIndex}: ${formatSeconds(set.durationSeconds)}`;
	return `Set ${set.setIndex}: ${set.weightKg == null ? "-" : formatKg(set.weightKg)} × ${set.reps ?? "-"} reps`;
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
		width: "100%",
		maxWidth: layout.maxContentWidth,
		alignSelf: "center",
		gap: spacing.lg,
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	title: {
		color: colors.text,
		fontSize: 38,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: -1.2,
	},
	description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
	card: {
		gap: spacing.md,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		backgroundColor: colors.card,
		boxShadow: `0px 12px 24px ${colors.glow}`,
	},
	cardTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	checklistRow: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		paddingVertical: spacing.xs,
	},
	setCard: {
		gap: spacing.sm,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		backgroundColor: colors.cardMuted,
	},
	substituteBox: { gap: spacing.xs },
	inputRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
	input: {
		flex: 1,
		minWidth: 72,
		padding: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		color: colors.text,
		backgroundColor: colors.surfaceRaised,
	},
	fullInput: {
		padding: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		color: colors.text,
		backgroundColor: colors.surfaceRaised,
	},
	buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
	primaryButton: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.primary,
		boxShadow: `0px 8px 24px ${colors.glow}`,
	},
	primaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	secondaryButton: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceRaised,
	},
	secondaryButtonCompact: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceRaised,
		flex: 1,
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
});
