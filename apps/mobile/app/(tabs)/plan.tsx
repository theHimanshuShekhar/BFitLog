import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { createElement, useCallback, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
	Pressable,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";
import { useAuth } from "@/auth/use-auth";
import { formatSeconds } from "@/format";
import { colors, layout, spacing } from "@/theme";
import { getInlineMediaEmbed } from "@/training-media";

const planCacheKey = "bfitlog:training-plan-template";

type TrainingPlanTemplate = {
	id: string;
	name: string;
	goal: string | null;
	notes: string | null;
	days: TrainingDay[];
};

type ActivePlanResponse = {
	plan: {
		id: string;
		userId: string;
		name: string;
		activeAt: string;
		template: TrainingPlanTemplate;
	} | null;
};

type TrainingDay = {
	id: string;
	sequence: number;
	title: string;
	checklist: Array<{
		id: string;
		kind: "warmup" | "cooldown";
		text: string;
		sortOrder: number;
	}>;
	exercises: PlannedExercise[];
};

type PlannedExercise = {
	id: string;
	sortOrder: number;
	targetSets: number;
	targetMinReps: number | null;
	targetMaxReps: number | null;
	targetDurationSeconds: number | null;
	restSeconds: number;
	notes: string | null;
	exercise: {
		id: string;
		name: string;
		equipment: string | null;
		trackingType: "reps_weight" | "duration";
		media: Array<{ id: string; kind: "gif" | "video"; url: string }>;
	} | null;
	substitutes: Array<{
		exercise: {
			id: string;
			name: string;
			equipment: string | null;
			trackingType: "reps_weight" | "duration";
		} | null;
		targetSets: number | null;
		targetMinReps: number | null;
		targetMaxReps: number | null;
		targetDurationSeconds: number | null;
		notes: string | null;
	}>;
};

export default function PlanScreen() {
	const session = useAuth();
	const [plan, setPlan] = useState<TrainingPlanTemplate | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [error, setError] = useState<string | null>(null);

	const loadPlan = useCallback(async () => {
		setStatus("loading");
		setError(null);
		const cached = await AsyncStorage.getItem(planCacheKey);
		if (cached) {
			setPlan(JSON.parse(cached) as TrainingPlanTemplate);
		}
		try {
			const cookie = authClient.getCookie();
			const headers = new Headers();
			if (cookie) headers.set("Cookie", cookie);
			let response = await fetch(`${apiBaseUrl}/training-plan/active`, {
				headers,
				credentials: cookie ? "omit" : "include",
			});
			if (!response.ok)
				throw new Error(`Plan request failed with ${response.status}`);
			let body = (await response.json()) as ActivePlanResponse;

			if (!body.plan) {
				response = await fetch(`${apiBaseUrl}/training-plan/active/default`, {
					method: "POST",
					headers,
					credentials: cookie ? "omit" : "include",
				});
				if (!response.ok)
					throw new Error(`Plan activation failed with ${response.status}`);
				body = (await response.json()) as ActivePlanResponse;
			}

			const template = body.plan?.template ?? null;
			setPlan(template);
			if (template)
				await AsyncStorage.setItem(planCacheKey, JSON.stringify(template));
			setStatus("ready");
		} catch (err) {
			if (cached) {
				setStatus("ready");
				return;
			}
			setError(
				err instanceof Error ? err.message : "Unable to load training plan",
			);
			setStatus("error");
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			if (!session.isPending && session.data) void loadPlan();
		}, [loadPlan, session.data, session.isPending]),
	);

	if (session.isPending || status === "loading") {
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

	if (status === "error") {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Plan</Text>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Could not load plan</Text>
					<Text style={styles.description}>{error}</Text>
					<Text style={styles.description}>
						Run the training-plan seed script if the API says the template is
						missing.
					</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					style={styles.secondaryButton}
					onPress={() => void loadPlan()}
				>
					<Text style={styles.secondaryButtonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Plan</Text>
			<Text style={styles.description}>{plan?.name}</Text>
			{plan?.goal ? <Text style={styles.status}>Goal: {plan.goal}</Text> : null}
			{plan?.notes ? <Text style={styles.status}>{plan.notes}</Text> : null}

			{plan?.days.map((day) => (
				<View key={day.id} style={styles.dayCard}>
					<Text style={styles.dayTitle}>
						Day {day.sequence}: {day.title}
					</Text>

					<Checklist
						title="Warmup"
						items={day.checklist.filter((item) => item.kind === "warmup")}
					/>
					<View style={styles.exerciseList}>
						{day.exercises.map((planned) => (
							<ExerciseRow key={planned.id} planned={planned} />
						))}
					</View>
					<Checklist
						title="Cooldown"
						items={day.checklist.filter((item) => item.kind === "cooldown")}
					/>
				</View>
			))}
		</ScrollView>
	);
}

function Checklist({
	title,
	items,
}: {
	title: string;
	items: TrainingDay["checklist"];
}) {
	if (items.length === 0) return null;
	return (
		<View style={styles.checklist}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{items.map((item) => (
				<Text key={item.id} style={styles.bullet}>
					• {item.text}
				</Text>
			))}
		</View>
	);
}

function ExerciseRow({ planned }: { planned: PlannedExercise }) {
	const exercise = planned.exercise;
	const target = planned.targetDurationSeconds
		? `${planned.targetSets} × ${formatSeconds(planned.targetDurationSeconds)}`
		: `${planned.targetSets} × ${planned.targetMinReps}-${planned.targetMaxReps}`;

	return (
		<View style={styles.exerciseCard}>
			<Pressable
				accessibilityRole="link"
				onPress={() => openExerciseDetail(planned, target)}
			>
				<Text style={styles.cardTitle}>
					{exercise?.name ?? "Unknown exercise"}
				</Text>
				<Text style={styles.detailLink}>View details</Text>
			</Pressable>
			<Text style={styles.status}>
				{target} · Rest {formatSeconds(planned.restSeconds)}
			</Text>
			{exercise?.equipment ? (
				<Text style={styles.status}>{exercise.equipment}</Text>
			) : null}
			{planned.notes ? (
				<Text style={styles.description}>{planned.notes}</Text>
			) : null}
			{planned.substitutes.length ? (
				<View style={styles.substituteBox}>
					<Text style={styles.status}>Preferred substitutes</Text>
					{planned.substitutes.map((substitute) => (
						<Text
							key={substitute.exercise?.id ?? substitute.notes ?? "substitute"}
							style={styles.bullet}
						>
							• {substitute.exercise?.name ?? "Unknown exercise"}
							{substitute.notes ? ` — ${substitute.notes}` : ""}
						</Text>
					))}
				</View>
			) : null}
			{exercise?.media.length ? (
				<View style={styles.mediaList}>
					{exercise.media.map((media) => (
						<MediaPreview key={media.id} media={media} />
					))}
				</View>
			) : null}
		</View>
	);
}

function MediaPreview({
	media,
}: {
	media: { id: string; kind: "gif" | "video"; url: string };
}) {
	const embed = getInlineMediaEmbed(media);
	return (
		<View style={styles.mediaItem}>
			{Platform.OS === "web" && embed?.type === "iframe"
				? createElement("iframe", {
						src: embed.url,
						style: styles.webEmbed,
						title: `${media.kind} demonstration`,
						allowFullScreen: true,
					})
				: null}
			{embed?.type === "image" ? (
				<Image
					source={{ uri: embed.url }}
					style={styles.mediaImage}
					accessibilityLabel={`${media.kind} demonstration`}
				/>
			) : null}
			<Pressable
				accessibilityRole="link"
				style={styles.mediaButton}
				onPress={() => void Linking.openURL(media.url)}
			>
				<Text style={styles.mediaText}>Open {media.kind.toUpperCase()}</Text>
			</Pressable>
		</View>
	);
}

function openExerciseDetail(planned: PlannedExercise, target: string) {
	const exercise = planned.exercise;
	if (!exercise) return;
	const params = new URLSearchParams({
		name: exercise.name,
		target,
		trackingType: exercise.trackingType,
		media: JSON.stringify(exercise.media),
	});
	if (exercise.equipment) params.set("equipment", exercise.equipment);
	if (planned.notes) params.set("notes", planned.notes);
	router.push(`/exercise?${params.toString()}` as never);
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
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	dayCard: {
		gap: spacing.md,
		padding: spacing.md,
		borderRadius: 20,
		backgroundColor: colors.card,
	},
	dayTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
	sectionTitle: { color: colors.primary, fontSize: 16, fontWeight: "800" },
	checklist: { gap: spacing.xs },
	bullet: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	exerciseList: { gap: spacing.sm },
	exerciseCard: {
		gap: spacing.xs,
		padding: spacing.md,
		borderRadius: 14,
		backgroundColor: colors.surface,
	},
	cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
	detailLink: {
		color: colors.primary,
		fontSize: 13,
		fontWeight: "800",
		marginTop: spacing.xs,
	},
	substituteBox: { gap: spacing.xs, marginTop: spacing.xs },
	mediaList: { gap: spacing.sm, marginTop: spacing.xs },
	mediaItem: { gap: spacing.xs },
	webEmbed: {
		width: "100%",
		aspectRatio: 16 / 9,
		borderWidth: 0,
		borderRadius: 12,
	},
	mediaImage: {
		width: "100%",
		aspectRatio: 16 / 9,
		borderRadius: 12,
		backgroundColor: colors.card,
	},
	mediaButton: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	mediaText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
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
