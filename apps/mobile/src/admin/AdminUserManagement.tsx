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
import {
	createAdminUser,
	createPartnerLink,
	listAdminUsers,
	listPartnerLinks,
	resetUserPassword,
	type AdminUser,
	type PartnerLink,
} from "./admin-api";

export function AdminUserManagement() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [partnerLinks, setPartnerLinks] = useState<PartnerLink[]>([]);
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
	const [partnerUsernameA, setPartnerUsernameA] = useState("");
	const [partnerUsernameB, setPartnerUsernameB] = useState("");
	const [status, setStatus] = useState<
		"loading" | "ready" | "saving" | "error"
	>("loading");
	const [message, setMessage] = useState<string | null>(null);

	const load = useCallback(async () => {
		setStatus("loading");
		setMessage(null);
		try {
			const [nextUsers, nextLinks] = await Promise.all([
				listAdminUsers(),
				listPartnerLinks(),
			]);
			setUsers(nextUsers);
			setPartnerLinks(nextLinks);
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

	const addPartnerLink = async () => {
		const partnerUserAId = userIdForName(users, partnerUsernameA);
		const partnerUserBId = userIdForName(users, partnerUsernameB);
		if (!partnerUserAId || !partnerUserBId || partnerUserAId === partnerUserBId) {
			setMessage("Enter two different existing usernames for the Partner Link.");
			return;
		}
		setStatus("saving");
		setMessage(null);
		try {
			await createPartnerLink(partnerUserAId, partnerUserBId);
			setPartnerUsernameA("");
			setPartnerUsernameB("");
			setPartnerLinks(await listPartnerLinks());
			setMessage("Partner Link created.");
			setStatus("ready");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Unable to create Partner Link",
			);
			setStatus("error");
		}
	};

	const resetPassword = async (user: AdminUser) => {
		const nextPassword = resetPasswords[user.id] ?? "";
		if (nextPassword.length < 8) {
			setMessage("Reset password must be at least 8 characters.");
			return;
		}
		setStatus("saving");
		setMessage(null);
		try {
			await resetUserPassword(user.id, nextPassword);
			setResetPasswords((current) => ({ ...current, [user.id]: "" }));
			setMessage(`Password reset for ${user.username}.`);
			setStatus("ready");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Unable to reset password",
			);
			setStatus("error");
		}
	};

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

			<Text style={styles.sectionTitle}>Existing users</Text>
			{users.map((user) => (
				<View key={user.id} style={styles.userCard}>
					<Text style={styles.status}>
						{user.username} · {user.role}
					</Text>
					<TextInput
						style={styles.input}
						placeholder="New password"
						placeholderTextColor={colors.mutedText}
						value={resetPasswords[user.id] ?? ""}
						onChangeText={(value) =>
							setResetPasswords((current) => ({
								...current,
								[user.id]: value,
							}))
						}
						secureTextEntry
					/>
					<Pressable
						style={styles.secondaryButton}
						onPress={() => void resetPassword(user)}
						disabled={status === "saving"}
					>
						<Text style={styles.secondaryButtonText}>Reset password</Text>
					</Pressable>
				</View>
			))}

			<Text style={styles.sectionTitle}>Create user</Text>
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

			<Text style={styles.sectionTitle}>Partner Links</Text>
			{partnerLinks.length === 0 ? (
				<Text style={styles.status}>No Partner Links yet.</Text>
			) : (
				partnerLinks.map((link) => (
					<Text key={`${link.userA.id}:${link.userB.id}`} style={styles.status}>
						{link.userA.username} ↔ {link.userB.username}
					</Text>
				))
			)}
			<TextInput
				style={styles.input}
				placeholder="First username"
				placeholderTextColor={colors.mutedText}
				value={partnerUsernameA}
				onChangeText={setPartnerUsernameA}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Second username"
				placeholderTextColor={colors.mutedText}
				value={partnerUsernameB}
				onChangeText={setPartnerUsernameB}
				autoCapitalize="none"
			/>
			<Pressable
				style={styles.secondaryButton}
				onPress={() => void addPartnerLink()}
				disabled={status === "saving"}
			>
				<Text style={styles.secondaryButtonText}>Create Partner Link</Text>
			</Pressable>
		</View>
	);
}

function userIdForName(users: AdminUser[], username: string) {
	return users.find((user) => user.username === username.trim())?.id ?? "";
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
	sectionTitle: { color: colors.primary, fontSize: 15, fontWeight: "800" },
	error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
	userCard: {
		gap: spacing.sm,
		padding: spacing.sm,
		borderRadius: 12,
		backgroundColor: colors.surface,
	},
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
	secondaryButton: {
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: "700" },
});
