import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "@/theme";
import {
	getReminderSettings,
	getWorkoutFrequencyGoal,
	saveReminderSettings,
	saveWorkoutFrequencyGoal,
} from "./goals-api";

export function GoalReminderSettings() {
	const [target, setTarget] = useState("3");
	const [workoutEnabled, setWorkoutEnabled] = useState(false);
	const [workoutTime, setWorkoutTime] = useState("18:00");
	const [weighInEnabled, setWeighInEnabled] = useState(false);
	const [weighInTime, setWeighInTime] = useState("07:00");
	const [status, setStatus] = useState("Loaded locally");

	useEffect(() => {
		let active = true;
		Promise.all([getWorkoutFrequencyGoal(), getReminderSettings()])
			.then(([goal, reminders]) => {
				if (!active) return;
				if (goal) setTarget(String(goal.targetWorkoutsPerWeek));
				if (reminders) {
					setWorkoutEnabled(reminders.workoutReminderEnabled);
					setWorkoutTime(reminders.workoutReminderTime ?? "18:00");
					setWeighInEnabled(reminders.weighInReminderEnabled);
					setWeighInTime(reminders.weighInReminderTime ?? "07:00");
				}
			})
			.catch(() => {
				if (active) setStatus("Offline / using local defaults");
			});
		return () => {
			active = false;
		};
	}, []);

	const save = async () => {
		const parsed = Number(target);
		if (!Number.isInteger(parsed) || parsed < 1 || parsed > 14) {
			setStatus("Target must be a whole number from 1 to 14.");
			return;
		}
		setStatus("Saving…");
		try {
			await saveWorkoutFrequencyGoal(parsed);
			await saveReminderSettings({
				workoutReminderEnabled: workoutEnabled,
				workoutReminderTime: workoutTime,
				weighInReminderEnabled: weighInEnabled,
				weighInReminderTime: weighInTime,
			});
			setStatus("Synced");
		} catch (error) {
			setStatus(
				error instanceof Error
					? `Saved locally later: ${error.message}`
					: "Sync pending",
			);
		}
	};

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Goals and reminders</Text>
			<Text style={styles.label}>Workout frequency goal / week</Text>
			<TextInput
				value={target}
				onChangeText={setTarget}
				keyboardType="number-pad"
				placeholder="3"
				placeholderTextColor={colors.mutedText}
				style={styles.input}
			/>
			<Pressable
				style={styles.toggleButton}
				onPress={() => setWorkoutEnabled((value) => !value)}
			>
				<Text style={styles.toggleText}>
					{workoutEnabled ? "Disable" : "Enable"} workout reminder
				</Text>
			</Pressable>
			<TextInput
				value={workoutTime}
				onChangeText={setWorkoutTime}
				placeholder="18:00"
				placeholderTextColor={colors.mutedText}
				style={styles.input}
			/>
			<Pressable
				style={styles.toggleButton}
				onPress={() => setWeighInEnabled((value) => !value)}
			>
				<Text style={styles.toggleText}>
					{weighInEnabled ? "Disable" : "Enable"} weigh-in reminder
				</Text>
			</Pressable>
			<TextInput
				value={weighInTime}
				onChangeText={setWeighInTime}
				placeholder="07:00"
				placeholderTextColor={colors.mutedText}
				style={styles.input}
			/>
			<Pressable style={styles.button} onPress={() => void save()}>
				<Text style={styles.buttonText}>Save goals and reminders</Text>
			</Pressable>
			<Text style={styles.status}>{status}</Text>
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
	toggleButton: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
	},
	toggleText: { color: colors.text, fontSize: 14, fontWeight: "700" },
	button: {
		alignItems: "center",
		padding: spacing.md,
		borderRadius: 999,
		backgroundColor: colors.primary,
	},
	buttonText: { color: colors.background, fontSize: 16, fontWeight: "700" },
	status: { color: colors.mutedText, fontSize: 13 },
});
