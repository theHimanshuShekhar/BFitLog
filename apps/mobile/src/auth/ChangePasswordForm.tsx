import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "@/theme";
import { authClient } from "./auth-client";

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
		"idle",
	);
	const [message, setMessage] = useState<string | null>(null);

	const submit = async () => {
		if (currentPassword.length < 1 || newPassword.length < 8) {
			setStatus("error");
			setMessage(
				"Enter your current password and a new password with at least 8 characters.",
			);
			return;
		}

		setStatus("saving");
		setMessage(null);
		try {
			const result = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true,
			});
			if ("error" in result && result.error)
				throw new Error(result.error.message ?? "Password change failed");
			setCurrentPassword("");
			setNewPassword("");
			setStatus("success");
			setMessage("Password changed. Other sessions were revoked.");
		} catch (error) {
			setStatus("error");
			setMessage(
				error instanceof Error ? error.message : "Password change failed",
			);
		}
	};

	return (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>Change password</Text>
			<TextInput
				accessibilityLabel="Current password"
				style={styles.input}
				placeholder="Current password…"
				placeholderTextColor={colors.mutedText}
				value={currentPassword}
				onChangeText={setCurrentPassword}
				autoComplete="current-password"
				secureTextEntry
			/>
			<TextInput
				accessibilityLabel="New password"
				style={styles.input}
				placeholder="New password…"
				placeholderTextColor={colors.mutedText}
				value={newPassword}
				onChangeText={setNewPassword}
				autoComplete="new-password"
				secureTextEntry
			/>
			{message ? (
				<Text
					accessibilityLiveRegion="polite"
					style={status === "error" ? styles.error : styles.status}
				>
					{message}
				</Text>
			) : null}
			<Pressable
				accessibilityRole="button"
				style={styles.primaryButton}
				onPress={() => void submit()}
				disabled={status === "saving"}
			>
				<Text style={styles.primaryButtonText}>
					{status === "saving" ? "Saving…" : "Change password"}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
	},
	cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
	status: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
	error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 12,
		padding: spacing.md,
		backgroundColor: colors.surface,
	},
	primaryButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
	},
	primaryButtonText: {
		color: colors.background,
		fontSize: 16,
		fontWeight: "800",
	},
});
