import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { colors, spacing } from "@/theme";
import { createAdminUser, listAdminUsers, type AdminUser } from "./admin-api";

export function AdminUserManagement() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<
		"loading" | "ready" | "saving" | "error"
	>("loading");
	const [message, setMessage] = useState<string | null>(null);

	const load = useCallback(async () => {
		setStatus("loading");
		setMessage(null);
		try {
			setUsers(await listAdminUsers());
			setStatus("ready");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Unable to load users",
			);
			setStatus("error");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const createUser = async () => {
		if (!username.trim() || !displayName.trim() || password.length < 8) {
			setMessage(
				"Username, display name, and an 8+ character password are required.",
			);
			return;
		}
		setStatus("saving");
		setMessage(null);
		try {
			const result = await createAdminUser({
				username: username.trim(),
				displayName: displayName.trim(),
				password,
			});
			setUsername("");
			setDisplayName("");
			setPassword("");
			if (result.defaultAdminDeleted) {
				setMessage(
					"Real admin created. Default admin was deleted; log in with the new admin account.",
				);
				router.replace("/login");
				return;
			}
			setUsers(await listAdminUsers());
			setStatus("ready");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Unable to create user",
			);
			setStatus("error");
		}
	};

	return (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>Admin users</Text>
			<Text style={styles.description}>
				Create real accounts. The first account created from the default admin
				becomes admin and removes the default admin.
			</Text>
			{status === "loading" ? (
				<ActivityIndicator color={colors.primary} />
			) : null}
			{message ? (
				<Text style={status === "error" ? styles.error : styles.status}>
					{message}
				</Text>
			) : null}

			{users.map((user) => (
				<Text key={user.id} style={styles.status}>
					{user.username} · {user.role}
				</Text>
			))}

			<TextInput
				style={styles.input}
				placeholder="Username"
				placeholderTextColor={colors.mutedText}
				value={username}
				onChangeText={setUsername}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Display name"
				placeholderTextColor={colors.mutedText}
				value={displayName}
				onChangeText={setDisplayName}
			/>
			<TextInput
				style={styles.input}
				placeholder="Temporary password"
				placeholderTextColor={colors.mutedText}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Pressable
				style={styles.primaryButton}
				onPress={() => void createUser()}
				disabled={status === "saving"}
			>
				<Text style={styles.primaryButtonText}>
					{status === "saving" ? "Creating…" : "Create user"}
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
	description: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
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
