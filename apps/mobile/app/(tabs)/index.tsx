import type { BodyWeightLog } from "@bfitlog/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { apiGet } from "@/api/client";
import { useAuth } from "@/auth/use-auth";
import { AddBodyWeightLogForm } from "@/body-weight/AddBodyWeightLogForm";
import { getBodyWeightRepository } from "@/body-weight/repository";
import { colors, spacing } from "@/theme";
import {
	getDraftWorkout,
	getNextTrainingDay,
	startDraftWorkout,
} from "@/workouts/workout-api";

type HealthResponse = { ok: boolean };
type SetupStatusResponse = { setupRequired: boolean };

export default function HomeScreen() {
	const session = useAuth();
	const [status, setStatus] = useState<"checking" | "online" | "offline">(
		"checking",
	);
	const [setupChecked, setSetupChecked] = useState(false);
	const [latestLog, setLatestLog] = useState<BodyWeightLog | null>(null);
	const [workoutStatus, setWorkoutStatus] = useState<
		"idle" | "loading" | "error"
	>("idle");
	const [workoutCta, setWorkoutCta] = useState("Start next workout");
	const [nextWorkoutLabel, setNextWorkoutLabel] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		apiGet<HealthResponse>("/health")
			.then(() => {
				if (active) setStatus("online");
			})
			.catch(() => {
				if (active) setStatus("offline");
			});

		apiGet<SetupStatusResponse>("/setup/status")
			.then((response) => {
				if (!active) return;
				if (response.setupRequired) router.replace("/setup");
				setSetupChecked(true);
			})
			.catch(() => {
				if (active) setSetupChecked(true);
			});

		getBodyWeightRepository()
			.listLogs()
			.then((logs) => {
				if (active) setLatestLog(logs[0] ?? null);
			});

		getDraftWorkout()
			.then(async (draft) => {
				if (!active) return;
				setWorkoutCta(draft ? "Resume draft workout" : "Start next workout");
				if (!draft) {
					const nextDay = await getNextTrainingDay();
					if (active && nextDay)
						setNextWorkoutLabel(
							`Next: Day ${nextDay.sequence} · ${nextDay.title}`,
						);
				}
			})
			.catch(() => {
				if (active) setWorkoutCta("Start next workout");
			});

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!setupChecked || session.isPending) return;
		if (!session.data) router.replace("/login");
	}, [session.data, session.isPending, setupChecked]);

	if (!setupChecked || session.isPending) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color={colors.primary} />
			</View>
		);
	}

	const user = session.data?.user;

	const openWorkout = async () => {
		setWorkoutStatus("loading");
		try {
			const draft = await getDraftWorkout();
			if (!draft) {
				const nextDay = await getNextTrainingDay();
				if (!nextDay) throw new Error("No active training day found");
				await startDraftWorkout(nextDay.id);
			}
			setWorkoutStatus("idle");
			router.push("/workout" as never);
		} catch {
			setWorkoutStatus("error");
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.eyebrow}>BFitLog</Text>
			<Text style={styles.title}>Home</Text>
			<Text style={styles.description}>
				Track body weight locally and sync when the server is reachable.
			</Text>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Signed in</Text>
				<Text style={styles.status}>{user?.name ?? "Unknown user"}</Text>
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>API status</Text>
				{status === "checking" ? (
					<ActivityIndicator color={colors.primary} />
				) : (
					<Text style={styles.status}>
						{status === "online" ? "Online" : "Offline / unreachable"}
					</Text>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Latest body weight</Text>
				<Text style={styles.status}>
					{latestLog
						? `${latestLog.weightKg.toFixed(1)} kg`
						: "No body weight logged yet"}
				</Text>
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Workout</Text>
				<Text style={styles.status}>
					{nextWorkoutLabel ?? "Start or resume today's draft workout."}
				</Text>
				{workoutStatus === "error" ? (
					<Text style={styles.error}>
						Could not start workout. Check API connectivity and active plan.
					</Text>
				) : null}
				<Pressable
					style={styles.primaryButton}
					onPress={() => void openWorkout()}
					disabled={workoutStatus === "loading"}
				>
					<Text style={styles.primaryButtonText}>
						{workoutStatus === "loading" ? "Opening…" : workoutCta}
					</Text>
				</Pressable>
			</View>

			{user ? (
				<AddBodyWeightLogForm userId={user.id} onSaved={setLatestLog} />
			) : null}

			<Pressable
				style={styles.secondaryButton}
				onPress={() => router.push("/stats")}
			>
				<Text style={styles.secondaryButtonText}>View stats</Text>
			</Pressable>

			<Pressable
				style={styles.secondaryButton}
				onPress={() => router.push("/settings")}
			>
				<Text style={styles.secondaryButtonText}>Open settings</Text>
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
		gap: spacing.md,
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	eyebrow: {
		color: colors.primary,
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	title: {
		color: colors.text,
		fontSize: 32,
		fontWeight: "800",
	},
	description: {
		color: colors.mutedText,
		fontSize: 16,
		lineHeight: 24,
	},
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	cardTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: "700",
	},
	status: {
		color: colors.mutedText,
		fontSize: 16,
	},
	error: {
		color: colors.danger,
		fontSize: 14,
		lineHeight: 20,
	},
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
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "700",
	},
});
