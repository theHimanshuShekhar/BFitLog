import type { BodyWeightDirection } from "@bfitlog/shared";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../theme";
import { getBodyWeightRepository } from "./repository";

type Props = {
	userId: string;
};

const directions: BodyWeightDirection[] = ["lose", "gain", "maintain"];

export function BodyWeightGoalForm({ userId }: Props) {
	const [targetKg, setTargetKg] = useState("");
	const [direction, setDirection] = useState<BodyWeightDirection>("lose");
	const [syncStatus, setSyncStatus] = useState("Loaded locally");
	const [messageKind, setMessageKind] = useState<"status" | "error">("status");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let active = true;
		getBodyWeightRepository(userId)
			.getGoal()
			.then((goal) => {
				if (!active || !goal) return;
				setTargetKg(String(goal.targetKg));
				setDirection(goal.direction);
			});
		return () => {
			active = false;
		};
	}, [userId]);

	async function save() {
		const parsedTarget = Number(targetKg);
		if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
			setMessageKind("error");
			setSyncStatus("Enter a target weight in kg.");
			return;
		}

		setSaving(true);
		setMessageKind("status");
		try {
			const repository = getBodyWeightRepository(userId);
			await repository.saveGoal({
				userId,
				targetKg: Math.round(parsedTarget * 10) / 10,
				direction,
				updatedAt: new Date().toISOString(),
			});
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
			<Text style={styles.title}>Body weight goal</Text>
			<Text style={styles.label}>Target kg</Text>
			<TextInput
				accessibilityLabel="Target weight in kilograms"
				style={styles.input}
				inputMode="decimal"
				keyboardType="decimal-pad"
				placeholder="85.0…"
				placeholderTextColor={colors.mutedText}
				value={targetKg}
				onChangeText={setTargetKg}
			/>

			<Text style={styles.label}>Direction</Text>
			<View accessibilityRole="radiogroup" style={styles.directionRow}>
				{directions.map((item) => (
					<Pressable
						accessibilityRole="radio"
						accessibilityState={{ checked: direction === item }}
						key={item}
						style={[
							styles.directionButton,
							direction === item && styles.directionButtonActive,
						]}
						onPress={() => setDirection(item)}
					>
						<Text
							style={[
								styles.directionText,
								direction === item && styles.directionTextActive,
							]}
						>
							{item}
						</Text>
					</Pressable>
				))}
			</View>

			<Pressable
				accessibilityRole="button"
				style={styles.button}
				onPress={save}
				disabled={saving}
			>
				<Text style={styles.buttonText}>
					{saving ? "Saving…" : "Save goal"}
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
		gap: spacing.md,
		padding: spacing.md,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		boxShadow: `0px 4px 12px ${colors.glow}`,
	},
	title: {
		color: colors.text,
		fontSize: 20,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	label: {
		color: colors.mutedText,
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 18,
		padding: spacing.md,
		backgroundColor: colors.surface,
	},
	directionRow: { flexDirection: "row", gap: spacing.sm },
	directionButton: {
		flex: 1,
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
	},
	directionButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.border,
	},
	directionText: {
		color: colors.mutedText,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	directionTextActive: { color: colors.text },
	button: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.primary,
		marginTop: spacing.sm,
	},
	buttonText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	status: { color: colors.mutedText, fontSize: 13 },
	error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});
