import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { createAdminUser } from "@/admin/admin-api";
import { authClient } from "@/auth/auth-client";
import { isDefaultAdminUser } from "@/auth/default-admin-onboarding";
import { useAuth } from "@/auth/use-auth";
import { colors, spacing } from "@/theme";

export default function FirstUserScreen() {
	const session = useAuth();
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<"ready" | "saving" | "error">("ready");
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (session.isPending) return;
		if (!session.data) {
			router.replace("/login");
			return;
		}
		if (!isDefaultAdminUser(session.data.user)) router.replace("/");
	}, [session.data, session.isPending]);

	if (session.isPending) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color={colors.primary} />
			</View>
		);
	}

	if (!session.data || !isDefaultAdminUser(session.data.user)) return null;

	async function submit() {
		if (!username.trim() || !displayName.trim() || password.length < 8) {
			setStatus("error");
			setMessage(
				"Username, display name, and an 8+ character password are required.",
			);
			return;
		}

		setStatus("saving");
		setMessage(null);
		try {
			await createAdminUser({
				username: username.trim(),
				displayName: displayName.trim(),
				password,
			});
			await authClient.signOut();
			router.replace("/login");
		} catch (error) {
			setStatus("error");
			setMessage(
				error instanceof Error ? error.message : "Unable to create user",
			);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Create your user</Text>
			<Text style={styles.description}>
				You are signed in with the temporary default admin. Create your own
				admin user before using BFitLog. After this succeeds, the default admin
				account is deleted and you will log in with your new user.
			</Text>
			{message ? (
				<Text
					accessibilityLiveRegion="polite"
					style={status === "error" ? styles.error : styles.status}
				>
					{message}
				</Text>
			) : null}
			<TextInput
				accessibilityLabel="Username"
				autoComplete="username"
				style={styles.input}
				placeholder="e.g. alex…"
				placeholderTextColor={colors.mutedText}
				value={username}
				onChangeText={setUsername}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<TextInput
				accessibilityLabel="Display name"
				style={styles.input}
				placeholder="e.g. Alex Lee…"
				placeholderTextColor={colors.mutedText}
				value={displayName}
				onChangeText={setDisplayName}
			/>
			<TextInput
				accessibilityLabel="Password"
				style={styles.input}
				placeholder="e.g. strong password…"
				placeholderTextColor={colors.mutedText}
				value={password}
				onChangeText={setPassword}
				autoComplete="new-password"
				secureTextEntry
			/>
			<Pressable
				accessibilityRole="button"
				style={styles.button}
				onPress={() => void submit()}
				disabled={status === "saving"}
			>
				<Text style={styles.buttonText}>
					{status === "saving" ? "Creating…" : "Create my admin user"}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: spacing.md,
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	title: { color: colors.text, fontSize: 28, fontWeight: "800" },
	description: { color: colors.mutedText, fontSize: 16, lineHeight: 22 },
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 12,
		padding: spacing.md,
		backgroundColor: colors.surface,
	},
	button: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
		marginTop: spacing.md,
	},
	buttonText: { color: colors.background, fontSize: 16, fontWeight: "700" },
	status: { color: colors.text, fontSize: 14 },
	error: { color: colors.danger, fontSize: 14 },
});
