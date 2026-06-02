import { router } from "expo-router";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { AdminUserManagement } from "@/admin/AdminUserManagement";
import { authClient } from "@/auth/auth-client";
import { useAuth } from "@/auth/use-auth";
import { BodyWeightGoalForm } from "@/body-weight/BodyWeightGoalForm";
import { colors, spacing } from "@/theme";

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
		<View style={styles.container}>
			<Text style={styles.title}>Settings</Text>
			<Text style={styles.description}>
				Signed in as {session.data.user.name}
			</Text>
			<BodyWeightGoalForm userId={session.data.user.id} />
			{role === "admin" ? <AdminUserManagement /> : null}
			<Pressable style={styles.secondaryButton} onPress={logout}>
				<Text style={styles.secondaryButtonText}>Log out</Text>
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
	title: { color: colors.text, fontSize: 28, fontWeight: "800" },
	description: { color: colors.mutedText, fontSize: 16 },
	secondaryButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
