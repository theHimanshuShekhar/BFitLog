import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";
import { isDefaultAdminUser } from "../../src/auth/default-admin-onboarding";
import { useAuth } from "../../src/auth/use-auth";
import { colors } from "../../src/theme";

function TabIcon({
	color,
	focused,
	label,
}: {
	color: ColorValue;
	focused: boolean;
	label: string;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				justifyContent: "center",
				width: 36,
				height: 32,
				borderWidth: focused ? 1 : 0,
				borderRadius: 18,
				borderColor: focused ? colors.cyan : colors.border,
				backgroundColor: focused ? colors.primarySoft : "transparent",
				transform: [{ translateY: focused ? -1 : 0 }],
				boxShadow: focused ? `0px 4px 10px ${colors.cyan}` : "none",
			}}
		>
			<Text
				style={{
					color: focused ? colors.cyan : color,
					fontSize: 17,
					fontWeight: "800",
					lineHeight: 20,
				}}
			>
				{label}
			</Text>
		</View>
	);
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
				headerShown: false,
				tabBarStyle: {
					position: "absolute",
					left: 12,
					right: 12,
					bottom: 14,
					height: 70,
					paddingTop: 7,
					paddingBottom: 8,
					paddingHorizontal: 8,
					backgroundColor: colors.overlay,
					borderColor: colors.borderStrong,
					borderTopWidth: 1,
					borderRightWidth: 1,
					borderBottomWidth: 1,
					borderLeftWidth: 1,
					borderRadius: 30,
					boxShadow: `0px 3px 10px ${colors.glow}`,
				},
				tabBarActiveTintColor: colors.cyan,
				tabBarInactiveTintColor: colors.mutedText,
				tabBarItemStyle: {
					height: 54,
					marginHorizontal: 1,
					paddingVertical: 2,
					borderRadius: 22,
				},
				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: "800",
					letterSpacing: 0.4,
					textTransform: "uppercase",
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, focused }) => (
						<TabIcon color={color} focused={focused} label="⌂" />
					),
				}}
			/>
			<Tabs.Screen
				name="plan"
				options={{
					title: "Plan",
					tabBarIcon: ({ color, focused }) => (
						<TabIcon color={color} focused={focused} label="▤" />
					),
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					title: "History",
					tabBarIcon: ({ color, focused }) => (
						<TabIcon color={color} focused={focused} label="◷" />
					),
				}}
			/>
			<Tabs.Screen
				name="stats"
				options={{
					title: "Stats",
					tabBarIcon: ({ color, focused }) => (
						<TabIcon color={color} focused={focused} label="↗" />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ color, focused }) => (
						<TabIcon color={color} focused={focused} label="⚙" />
					),
				}}
			/>
		</Tabs>
	);
}
