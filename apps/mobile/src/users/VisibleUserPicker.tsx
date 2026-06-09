import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme";
import type { VisibleUser } from "./visible-users-api";

type VisibleUserPickerProps = {
	users: VisibleUser[];
	selectedUserId: string;
	onSelect: (userId: string) => void;
};

export function VisibleUserPicker({
	users,
	selectedUserId,
	onSelect,
}: VisibleUserPickerProps) {
	if (users.length <= 1) return null;

	return (
		<View accessibilityRole="tablist" style={styles.row}>
			{users.map((user) => {
				const selected = user.id === selectedUserId;
				return (
					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						key={user.id}
						style={[styles.button, selected && styles.buttonActive]}
						onPress={() => onSelect(user.id)}
					>
						<Text style={[styles.text, selected && styles.textActive]}>
							{user.name || user.username}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", gap: 0 },
	button: {
		flex: 1,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		alignItems: "center",
	},
	buttonActive: { backgroundColor: colors.primary, borderColor: colors.border },
	text: { color: colors.text, fontWeight: "800", textTransform: "uppercase" },
	textActive: { color: colors.text },
});
