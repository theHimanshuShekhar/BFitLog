import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { apiGet } from "../src/api/client";
import { useAuth } from "../src/auth/use-auth";
import { colors, spacing } from "../src/theme";

type HealthResponse = { ok: boolean };
type SetupStatusResponse = { setupRequired: boolean };

export default function HomeScreen() {
	const session = useAuth();
	const [status, setStatus] = useState<"checking" | "online" | "offline">(
		"checking",
	);
	const [setupChecked, setSetupChecked] = useState(false);

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

	return (
		<View style={styles.container}>
			<Text style={styles.eyebrow}>BFitLog</Text>
			<Text style={styles.title}>First vertical slice</Text>
			<Text style={styles.description}>
				Next up: body weight goal, offline body weight logging, and charting.
			</Text>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Signed in</Text>
				<Text style={styles.status}>
					{session.data?.user.name ?? "Unknown user"}
				</Text>
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

			<Pressable style={styles.button}>
				<Text style={styles.buttonText}>Add body weight soon</Text>
			</Pressable>
		</View>
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
		flex: 1,
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
	button: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
	},
	buttonText: {
		color: colors.background,
		fontSize: 16,
		fontWeight: "700",
	},
});
