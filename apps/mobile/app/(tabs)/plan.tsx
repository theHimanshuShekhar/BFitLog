import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { createElement, useCallback, useState } from "react";
import {
	Image,
	Linking,
	Pressable,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";
import { useAuth } from "@/auth/use-auth";
import { formatSeconds } from "@/format";
import { colors, layout, radius, spacing } from "@/theme";
import {
	BodyText,
	Card,
	LoadingScreen,
	PageHeader,
	Screen,
	SectionLabel,
} from "@/ui/primitives";
import { getInlineMediaEmbed } from "@/training-media";
import { VisibleUserPicker } from "@/users/VisibleUserPicker";
import { useVisibleUsers } from "@/users/use-visible-users";


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
	const { visibleUsers, selectedUserId, setSelectedUserId } = useVisibleUsers(
		session.data?.user,
	);

	const loadPlan = useCallback(async () => {
		if (!session.data) return;
		const targetUserId = selectedUserId ?? session.data.user.id;
		const cacheKey = `bfitlog:training-plan-template:${targetUserId}`;
		setStatus("loading");
		setError(null);
		const cached = await AsyncStorage.getItem(cacheKey);
		if (cached) {
			setPlan(JSON.parse(cached) as TrainingPlanTemplate);
		}
		try {
			const cookie = authClient.getCookie();
			const headers = new Headers();
			if (cookie) headers.set("Cookie", cookie);
			const query =
				targetUserId === session.data.user.id
					? ""
					: `?userId=${encodeURIComponent(targetUserId)}`;
			let response = await fetch(`${apiBaseUrl}/training-plan/active${query}`, {
				headers,
				credentials: cookie ? "omit" : "include",
			});
			if (!response.ok)
				throw new Error(`Plan request failed with ${response.status}`);
			let body = (await response.json()) as ActivePlanResponse;

			if (!body.plan && targetUserId === session.data.user.id) {
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
				await AsyncStorage.setItem(cacheKey, JSON.stringify(template));
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
	}, [selectedUserId, session.data]);

	useFocusEffect(
		useCallback(() => {
			if (!session.isPending && session.data) void loadPlan();
		}, [loadPlan, session.data, session.isPending]),
	);

	if (session.isPending || status === "loading") {
		return <LoadingScreen />;
	}

	if (!session.data) {
		router.replace("/login");
		return null;
	}

	if (status === "error") {
		return (
			<Screen>
				<PageHeader eyebrow="Training" title="Plan" />
				<Card title="Could not load plan">
					<BodyText muted>{error}</BodyText>
					<BodyText muted>
						Run the training-plan seed script if the API says the template is
						missing.
					</BodyText>
				</Card>
				<Pressable
					accessibilityRole="button"
					style={styles.secondaryButton}
					onPress={() => void loadPlan()}
				>
					<Text style={styles.secondaryButtonText}>Retry</Text>
				</Pressable>
			</Screen>
		);
	}

	return (
		<Screen>
			<PageHeader
				eyebrow="Training"
				title="Plan"
				description={plan?.name ?? "Active training plan"}
			/>
			{plan?.goal ? <BodyText muted>Goal: {plan.goal}</BodyText> : null}
			{plan?.notes ? <BodyText muted>{plan.notes}</BodyText> : null}

			<VisibleUserPicker
				users={visibleUsers}
				selectedUserId={selectedUserId ?? session.data.user.id}
				onSelect={setSelectedUserId}
			/>

			{plan?.days.map((day) => (
				<Card key={day.id} style={styles.dayCard}>
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
				</Card>
			))}
		</Screen>
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
			<SectionLabel>{title}</SectionLabel>
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
	description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	dayCard: {
		gap: spacing.md,
	},
	dayTitle: {
		color: colors.text,
		fontSize: 22,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	checklist: { gap: spacing.xs },
	bullet: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	exerciseList: { gap: spacing.sm },
	exerciseCard: {
		gap: spacing.xs,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		backgroundColor: colors.cardMuted,
	},
	cardTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	detailLink: {
		color: colors.text,
		fontSize: 13,
		fontWeight: "800",
		marginTop: spacing.xs,
		textTransform: "uppercase",
	},
	substituteBox: { gap: spacing.xs, marginTop: spacing.xs },
	mediaList: { gap: spacing.sm, marginTop: spacing.xs },
	mediaItem: { gap: spacing.xs },
	webEmbed: {
		width: "100%",
		aspectRatio: 16 / 9,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
	},
	mediaImage: {
		width: "100%",
		aspectRatio: 16 / 9,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
	},
	mediaButton: {
		minHeight: layout.androidMinTouchTarget,
		justifyContent: "center",
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.primarySoft,
	},
	mediaText: {
		color: colors.text,
		fontSize: 12,
		fontWeight: "800",
		textTransform: "uppercase",
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
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
});
