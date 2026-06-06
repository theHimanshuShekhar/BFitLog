import { Alert } from "react-native";

export function confirmDestructive(message: string, actionLabel = "Delete") {
	if (typeof window !== "undefined" && typeof window.confirm === "function") {
		return Promise.resolve(window.confirm(message));
	}

	return new Promise<boolean>((resolve) => {
		Alert.alert("Confirm", message, [
			{ text: "Cancel", style: "cancel", onPress: () => resolve(false) },
			{
				text: actionLabel,
				style: "destructive",
				onPress: () => resolve(true),
			},
		]);
	});
}
