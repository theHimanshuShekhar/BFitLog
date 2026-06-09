import type { BodyWeightLog } from "@bfitlog/shared";
import { Link, useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { isDefaultAdminUser } from "@/auth/default-admin-onboarding";
import { useAuth } from "@/auth/use-auth";
import { pullBodyWeightLogsForUser } from "@/body-weight/body-weight-sync-client";
import { getBodyWeightRepository } from "@/body-weight/repository";
import { confirmDestructive } from "@/confirm";
import { formatDateTime, formatKg } from "@/format";
import { colors, layout, radius, spacing } from "@/theme";
import {
	BodyText,
	Card,
	LoadingScreen,
	PageHeader,
	Screen,
	SectionLabel,
	StatusPill,
} from "@/ui/primitives";
import { VisibleUserPicker } from "@/users/VisibleUserPicker";
import { useVisibleUsers } from "@/users/use-visible-users";
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
	const { visibleUsers, selectedUserId, setSelectedUserId } = useVisibleUsers(
		session.data?.user,
	);
	const isOwnUser = !userId || selectedUserId === userId;

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
		const targetUserId = selectedUserId ?? userId;
		setRefreshing(true);
		if (targetUserId === userId) {
			const repository = getBodyWeightRepository(userId);
			setLogs(await repository.listLogs());
			setSyncStatus("Syncing…");
			try {
				await repository.sync();
				setLogs(await repository.listLogs());
				setWorkouts(await listCompletedWorkouts(targetUserId));
				setSyncStatus("Synced");
			} catch {
				setSyncStatus("Offline / sync pending");
			} finally {
				setRefreshing(false);
			}
			return;
		}
		setSyncStatus("Loading partner data…");
		try {
			const [nextLogs, nextWorkouts] = await Promise.all([
				pullBodyWeightLogsForUser(targetUserId),
				listCompletedWorkouts(targetUserId),
			]);
			setLogs(nextLogs);
			setWorkouts(nextWorkouts);
			setSyncStatus("Loaded partner data");
		} catch {
			setSyncStatus("Unable to load partner data");
		} finally {
			setRefreshing(false);
		}
	}, [selectedUserId, userId]);

	useFocusEffect(
		useCallback(() => {
			if (session.isPending || !session.data) return;
			if (isDefaultAdminUser(session.data.user)) return;
			void load();
		}, [load, session.data, session.isPending]),
	);

	if (session.isPending) {
		return <LoadingScreen />;
	}

	if (!session.data) {
		router.replace("/login");
		return null;
	}

	return (
		<Screen
			style={styles.container}
			refreshControl={
				<RefreshControl
					tintColor={colors.primary}
					refreshing={refreshing}
					onRefresh={() => void load()}
				/>
			}
		>
			<PageHeader
				eyebrow="Timeline"
				title="History"
				description={`Completed workouts and body-weight logs for ${
					visibleUsers.find((user) => user.id === selectedUserId)?.name ??
					session.data.user.name
				}.`}
				aside={
					<StatusPill
						label={syncStatus}
						tone={
							syncStatus.includes("Synced")
								? "success"
								: syncStatus.includes("Offline") ||
										syncStatus.includes("Unable")
									? "warning"
									: "info"
						}
					/>
				}
			/>
			<VisibleUserPicker
				users={visibleUsers}
				selectedUserId={selectedUserId ?? session.data.user.id}
				onSelect={setSelectedUserId}
			/>

			<Pressable
				accessibilityRole="button"
				style={styles.secondaryButton}
				onPress={() => void load()}
			>
				<Text style={styles.secondaryButtonText}>Refresh</Text>
			</Pressable>

			<SectionLabel>Workouts</SectionLabel>
			{workouts.length === 0 ? (
				<Card
					title="No completed workouts yet"
					subtitle="Complete a workout draft to see it here."
				/>
			) : (
				workouts.map((workout) => (
					<Card key={workout.id}>
						<Text style={styles.cardTitle}>
							Day {workout.trainingDay.sequence}: {workout.trainingDay.title}
						</Text>
						<Text style={styles.status}>
							{formatDateTime(workout.completedAt ?? workout.startedAt)}
						</Text>
						{workout.note ? (
							<BodyText muted>{workout.note}</BodyText>
						) : null}
						<Link href={`/workout?workoutId=${workout.id}` as never} asChild>
							<Pressable
								accessibilityRole="link"
								style={styles.secondaryButtonCompact}
							>
								<Text style={styles.secondaryButtonText}>View details</Text>
							</Pressable>
						</Link>
					</Card>
				))
			)}

			<SectionLabel>Body weight</SectionLabel>
			{logs.length === 0 ? (
				<Card title="No entries yet" subtitle="Add body weight from Home to see it here." />
			) : (
				logs.map((log) => (
					<Card key={log.id}>
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
									<BodyText muted>{log.note}</BodyText>
								) : null}
								{isOwnUser ? (
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
								) : null}
							</>
						)}
					</Card>
				))
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingBottom: layout.bottomTabBarInset,
	},
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	cardTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: radius.md,
		padding: spacing.md,
		backgroundColor: colors.surfaceRaised,
	},
	buttonRow: { flexDirection: "row", gap: spacing.sm },
	dangerButton: {
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	dangerButtonText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	dangerButtonCompact: {
		flex: 1,
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	secondaryButton: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceRaised,
	},
	secondaryButtonCompact: {
		flex: 1,
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceRaised,
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
});
