import type { BodyWeightLog } from "@bfitlog/shared";
import { useFocusEffect, router } from "expo-router";
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
import { getBodyWeightRepository } from "@/body-weight/repository";
import { colors, spacing } from "@/theme";
import {
	listCompletedWorkouts,
	type WorkoutHistoryItem,
} from "@/workouts/workout-api";

export default function HistoryScreen() {
	const session = useAuth();
	const [logs, setLogs] = useState<BodyWeightLog[]>([]);
	const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
	const [syncStatus, setSyncStatus] = useState("Loaded locally");
	const [editingLogId, setEditingLogId] = useState<string | null>(null);
	const [editWeightKg, setEditWeightKg] = useState("");
	const [editNote, setEditNote] = useState("");

	const startEdit = (log: BodyWeightLog) => {
		setEditingLogId(log.id);
		setEditWeightKg(String(log.weightKg));
		setEditNote(log.note ?? "");
	};

	const saveBodyWeightLog = async (log: BodyWeightLog) => {
		const weightKg = Number(editWeightKg);
		if (!Number.isFinite(weightKg) || weightKg <= 0) {
			setSyncStatus("Enter a valid body weight in kg.");
			return;
		}
		const repository = getBodyWeightRepository();
		await repository.saveLog({
			...log,
			weightKg: Math.round(weightKg * 10) / 10,
			note: editNote.trim() || undefined,
			updatedAt: new Date().toISOString(),
		});
		setEditingLogId(null);
		setLogs(await repository.listLogs());
		setSyncStatus("Syncing…");
		try {
			await repository.sync();
			setLogs(await repository.listLogs());
			setSyncStatus("Synced");
		} catch {
			setSyncStatus("Offline / sync pending");
		}
	};

	const deleteBodyWeightLog = async (logId: string) => {
		const now = new Date().toISOString();
		const repository = getBodyWeightRepository();
		await repository.deleteLog(logId, now);
		setLogs(await repository.listLogs());
		setSyncStatus("Syncing…");
		try {
			await repository.sync();
			setLogs(await repository.listLogs());
			setSyncStatus("Synced");
		} catch {
			setSyncStatus("Offline / sync pending");
		}
	};

	const load = useCallback(async () => {
		const repository = getBodyWeightRepository();
		setLogs(await repository.listLogs());
		setSyncStatus("Syncing…");
		try {
			await repository.sync();
			setLogs(await repository.listLogs());
			setWorkouts(await listCompletedWorkouts());
			setSyncStatus("Synced");
		} catch {
			setSyncStatus("Offline / sync pending");
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (session.isPending) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color={colors.primary} />
			</View>
		);
	}

	if (!session.data) {
		router.replace("/login");
		return null;
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>History</Text>
			<Text style={styles.description}>
				Body weight logs for {session.data.user.name}
			</Text>
			<Text style={styles.status}>{syncStatus}</Text>

			<Pressable style={styles.secondaryButton} onPress={() => void load()}>
				<Text style={styles.secondaryButtonText}>Refresh</Text>
			</Pressable>

			<Text style={styles.sectionTitle}>Workouts</Text>
			{workouts.length === 0 ? (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>No completed workouts yet</Text>
					<Text style={styles.description}>
						Complete a workout draft to see it here.
					</Text>
				</View>
			) : (
				workouts.map((workout) => (
					<View key={workout.id} style={styles.card}>
						<Text style={styles.cardTitle}>
							Day {workout.trainingDay.sequence}: {workout.trainingDay.title}
						</Text>
						<Text style={styles.status}>
							{workout.completedAt
								? new Date(workout.completedAt).toLocaleString()
								: new Date(workout.startedAt).toLocaleString()}
						</Text>
						{workout.note ? (
							<Text style={styles.description}>{workout.note}</Text>
						) : null}
					</View>
				))
			)}

			<Text style={styles.sectionTitle}>Body weight</Text>
			{logs.length === 0 ? (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>No entries yet</Text>
					<Text style={styles.description}>
						Add body weight from Home to see it here.
					</Text>
				</View>
			) : (
				logs.map((log) => (
					<View key={log.id} style={styles.card}>
						{editingLogId === log.id ? (
							<>
								<TextInput
									style={styles.input}
									keyboardType="decimal-pad"
									placeholder="kg"
									placeholderTextColor={colors.mutedText}
									value={editWeightKg}
									onChangeText={setEditWeightKg}
								/>
								<TextInput
									style={styles.input}
									placeholder="Note"
									placeholderTextColor={colors.mutedText}
									value={editNote}
									onChangeText={setEditNote}
								/>
								<View style={styles.buttonRow}>
									<Pressable
										style={styles.secondaryButtonCompact}
										onPress={() => void saveBodyWeightLog(log)}
									>
										<Text style={styles.secondaryButtonText}>Save</Text>
									</Pressable>
									<Pressable
										style={styles.secondaryButtonCompact}
										onPress={() => setEditingLogId(null)}
									>
										<Text style={styles.secondaryButtonText}>Cancel</Text>
									</Pressable>
								</View>
							</>
						) : (
							<>
								<Text style={styles.cardTitle}>{log.weightKg.toFixed(1)} kg</Text>
								<Text style={styles.status}>
									{new Date(log.measuredAt).toLocaleString()}
								</Text>
								{log.note ? (
									<Text style={styles.description}>{log.note}</Text>
								) : null}
								<View style={styles.buttonRow}>
									<Pressable
										style={styles.secondaryButtonCompact}
										onPress={() => startEdit(log)}
									>
										<Text style={styles.secondaryButtonText}>Edit</Text>
									</Pressable>
									<Pressable
										style={styles.dangerButtonCompact}
										onPress={() => void deleteBodyWeightLog(log.id)}
									>
										<Text style={styles.dangerButtonText}>Delete</Text>
									</Pressable>
								</View>
							</>
						)}
					</View>
				))
			)}
		</ScrollView>
	);
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
	title: { color: colors.text, fontSize: 28, fontWeight: "800" },
	description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
	status: { color: colors.mutedText, fontSize: 14 },
	card: {
		gap: spacing.xs,
		padding: spacing.md,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	sectionTitle: {
		color: colors.primary,
		fontSize: 18,
		fontWeight: "800",
		marginTop: spacing.sm,
	},
	cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 12,
		padding: spacing.md,
		backgroundColor: colors.surface,
	},
	buttonRow: { flexDirection: "row", gap: spacing.sm },
	dangerButton: {
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	dangerButtonText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
	dangerButtonCompact: {
		flex: 1,
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	secondaryButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonCompact: {
		flex: 1,
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
