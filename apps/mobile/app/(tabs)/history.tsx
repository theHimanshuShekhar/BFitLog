import type { BodyWeightLog } from "@bfitlog/shared";
import { Link, useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { isDefaultAdminUser } from "@/auth/default-admin-onboarding";
import { useAuth } from "@/auth/use-auth";
import { getBodyWeightRepository } from "@/body-weight/repository";
import { confirmDestructive } from "@/confirm";
import { formatDateTime, formatKg } from "@/format";
import { colors, layout, spacing } from "@/theme";
import {
	listCompletedWorkouts,
	type WorkoutHistoryItem,
} from "@/workouts/workout-api";


export default function HistoryScreen() {
	const session = useAuth();
	const [logs, setLogs] = useState<BodyWeightLog[]>([]);
	const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
	const [syncStatus, setSyncStatus] = useState("Loaded locally");
	const [refreshing, setRefreshing] = useState(false);
	const [editingLogId, setEditingLogId] = useState<string | null>(null);
	const [editWeightKg, setEditWeightKg] = useState("");
	const [editNote, setEditNote] = useState("");
	const userId = session.data?.user.id;

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
		if (!userId) return;
		const repository = getBodyWeightRepository(userId);
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
		if (!(await confirmDestructive("Delete this body weight log?"))) return;
		const now = new Date().toISOString();
		if (!userId) return;
		const repository = getBodyWeightRepository(userId);
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
		if (!userId) return;
		const repository = getBodyWeightRepository(userId);
		setRefreshing(true);
		setLogs(await repository.listLogs());
		setSyncStatus("Syncing…");
		try {
			await repository.sync();
			setLogs(await repository.listLogs());
			setWorkouts(await listCompletedWorkouts());
			setSyncStatus("Synced");
		} catch {
			setSyncStatus("Offline / sync pending");
		} finally {
			setRefreshing(false);
		}
	}, [userId]);

	useFocusEffect(
		useCallback(() => {
			if (session.isPending || !session.data) return;
			if (isDefaultAdminUser(session.data.user)) return;
			void load();
		}, [load, session.data, session.isPending]),
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
		<ScrollView
			contentContainerStyle={styles.container}
			refreshControl={
				<RefreshControl
					tintColor={colors.primary}
					refreshing={refreshing}
					onRefresh={() => void load()}
				/>
			}
		>
			<Text style={styles.title}>History</Text>
			<Text style={styles.description}>
				Body weight logs for {session.data.user.name}
			</Text>
			<Text style={styles.status}>{syncStatus}</Text>

			<Pressable
				accessibilityRole="button"
				style={styles.secondaryButton}
				onPress={() => void load()}
			>
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
							{formatDateTime(workout.completedAt ?? workout.startedAt)}
						</Text>
						{workout.note ? (
							<Text style={styles.description}>{workout.note}</Text>
						) : null}
						<Link href={`/workout?workoutId=${workout.id}` as never} asChild>
							<Pressable
								accessibilityRole="link"
								style={styles.secondaryButtonCompact}
							>
								<Text style={styles.secondaryButtonText}>View details</Text>
							</Pressable>
						</Link>
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
									accessibilityLabel="Body weight in kilograms"
									style={styles.input}
									inputMode="decimal"
									keyboardType="decimal-pad"
									placeholder="e.g. 90.0…"
									placeholderTextColor={colors.mutedText}
									value={editWeightKg}
									onChangeText={setEditWeightKg}
								/>
								<TextInput
									accessibilityLabel="Body weight note"
									style={styles.input}
									placeholder="e.g. Felt strong…"
									placeholderTextColor={colors.mutedText}
									value={editNote}
									onChangeText={setEditNote}
								/>
								<View style={styles.buttonRow}>
									<Pressable
										accessibilityRole="button"
										style={styles.secondaryButtonCompact}
										onPress={() => void saveBodyWeightLog(log)}
									>
										<Text style={styles.secondaryButtonText}>Save</Text>
									</Pressable>
									<Pressable
										accessibilityRole="button"
										style={styles.secondaryButtonCompact}
										onPress={() => setEditingLogId(null)}
									>
										<Text style={styles.secondaryButtonText}>Cancel</Text>
									</Pressable>
								</View>
							</>
						) : (
							<>
								<Text style={styles.cardTitle}>{formatKg(log.weightKg)}</Text>
								<Text style={styles.status}>
									{formatDateTime(log.measuredAt)}
								</Text>
								{log.note ? (
									<Text style={styles.description}>{log.note}</Text>
								) : null}
								<View style={styles.buttonRow}>
									<Pressable
										accessibilityRole="button"
										style={styles.secondaryButtonCompact}
										onPress={() => startEdit(log)}
									>
										<Text style={styles.secondaryButtonText}>Edit</Text>
									</Pressable>
									<Pressable
										accessibilityRole="button"
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
		width: "100%",
		maxWidth: layout.maxContentWidth,
		alignSelf: "center",
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
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	secondaryButton: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonCompact: {
		flex: 1,
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
