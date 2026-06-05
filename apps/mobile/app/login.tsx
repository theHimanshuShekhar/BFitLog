import { router } from "expo-router";
import { useState } from "react";
import {
	Alert,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { authClient } from "../src/auth/auth-client";
import { routeAfterLogin } from "../src/auth/default-admin-onboarding";
import { colors, spacing } from "../src/theme";

export default function LoginScreen() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [saving, setSaving] = useState(false);

	async function submit() {
		setSaving(true);
		try {
			const result = await authClient.signIn.username({ username, password });
			if (result.error) throw new Error(result.error.message ?? "Login failed");
			router.replace(routeAfterLogin(result.data?.user));
		} catch (error) {
			Alert.alert(
				"Login failed",
				error instanceof Error ? error.message : "Unknown error",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Log in</Text>
			<Text style={styles.description}>
				Use your BFitLog username and password.
			</Text>
			<TextInput
				style={styles.input}
				accessibilityLabel="Username"
				autoComplete="username"
				autoCorrect={false}
				placeholder="e.g. admin…"
				placeholderTextColor={colors.mutedText}
				value={username}
				onChangeText={setUsername}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				accessibilityLabel="Password"
				autoComplete="current-password"
				placeholder="e.g. admin…"
				placeholderTextColor={colors.mutedText}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Log in"
				style={styles.button}
				onPress={submit}
				disabled={saving}
			>
				<Text style={styles.buttonText}>
					{saving ? "Logging in…" : "Log in"}
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
	title: { color: colors.text, fontSize: 28, fontWeight: "800" },
	description: { color: colors.mutedText, fontSize: 16 },
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
});
