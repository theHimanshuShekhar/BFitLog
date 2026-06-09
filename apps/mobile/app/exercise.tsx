import { createElement } from "react";
import { useLocalSearchParams } from "expo-router";
import {
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { colors, layout, spacing } from "@/theme";

type MediaLink = { id: string; kind: "gif" | "video"; url: string };

export default function ExerciseDetailScreen() {
	const params = useLocalSearchParams<{
		name?: string;
		target?: string;
		equipment?: string;
		description?: string;
		trackingType?: string;
		notes?: string;
		media?: string;
	}>();
	const media = parseMedia(params.media);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.eyebrow}>Exercise</Text>
			<Text style={styles.title}>{params.name ?? "Exercise detail"}</Text>
			{params.target ? (
				<Text style={styles.description}>{params.target}</Text>
			) : null}

			{params.description ? (
				<Text style={styles.description}>{params.description}</Text>
			) : null}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>Details</Text>
				{params.equipment ? (
					<Text style={styles.status}>Equipment: {params.equipment}</Text>
				) : null}
				{params.trackingType ? (
					<Text style={styles.status}>
						Tracking: {formatTrackingType(params.trackingType)}
					</Text>
				) : null}
				{params.notes ? (
					<Text style={styles.description}>{params.notes}</Text>
				) : null}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Media</Text>
				{media.length === 0 ? (
					<Text style={styles.status}>No media links available.</Text>
				) : (
					media.map((item) => <MediaItem key={item.id} item={item} />)
				)}
			</View>
		</ScrollView>
	);
}

function MediaItem({ item }: { item: MediaLink }) {
	const embedUrl = getYouTubeEmbedUrl(item.url);
	return (
		<View style={styles.mediaItem}>
			{Platform.OS === "web" && embedUrl
				? createElement("iframe", {
						src: embedUrl,
						style: styles.webEmbed,
						title: item.id,
						allowFullScreen: true,
					})
				: null}
			<Pressable
				accessibilityRole="link"
				style={styles.mediaButton}
				onPress={() => void Linking.openURL(item.url)}
			>
				<Text style={styles.mediaText}>Open {item.kind.toUpperCase()}</Text>
				<Text style={styles.mediaUrl}>{item.url}</Text>
			</Pressable>
		</View>
	);
}

function getYouTubeEmbedUrl(url: string) {
	const match = url.match(
		/youtube\.com\/(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/,
	);
	return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function parseMedia(value: string | undefined): MediaLink[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is MediaLink =>
				typeof item?.id === "string" &&
				(item.kind === "gif" || item.kind === "video") &&
				typeof item.url === "string",
		);
	} catch {
		return [];
	}
}

function formatTrackingType(value: string) {
	return value === "duration" ? "Duration" : "Reps + kg";
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		width: "100%",
		maxWidth: layout.maxContentWidth,
		alignSelf: "center",
		gap: spacing.lg,
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	eyebrow: {
		color: colors.primaryStrong,
		fontSize: 14,
		fontWeight: "800",
		letterSpacing: 1.8,
		textTransform: "uppercase",
		backgroundColor: colors.primary,
		alignSelf: "flex-start",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
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
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		boxShadow: `0px 4px 12px ${colors.glow}`,
	},
	cardTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	mediaItem: { gap: spacing.sm },
	webEmbed: {
		width: "100%",
		height: 315,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 18,
	},
	mediaButton: {
		minHeight: layout.androidMinTouchTarget,
		gap: spacing.xs,
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.primarySoft,
	},
	mediaText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	mediaUrl: { color: colors.mutedText, fontSize: 12, lineHeight: 18 },
});
