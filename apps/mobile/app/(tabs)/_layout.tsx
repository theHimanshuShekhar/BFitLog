import { Tabs } from "expo-router";
import { type ColorValue, Text } from "react-native";
import { colors } from "../../src/theme";

function TabIcon({ color, label }: { color: ColorValue; label: string }) {
	return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
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
