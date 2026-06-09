import type { BodyWeightLog } from "@bfitlog/shared";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { apiGet } from "@/api/client";
import { useAuth } from "@/auth/use-auth";
import { AddBodyWeightLogForm } from "@/body-weight/AddBodyWeightLogForm";
import { getBodyWeightRepository } from "@/body-weight/repository";
import { formatKg } from "@/format";
import { colors, layout, radius, spacing } from "@/theme";
import {
	BodyText,
	Button,
	Card,
	LoadingScreen,
	PageHeader,
	Screen,
	StatusPill,
	uiStyles,
} from "@/ui/primitives";
import { blurActiveElement } from "@/web-focus";
import {
	getActivePlan,
	getDraftWorkout,
	getNextTrainingDay,
	startDraftWorkout,
	type TrainingDaySummary,
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
	const [trainingDays, setTrainingDays] = useState<TrainingDaySummary[]>([]);
	const [selectedTrainingDayId, setSelectedTrainingDayId] = useState<
		string | null
	>(null);

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


		getActivePlan()
			.then((plan) => {
				if (!active) return;
				setTrainingDays(plan?.template.days ?? []);
			})
			.catch(() => undefined);

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
		if (!session.data) {
			router.replace("/login");
			return;
		}
		let active = true;
		getBodyWeightRepository(session.data.user.id)
			.listLogs()
			.then((logs) => {
				if (active) setLatestLog(logs[0] ?? null);
			});
		return () => {
			active = false;
		};
	}, [session.data, session.isPending, setupChecked]);

	if (!setupChecked || session.isPending) {
		return <LoadingScreen />;
	}

	const user = session.data?.user;

	const openWorkout = async () => {
		setWorkoutStatus("loading");
		try {
			const draft = await getDraftWorkout();
			if (!draft) {
				const nextDay = selectedTrainingDayId
					? { id: selectedTrainingDayId }
					: await getNextTrainingDay();
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
		<Screen>
			<PageHeader
				eyebrow="BFitLog"
				title="Today"
				description="Mobile-first training, local body-weight tracking, and trusted partner visibility."
				aside={
					<StatusPill
						label={`API ${status === "checking" ? "Checking" : status === "online" ? "Online" : "Offline"}`}
						tone={
							status === "online"
								? "success"
								: status === "offline"
									? "danger"
									: "info"
						}
					/>
				}
			/>

			<View style={styles.metricGrid}>
				<Card title="Signed in" style={styles.metricCard}>
					<Text style={styles.metricValue}>{user?.name ?? "Unknown user"}</Text>
				</Card>
				<Card title="Latest body weight" style={styles.metricCard}>
					<Text style={styles.metricValue}>
						{latestLog ? formatKg(latestLog.weightKg) : "No log yet"}
					</Text>
				</Card>
			</View>

			<Card title="Workout">
				<BodyText muted>
					{nextWorkoutLabel ?? "Start or resume today's draft workout."}
				</BodyText>
				{trainingDays.length ? (
					<View style={styles.dayOverrideRow}>
						{trainingDays.map((day) => (
							<Pressable
								key={day.id}
								accessibilityRole="tab"
								accessibilityState={{
									selected: selectedTrainingDayId === day.id,
								}}
								accessibilityLabel={`Select training day ${day.sequence}`}
								style={[
									styles.dayOverrideButton,
									selectedTrainingDayId === day.id &&
										styles.dayOverrideButtonActive,
								]}
								onPress={() => setSelectedTrainingDayId(day.id)}
							>
								<Text
									style={[
										styles.dayOverrideText,
										selectedTrainingDayId === day.id &&
											styles.dayOverrideTextActive,
									]}
								>
									Day {day.sequence}
								</Text>
							</Pressable>
						))}
					</View>
				) : null}
				{workoutStatus === "error" ? (
					<Text style={uiStyles.bodyMuted}>
						Could not start workout. Check API connectivity and active plan.
					</Text>
				) : null}
				<Button
					accessibilityLabel={workoutCta}
					label={workoutStatus === "loading" ? "Opening…" : workoutCta}
					variant="primary"
					onPress={() => void openWorkout()}
					disabled={workoutStatus === "loading"}
				/>
			</Card>

			{user ? (
				<AddBodyWeightLogForm userId={user.id} onSaved={setLatestLog} />
			) : null}

			<Link href="/stats" asChild>
				<Pressable
					accessibilityRole="link"
					style={styles.secondaryButton}
					onPress={blurActiveElement}
				>
					<Text style={styles.secondaryButtonText}>View stats</Text>
				</Pressable>
			</Link>

			<Link href="/settings" asChild>
				<Pressable
					accessibilityRole="link"
					style={styles.secondaryButton}
					onPress={blurActiveElement}
				>
					<Text style={styles.secondaryButtonText}>Open settings</Text>
				</Pressable>
			</Link>
		</Screen>
	);
}

const styles = StyleSheet.create({
	metricGrid: {
		flexDirection: "row",
		gap: spacing.md,
		flexWrap: "wrap",
	},
	metricCard: { flex: 1, minWidth: 220 },
	metricValue: {
		color: colors.text,
		fontSize: 24,
		fontWeight: "800",
	},
	dayOverrideRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
	dayOverrideButton: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
	},
	dayOverrideButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.border,
	},
	dayOverrideText: {
		color: colors.mutedText,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	dayOverrideTextActive: { color: colors.text },
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
