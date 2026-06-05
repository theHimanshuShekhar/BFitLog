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
		>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="login" options={{ title: "Log in" }} />
			<Stack.Screen name="first-user" options={{ title: "Create your user" }} />
			<Stack.Screen name="setup" options={{ title: "Set up BFitLog" }} />
			<Stack.Screen name="workout" options={{ title: "Workout" }} />
			<Stack.Screen name="exercise" options={{ title: "Exercise" }} />
		</Stack>
	);
}
