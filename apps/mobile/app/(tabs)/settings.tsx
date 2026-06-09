import { router } from "expo-router";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { AdminUserManagement } from "@/admin/AdminUserManagement";
import { authClient } from "@/auth/auth-client";
import { ChangePasswordForm } from "@/auth/ChangePasswordForm";
import { useAuth } from "@/auth/use-auth";
import { BodyWeightGoalForm } from "@/body-weight/BodyWeightGoalForm";
import { GoalReminderSettings } from "@/goals/GoalReminderSettings";
import { colors, layout, spacing } from "@/theme";

export default function SettingsScreen() {
	const session = useAuth();

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

	async function logout() {
		await authClient.signOut();
		router.replace("/login");
	}

	const role = (session.data.user as { role?: string }).role;

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Settings</Text>
			<Text style={styles.description}>
				Signed in as {session.data.user.name}
			</Text>
			<View style={styles.card}>
				<Text style={styles.cardTitle}>Account details</Text>
				<Text style={styles.description}>User ID: {session.data.user.id}</Text>
				<Text style={styles.description}>
					Role: {(session.data.user as { role?: string }).role ?? "member"}
				</Text>
			</View>
			<BodyWeightGoalForm userId={session.data.user.id} />
			<GoalReminderSettings userId={session.data.user.id} />
			<ChangePasswordForm />
			{role === "admin" ? <AdminUserManagement /> : null}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>About BFitLog</Text>
				<Text style={styles.description}>
					Self-hosted gym and body-weight tracking for web and Android.
				</Text>
				<Text style={styles.description}>Version 0.1.0</Text>
			</View>
			<Pressable
				accessibilityRole="button" style={styles.secondaryButton} onPress={logout}>
				<Text style={styles.secondaryButtonText}>Log out</Text>
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
		gap: spacing.lg,
		paddingTop: spacing.lg,
		paddingHorizontal: spacing.lg,
		paddingBottom: layout.bottomTabBarInset,
		backgroundColor: colors.background,
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
	secondaryButton: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
});
