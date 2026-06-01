import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing } from "../theme";

export type ChartRange = "30d" | "90d" | "1y" | "all";

type Props = {
	logs: BodyWeightLog[];
	goal: BodyWeightGoal | null;
	range: ChartRange;
};

const width = 320;
const height = 180;
const padding = 24;

export function BodyWeightChart({ logs, goal, range }: Props) {
	const visibleLogs = useMemo(() => filterLogs(logs, range), [logs, range]);
	const points = [...visibleLogs].sort((a, b) =>
		a.measuredAt.localeCompare(b.measuredAt),
	);

	if (points.length === 0) {
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>
					No body weight logs in this range yet.
				</Text>
			</View>
		);
	}

	const weights = points.map((log) => log.weightKg);
	if (goal) weights.push(goal.targetKg);
	const minWeight = Math.min(...weights) - 1;
	const maxWeight = Math.max(...weights) + 1;
	const firstTime = new Date(points[0]?.measuredAt ?? Date.now()).getTime();
	const lastTime = new Date(points.at(-1)?.measuredAt ?? Date.now()).getTime();
	const timeSpan = Math.max(lastTime - firstTime, 1);

	const scaled = points.map((log) => {
		const x =
			padding +
			((new Date(log.measuredAt).getTime() - firstTime) / timeSpan) *
				(width - padding * 2);
		const y =
			padding +
			((maxWeight - log.weightKg) / (maxWeight - minWeight)) *
				(height - padding * 2);
		return { x, y, log };
	});

	const path = scaled
		.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
		.join(" ");
	const goalTargetKg = goal?.targetKg ?? null;
	const goalY = goalTargetKg
		? padding +
			((maxWeight - goalTargetKg) / (maxWeight - minWeight)) *
				(height - padding * 2)
		: null;

	return (
		<View style={styles.container}>
			<Svg width="100%" viewBox={`0 0 ${width} ${height}`} height={height}>
				<Line
					x1={padding}
					y1={height - padding}
					x2={width - padding}
					y2={height - padding}
					stroke={colors.border}
					strokeWidth={1}
				/>
				<Line
					x1={padding}
					y1={padding}
					x2={padding}
					y2={height - padding}
					stroke={colors.border}
					strokeWidth={1}
				/>
				{goalY ? (
					<>
						<Line
							x1={padding}
							y1={goalY}
							x2={width - padding}
							y2={goalY}
							stroke={colors.primary}
							strokeDasharray="5 5"
							strokeWidth={1.5}
						/>
						<SvgText
							x={width - padding}
							y={goalY - 4}
							fill={colors.primary}
							fontSize={10}
							textAnchor="end"
						>
							Goal {goalTargetKg?.toFixed(1)}kg
						</SvgText>
					</>
				) : null}
				<Path d={path} stroke={colors.primary} strokeWidth={3} fill="none" />
				{scaled.map((point) => (
					<Circle
						key={point.log.id}
						cx={point.x}
						cy={point.y}
						r={4}
						fill={colors.primary}
					/>
				))}
			</Svg>
			<Text style={styles.summary}>
				Latest: {points.at(-1)?.weightKg.toFixed(1)} kg · Entries:{" "}
				{points.length}
			</Text>
		</View>
	);
}

function filterLogs(logs: BodyWeightLog[], range: ChartRange) {
	const activeLogs = logs.filter((log) => !log.deletedAt);
	if (range === "all") return activeLogs;

	const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return activeLogs.filter(
		(log) => new Date(log.measuredAt).getTime() >= cutoff,
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	empty: {
		padding: spacing.lg,
		borderRadius: 16,
		backgroundColor: colors.card,
	},
	emptyText: { color: colors.mutedText, textAlign: "center" },
	summary: { color: colors.mutedText, fontSize: 14 },
});
