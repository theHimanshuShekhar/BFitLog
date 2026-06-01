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
import { apiBaseUrl } from "../src/api/client";
import { colors, spacing } from "../src/theme";

export default function SetupScreen() {
	const [adminUsername, setAdminUsername] = useState("");
	const [adminDisplayName, setAdminDisplayName] = useState("");
	const [adminPassword, setAdminPassword] = useState("");
	const [partnerUsername, setPartnerUsername] = useState("");
	const [partnerDisplayName, setPartnerDisplayName] = useState("");
	const [partnerPassword, setPartnerPassword] = useState("");
	const [saving, setSaving] = useState(false);

	async function submit() {
		setSaving(true);
		try {
			const response = await fetch(`${apiBaseUrl}/setup`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					admin: {
						username: adminUsername,
						displayName: adminDisplayName,
						password: adminPassword,
					},
					partner: {
						username: partnerUsername,
						displayName: partnerDisplayName,
						password: partnerPassword,
					},
				}),
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(body?.error ?? `Setup failed with ${response.status}`);
			}

			router.replace("/login");
		} catch (error) {
			Alert.alert(
				"Setup failed",
				error instanceof Error ? error.message : "Unknown error",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Set up BFitLog</Text>
			<Text style={styles.description}>
				Create the first admin user and partner member.
			</Text>

			<Text style={styles.section}>Admin</Text>
			<TextInput
				style={styles.input}
				placeholder="Username"
				placeholderTextColor={colors.mutedText}
				value={adminUsername}
				onChangeText={setAdminUsername}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Display name"
				placeholderTextColor={colors.mutedText}
				value={adminDisplayName}
				onChangeText={setAdminDisplayName}
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor={colors.mutedText}
				value={adminPassword}
				onChangeText={setAdminPassword}
				secureTextEntry
			/>

			<Text style={styles.section}>Partner</Text>
			<TextInput
				style={styles.input}
				placeholder="Username"
				placeholderTextColor={colors.mutedText}
				value={partnerUsername}
				onChangeText={setPartnerUsername}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Display name"
				placeholderTextColor={colors.mutedText}
				value={partnerDisplayName}
				onChangeText={setPartnerDisplayName}
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor={colors.mutedText}
				value={partnerPassword}
				onChangeText={setPartnerPassword}
				secureTextEntry
			/>

			<Pressable style={styles.button} onPress={submit} disabled={saving}>
				<Text style={styles.buttonText}>
					{saving ? "Creating…" : "Create users"}
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
	section: {
		color: colors.primary,
		fontSize: 16,
		fontWeight: "700",
		marginTop: spacing.sm,
	},
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
