import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";
import { Link, useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { isDefaultAdminUser } from "@/auth/default-admin-onboarding";
import { useAuth } from "@/auth/use-auth";
import {
	BodyWeightChart,
	type ChartRange,
} from "@/body-weight/BodyWeightChart";
import {
	pullBodyWeightGoalForUser,
	pullBodyWeightLogsForUser,
} from "@/body-weight/body-weight-sync-client";
import { getBodyWeightRepository } from "@/body-weight/repository";
import { formatKg, integerFormatter } from "@/format";
import { colors, layout, radius, spacing } from "@/theme";
import {
	BodyText,
	Card,
	LoadingScreen,
	PageHeader,
	Screen,
	SectionLabel,
	SegmentedControl,
} from "@/ui/primitives";
import { VisibleUserPicker } from "@/users/VisibleUserPicker";
import { useVisibleUsers } from "@/users/use-visible-users";
import { blurActiveElement } from "@/web-focus";
import { getWorkoutStats, type WorkoutStats } from "@/workouts/workout-api";

const ranges: ChartRange[] = ["30d", "90d", "1y", "all"];

export default function StatsScreen() {
	const session = useAuth();
	const [range, setRange] = useState<ChartRange>("30d");
	const [goal, setGoal] = useState<BodyWeightGoal | null>(null);
	const [logs, setLogs] = useState<BodyWeightLog[]>([]);
	const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
	const { visibleUsers, selectedUserId, setSelectedUserId } = useVisibleUsers(
		session.data?.user,
	);

	useFocusEffect(
		useCallback(() => {
			if (session.isPending || !session.data) return undefined;
			if (isDefaultAdminUser(session.data.user)) return undefined;

			let active = true;
			const ownUserId = session.data.user.id;
			const targetUserId = selectedUserId ?? ownUserId;
			if (targetUserId === ownUserId) {
				const repository = getBodyWeightRepository(ownUserId);
				repository
					.sync()
					.catch(() => undefined)
					.finally(() => {
						Promise.all([
							repository.getGoal(),
							repository.listLogs(),
							getWorkoutStats(targetUserId).catch(() => null),
						]).then(([nextGoal, nextLogs, nextWorkoutStats]) => {
							if (!active) return;
							setGoal(nextGoal);
							setLogs(nextLogs);
							setWorkoutStats(nextWorkoutStats);
						});
					});
			} else {
				Promise.all([
					pullBodyWeightGoalForUser(targetUserId),
					pullBodyWeightLogsForUser(targetUserId),
					getWorkoutStats(targetUserId).catch(() => null),
				]).then(([nextGoal, nextLogs, nextWorkoutStats]) => {
					if (!active) return;
					setGoal(nextGoal);
					setLogs(nextLogs);
					setWorkoutStats(nextWorkoutStats);
				});
			}
			return () => {
				active = false;
			};
		}, [selectedUserId, session.data, session.isPending]),
	);

	if (session.isPending) {
		return <LoadingScreen />;
	}

	if (!session.data) {
		router.replace("/login");
		return null;
	}

	return (
		<Screen>
			<PageHeader
				eyebrow="Progress"
				title="Stats"
				description={`Body weight, exercise progress, and consistency for ${
					visibleUsers.find((user) => user.id === selectedUserId)?.name ??
					session.data.user.name
				}.`}
			/>
			<VisibleUserPicker
				users={visibleUsers}
				selectedUserId={selectedUserId ?? session.data.user.id}
				onSelect={setSelectedUserId}
			/>

			<SegmentedControl items={ranges} value={range} onChange={setRange} />

			<BodyWeightChart logs={logs} goal={goal} range={range} />

			<Card title="Exercise progress">
				{workoutStats?.exercises.length ? (
					workoutStats.exercises.map((exercise) => (
						<View key={exercise.exerciseId} style={styles.statRow}>
							<Text style={styles.statTitle}>{exercise.exerciseName}</Text>
							<BodyText muted>
								Best:{" "}
								{exercise.bestWeightKg === null
									? "—"
									: formatKg(exercise.bestWeightKg)}{" "}
								· Volume: {formatKg(Math.round(exercise.volumeKg))}
								{exercise.bestDurationSeconds
									? ` · Duration: ${integerFormatter.format(exercise.bestDurationSeconds)} sec`
									: ""}
							</BodyText>
							{exercise.progressionHint ? (
								<Text style={styles.hint}>{exercise.progressionHint}</Text>
							) : null}
						</View>
					))
				) : (
					<BodyText muted>Complete workouts to see exercise stats.</BodyText>
				)}
			</Card>

			<Card title="Workout consistency">
				{workoutStats?.consistency.length ? (
					workoutStats.consistency.map((week) => (
						<Text key={week.week} style={styles.consistencyRow}>
							Week of {week.week}: {week.count} workout
							{week.count === 1 ? "" : "s"}
						</Text>
					))
				) : (
					<BodyText muted>No completed workouts yet.</BodyText>
				)}
			</Card>

			<SectionLabel>Navigation</SectionLabel>
			<Link href="/" asChild>
				<Pressable
					accessibilityRole="link"
					style={styles.secondaryButton}
					onPress={blurActiveElement}
				>
					<Text style={styles.secondaryButtonText}>Back home</Text>
				</Pressable>
			</Link>
		</Screen>
	);
}

const styles = StyleSheet.create({
	statRow: {
		gap: spacing.xs,
		paddingVertical: spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	statTitle: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	hint: {
		color: colors.text,
		fontSize: 14,
		fontWeight: "800",
		lineHeight: 20,
		backgroundColor: colors.primarySoft,
		padding: spacing.sm,
	},
	consistencyRow: { color: colors.mutedText, fontSize: 14, lineHeight: 22 },
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
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
});
