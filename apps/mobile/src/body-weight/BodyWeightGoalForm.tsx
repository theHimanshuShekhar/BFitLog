import type { BodyWeightDirection } from "@bfitlog/shared";
import { useEffect, useState } from "react";
import {
	Alert,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
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
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let active = true;
		getBodyWeightRepository()
			.getGoal()
			.then((goal) => {
				if (!active || !goal) return;
				setTargetKg(String(goal.targetKg));
				setDirection(goal.direction);
			});
		return () => {
			active = false;
		};
	}, []);

	async function save() {
		const parsedTarget = Number(targetKg);
		if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
			Alert.alert("Invalid goal", "Enter a target weight in kg.");
			return;
		}

		setSaving(true);
		try {
			const repository = getBodyWeightRepository();
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
			setSyncStatus("Saved locally; sync pending");
			Alert.alert(
				"Sync pending",
				error instanceof Error ? error.message : "Goal saved locally.",
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
				style={styles.input}
				keyboardType="decimal-pad"
				placeholder="85.0"
				placeholderTextColor={colors.mutedText}
				value={targetKg}
				onChangeText={setTargetKg}
			/>

			<Text style={styles.label}>Direction</Text>
			<View style={styles.directionRow}>
				{directions.map((item) => (
					<Pressable
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

			<Pressable style={styles.button} onPress={save} disabled={saving}>
				<Text style={styles.buttonText}>
					{saving ? "Saving…" : "Save goal"}
				</Text>
			</Pressable>
			<Text style={styles.status}>{syncStatus}</Text>
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
	label: { color: colors.mutedText, fontSize: 14, fontWeight: "700" },
	input: {
		color: colors.text,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 12,
		padding: spacing.md,
		backgroundColor: colors.surface,
	},
	directionRow: { flexDirection: "row", gap: spacing.sm },
	directionButton: {
		flex: 1,
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	directionButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	directionText: {
		color: colors.mutedText,
		fontWeight: "700",
		textTransform: "capitalize",
	},
	directionTextActive: { color: colors.background },
	button: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
		marginTop: spacing.sm,
	},
	buttonText: { color: colors.background, fontSize: 16, fontWeight: "700" },
	status: { color: colors.mutedText, fontSize: 13 },
});
