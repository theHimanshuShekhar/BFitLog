import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";
import { isDefaultAdminUser } from "../../src/auth/default-admin-onboarding";
import { useAuth } from "../../src/auth/use-auth";
import { colors } from "../../src/theme";

function TabIcon({ color, label }: { color: ColorValue; label: string }) {
	return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
	const session = useAuth();

	if (session.isPending) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: colors.background,
				}}
			>
				<ActivityIndicator color={colors.primary} />
			</View>
		);
	}

	if (!session.data) return <Redirect href="/login" />;
	if (isDefaultAdminUser(session.data.user))
		return <Redirect href="/first-user" />;

	return (
		<Tabs
			screenOptions={{
				headerStyle: { backgroundColor: colors.surface },
				headerTintColor: colors.text,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.mutedText,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => <TabIcon color={color} label="⌂" />,
				}}
			/>
			<Tabs.Screen
				name="plan"
				options={{
					title: "Plan",
					tabBarIcon: ({ color }) => <TabIcon color={color} label="▤" />,
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					title: "History",
					tabBarIcon: ({ color }) => <TabIcon color={color} label="◷" />,
				}}
			/>
			<Tabs.Screen
				name="stats"
				options={{
					title: "Stats",
					tabBarIcon: ({ color }) => <TabIcon color={color} label="↗" />,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ color }) => <TabIcon color={color} label="⚙" />,
				}}
			/>
		</Tabs>
	);
}
