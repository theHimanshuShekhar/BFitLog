import type { BodyWeightLog } from "@bfitlog/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../theme";
import { createClientId } from "./id";
import { getBodyWeightRepository } from "./repository";

type Props = {
	userId: string;
	onSaved?: (log: BodyWeightLog) => void;
};

export function AddBodyWeightLogForm({ userId, onSaved }: Props) {
	const [weightKg, setWeightKg] = useState("");
	const [note, setNote] = useState("");
	const [syncStatus, setSyncStatus] = useState("Ready");
	const [messageKind, setMessageKind] = useState<"status" | "error">("status");
	const [saving, setSaving] = useState(false);

	async function save() {
		const parsedWeight = Number(weightKg);
		if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
			setMessageKind("error");
			setSyncStatus("Enter your body weight in kg.");
			return;
		}

		setSaving(true);
		setMessageKind("status");
		const now = new Date().toISOString();
		const log: BodyWeightLog = {
			id: createClientId(),
			userId,
			measuredAt: now,
			weightKg: Math.round(parsedWeight * 10) / 10,
			note: note.trim() || undefined,
			createdAt: now,
			updatedAt: now,
		};

		try {
			const repository = getBodyWeightRepository(userId);
			await repository.saveLog(log);
			onSaved?.(log);
			setWeightKg("");
			setNote("");
			setSyncStatus("Saved locally; syncing…");
			await repository.sync();
			setSyncStatus("Synced");
		} catch (error) {
			setMessageKind("error");
			setSyncStatus(
				error instanceof Error
					? `Saved locally; sync pending. ${error.message}`
					: "Saved locally; sync pending.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Add body weight</Text>
			<TextInput
				accessibilityLabel="Body weight in kilograms"
				style={styles.input}
				inputMode="decimal"
				keyboardType="decimal-pad"
				placeholder="90.0…"
				placeholderTextColor={colors.mutedText}
				value={weightKg}
				onChangeText={setWeightKg}
			/>
			<TextInput
				accessibilityLabel="Body weight note"
				style={styles.input}
				placeholder="Optional note…"
				placeholderTextColor={colors.mutedText}
				value={note}
				onChangeText={setNote}
			/>
			<Pressable
				accessibilityRole="button"
				style={styles.button}
				onPress={save}
				disabled={saving}
			>
				<Text style={styles.buttonText}>
					{saving ? "Saving…" : "Save body weight"}
				</Text>
			</Pressable>
			<Text
				accessibilityLiveRegion="polite"
				style={messageKind === "error" ? styles.error : styles.status}
			>
				{syncStatus}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	title: { color: colors.text, fontSize: 20, fontWeight: "800" },
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
		marginTop: spacing.sm,
	},
	buttonText: { color: colors.background, fontSize: 16, fontWeight: "700" },
	status: { color: colors.mutedText, fontSize: 13 },
	error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});
