import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
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
import { getBodyWeightRepository } from "@/body-weight/repository";
import { colors, layout, spacing } from "@/theme";
import { getWorkoutStats, type WorkoutStats } from "@/workouts/workout-api";

const ranges: ChartRange[] = ["30d", "90d", "1y", "all"];

export default function StatsScreen() {
	const session = useAuth();
	const [range, setRange] = useState<ChartRange>("30d");
	const [goal, setGoal] = useState<BodyWeightGoal | null>(null);
	const [logs, setLogs] = useState<BodyWeightLog[]>([]);
	const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);

	useFocusEffect(
		useCallback(() => {
			if (session.isPending || !session.data) return undefined;
			if (isDefaultAdminUser(session.data.user)) return undefined;

			let active = true;
			const repository = getBodyWeightRepository();
			repository
				.sync()
				.catch(() => undefined)
				.finally(() => {
					Promise.all([
						repository.getGoal(),
						repository.listLogs(),
						getWorkoutStats().catch(() => null),
					]).then(([nextGoal, nextLogs, nextWorkoutStats]) => {
						if (!active) return;
						setGoal(nextGoal);
						setLogs(nextLogs);
						setWorkoutStats(nextWorkoutStats);
					});
				});
			return () => {
				active = false;
			};
		}, [session.data, session.isPending]),
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
			<Text style={styles.title}>Stats</Text>
			<Text style={styles.description}>
				Body weight trend for {session.data.user.name}
			</Text>

			<View style={styles.rangeRow}>
				{ranges.map((item) => (
					<Pressable
						key={item}
						style={[
							styles.rangeButton,
							range === item && styles.rangeButtonActive,
						]}
						onPress={() => setRange(item)}
					>
						<Text
							style={[
								styles.rangeText,
								range === item && styles.rangeTextActive,
							]}
						>
							{item}
						</Text>
					</Pressable>
				))}
			</View>

			<BodyWeightChart logs={logs} goal={goal} range={range} />

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Exercise progress</Text>
				{workoutStats?.exercises.length ? (
					workoutStats.exercises.map((exercise) => (
						<View key={exercise.exerciseId} style={styles.statRow}>
							<Text style={styles.status}>{exercise.exerciseName}</Text>
							<Text style={styles.description}>
								Best: {exercise.bestWeightKg ?? "—"} kg · Volume:{" "}
								{Math.round(exercise.volumeKg)} kg
								{exercise.bestDurationSeconds
									? ` · Duration: ${exercise.bestDurationSeconds}s`
									: ""}
							</Text>
							{exercise.progressionHint ? (
								<Text style={styles.hint}>{exercise.progressionHint}</Text>
							) : null}
						</View>
					))
				) : (
					<Text style={styles.description}>
						Complete workouts to see exercise stats.
					</Text>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Workout consistency</Text>
				{workoutStats?.consistency.length ? (
					workoutStats.consistency.map((week) => (
						<Text key={week.week} style={styles.status}>
							Week of {week.week}: {week.count} workout
							{week.count === 1 ? "" : "s"}
						</Text>
					))
				) : (
					<Text style={styles.description}>No completed workouts yet.</Text>
				)}
			</View>

			<Pressable
				style={styles.secondaryButton}
				onPress={() => router.push("/")}
			>
				<Text style={styles.secondaryButtonText}>Back home</Text>
			</Pressable>
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
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	rangeRow: { flexDirection: "row", gap: spacing.sm },
	rangeButton: {
		flex: 1,
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
	statRow: { gap: spacing.xs },
	hint: { color: colors.primary, fontSize: 14, lineHeight: 20 },
	rangeButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	rangeText: { color: colors.mutedText, fontWeight: "700" },
	rangeTextActive: { color: colors.background },
	secondaryButton: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
