import type { ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	type PressableProps,
	ScrollView,
	type ScrollViewProps,
	StyleSheet,
	type StyleProp,
	Text,
	type TextStyle,
	View,
	type ViewStyle,
} from "react-native";
import { colors, layout, radius, spacing, typography } from "@/theme";

export function LoadingScreen() {
	return (
		<View style={uiStyles.centered}>
			<ActivityIndicator color={colors.primary} />
		</View>
	);
}

export function Screen({
	children,
	narrow = false,
	style,
	...props
}: ScrollViewProps & {
	children: ReactNode;
	narrow?: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<ScrollView
			{...props}
			contentContainerStyle={[
				uiStyles.screen,
				narrow && uiStyles.screenNarrow,
				props.contentContainerStyle,
				style,
			]}
		>
			{children}
		</ScrollView>
	);
}

export function PageHeader({
	eyebrow,
	title,
	description,
	aside,
}: {
	eyebrow?: string;
	title: string;
	description?: string;
	aside?: ReactNode;
}) {
	return (
		<View style={uiStyles.header}>
			<View style={uiStyles.headerCopy}>
				{eyebrow ? <Text style={uiStyles.eyebrow}>{eyebrow}</Text> : null}
				<Text style={uiStyles.title}>{title}</Text>
				{description ? (
					<Text style={uiStyles.description}>{description}</Text>
				) : null}
			</View>
			{aside ? <View style={uiStyles.headerAside}>{aside}</View> : null}
		</View>
	);
}

export function Card({
	children,
	title,
	subtitle,
	style,
}: {
	children?: ReactNode;
	title?: string;
	subtitle?: string;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View style={[uiStyles.card, style]}>
			{title ? <Text style={uiStyles.cardTitle}>{title}</Text> : null}
			{subtitle ? <Text style={uiStyles.bodyMuted}>{subtitle}</Text> : null}
			{children}
		</View>
	);
}

export function SectionLabel({ children }: { children: ReactNode }) {
	return <Text style={uiStyles.sectionLabel}>{children}</Text>;
}

export function BodyText({
	children,
	muted = false,
	style,
}: {
	children: ReactNode;
	muted?: boolean;
	style?: StyleProp<TextStyle>;
}) {
	return (
		<Text style={[muted ? uiStyles.bodyMuted : uiStyles.body, style]}>
			{children}
		</Text>
	);
}

