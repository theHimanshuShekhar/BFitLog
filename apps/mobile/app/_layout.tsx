import { Stack } from "expo-router";
import { colors } from "../src/theme";

export default function RootLayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.surface },
				headerTintColor: colors.text,
				contentStyle: { backgroundColor: colors.background },
			}}
		/>
	);
}
