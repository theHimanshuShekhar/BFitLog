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
import {
	validateSetupForm,
	type SetupFormErrors,
} from "../src/setup/setup-validation";
import { colors, spacing } from "../src/theme";

export default function SetupScreen() {
	const [adminUsername, setAdminUsername] = useState("");
	const [adminDisplayName, setAdminDisplayName] = useState("");
	const [adminPassword, setAdminPassword] = useState("");
	const [partnerUsername, setPartnerUsername] = useState("");
	const [partnerDisplayName, setPartnerDisplayName] = useState("");
	const [partnerPassword, setPartnerPassword] = useState("");
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<SetupFormErrors>({});

	async function submit() {
		const values = {
			adminUsername,
			adminDisplayName,
			adminPassword,
			partnerUsername,
			partnerDisplayName,
			partnerPassword,
		};
		const nextErrors = validateSetupForm(values);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSaving(true);
		try {
			const response = await fetch(`${apiBaseUrl}/setup`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					admin: {
						username: adminUsername.trim(),
						displayName: adminDisplayName.trim(),
						password: adminPassword,
					},
					partner: {
						username: partnerUsername.trim(),
						displayName: partnerDisplayName.trim(),
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
			<FieldError message={errors.adminUsername} />
			<TextInput
				style={styles.input}
				placeholder="Display name"
				placeholderTextColor={colors.mutedText}
				value={adminDisplayName}
				onChangeText={setAdminDisplayName}
			/>
			<FieldError message={errors.adminDisplayName} />
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor={colors.mutedText}
				value={adminPassword}
				onChangeText={setAdminPassword}
				secureTextEntry
			/>
			<FieldError message={errors.adminPassword} />

			<Text style={styles.section}>Partner</Text>
			<TextInput
				style={styles.input}
				placeholder="Username"
				placeholderTextColor={colors.mutedText}
				value={partnerUsername}
				onChangeText={setPartnerUsername}
				autoCapitalize="none"
			/>
			<FieldError message={errors.partnerUsername} />
			<TextInput
				style={styles.input}
				placeholder="Display name"
				placeholderTextColor={colors.mutedText}
				value={partnerDisplayName}
				onChangeText={setPartnerDisplayName}
			/>
			<FieldError message={errors.partnerDisplayName} />
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor={colors.mutedText}
				value={partnerPassword}
				onChangeText={setPartnerPassword}
				secureTextEntry
			/>
			<FieldError message={errors.partnerPassword} />

			<Pressable style={styles.button} onPress={submit} disabled={saving}>
				<Text style={styles.buttonText}>
					{saving ? "Creating…" : "Create users"}
				</Text>
			</Pressable>
		</View>
	);
}

function FieldError({ message }: { message: string | undefined }) {
	if (!message) return null;
	return <Text style={styles.error}>{message}</Text>;
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
	error: {
		color: colors.danger,
		fontSize: 13,
		lineHeight: 18,
		marginTop: -spacing.sm,
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