export function StatusPill({
	label,
	tone = "neutral",
}: {
	label: string;
	tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
	return (
		<View style={[uiStyles.pill, pillStyles[tone]]}>
			<Text style={[uiStyles.pillText, pillTextStyles[tone]]}>{label}</Text>
		</View>
	);
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
	label,
	variant = "secondary",
	compact = false,
	style,
	...props
}: Omit<PressableProps, "style"> & {
	label: string;
	variant?: ButtonVariant;
	compact?: boolean;
	style?: PressableProps["style"];
}) {
	return (
		<Pressable
			accessibilityRole={props.accessibilityRole ?? "button"}
			{...props}
			style={(state) => [
				uiStyles.button,
				compact && uiStyles.buttonCompact,
				buttonStyles[variant],
				props.disabled && uiStyles.buttonDisabled,
				state.pressed && !props.disabled && uiStyles.buttonPressed,
				typeof style === "function" ? style(state) : style,
			]}
		>
			<Text
				style={[
					uiStyles.buttonText,
					buttonTextStyles[variant],
					props.disabled && uiStyles.buttonTextDisabled,
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export function SegmentedControl<T extends string>({
	items,
	value,
	onChange,
	labelForItem,
}: {
	items: T[];
	value: T;
	onChange: (value: T) => void;
	labelForItem?: (value: T) => string;
}) {
	return (
		<View accessibilityRole="tablist" style={uiStyles.segmented}>
			{items.map((item) => {
				const selected = value === item;
				return (
					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						key={item}
						style={[uiStyles.segment, selected && uiStyles.segmentActive]}
						onPress={() => onChange(item)}
					>
						<Text
							style={[
								uiStyles.segmentText,
								selected && uiStyles.segmentTextActive,
							]}
						>
							{labelForItem?.(item) ?? item}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export const uiStyles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	screen: {
		flexGrow: 1,
		width: "100%",
		maxWidth: layout.maxContentWidth,
		alignSelf: "center",
		gap: spacing.lg,
		paddingTop: spacing.lg,
		paddingHorizontal: spacing.lg,
		paddingBottom: layout.bottomTabBarInset,
		backgroundColor: colors.background,
	},
	screenNarrow: {
		maxWidth: layout.narrowContentWidth,
	},
	header: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: spacing.md,
		padding: spacing.lg,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		boxShadow: `0px 10px 24px ${colors.glow}`,
	},
	headerCopy: { flex: 1, gap: spacing.xs },
	headerAside: { alignItems: "flex-end" },
	eyebrow: {
		color: colors.cyan,
		fontSize: typography.meta,
		fontWeight: "800",
		letterSpacing: 1.4,
		textTransform: "uppercase",
		backgroundColor: colors.cyanSoft,
		alignSelf: "flex-start",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: radius.pill,
	},
	title: {
		color: colors.text,
		fontSize: typography.title,
		fontWeight: "800",
		letterSpacing: -0.7,
	},
	description: {
		color: colors.mutedText,
		fontSize: typography.body,
		lineHeight: 24,
		maxWidth: 780,
	},
	card: {
		gap: spacing.md,
		padding: spacing.lg,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.lg,
		backgroundColor: colors.card,
		boxShadow: `0px 12px 26px ${colors.glow}`,
	},
	cardTitle: {
		color: colors.text,
		fontSize: typography.cardTitle,
		fontWeight: "800",
	},
	sectionLabel: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: "800",
		marginTop: spacing.sm,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	body: { color: colors.text, fontSize: typography.body, lineHeight: 24 },
	bodyMuted: {
		color: colors.mutedText,
		fontSize: typography.body,
		lineHeight: 24,
	},
	pill: {
		minHeight: 32,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing.md,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surfaceRaised,
	},
	pillText: {
		color: colors.text,
		fontSize: typography.meta,
		fontWeight: "800",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	button: {
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		boxShadow: `0px 8px 18px ${colors.glow}`,
	},
	buttonCompact: {
		flex: 1,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	buttonPressed: {
		opacity: 0.86,
		transform: [{ scale: 0.98 }],
		boxShadow: `0px 8px 18px ${colors.glow}`,
	},
	buttonDisabled: { opacity: 0.58 },
	buttonText: {
		fontSize: typography.body,
		fontWeight: "800",
		textAlign: "center",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	buttonTextDisabled: { color: colors.subtleText },
	segmented: {
		flexDirection: "row",
		gap: spacing.xs,
		padding: spacing.xs,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surfaceRaised,
	},
	segment: {
		flex: 1,
		minHeight: layout.androidMinTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing.sm,
		borderRadius: radius.pill,
	},
	segmentActive: { backgroundColor: colors.primary },
	segmentText: {
		color: colors.mutedText,
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
	},
	segmentTextActive: { color: colors.primaryStrong },
});

const buttonStyles = StyleSheet.create({
	primary: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	secondary: {
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceRaised,
	},
	danger: {
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	ghost: {
		borderColor: colors.border,
		backgroundColor: "transparent",
	},
});

const buttonTextStyles = StyleSheet.create({
	primary: { color: colors.primaryStrong },
	secondary: { color: colors.text },
	danger: { color: colors.danger },
	ghost: { color: colors.text },
});

const pillStyles = StyleSheet.create({
	neutral: {
		borderColor: colors.border,
		backgroundColor: colors.surface,
	},
	success: {
		borderColor: colors.success,
		backgroundColor: colors.successSoft,
	},
	warning: {
		borderColor: colors.warning,
		backgroundColor: colors.warningSoft,
	},
	danger: {
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	info: {
		borderColor: colors.cyan,
		backgroundColor: colors.cyanSoft,
	},
});

const pillTextStyles = StyleSheet.create({
	neutral: { color: colors.mutedText },
	success: { color: colors.success },
	warning: { color: colors.warning },
	danger: { color: colors.danger },
	info: { color: colors.cyan },
});
