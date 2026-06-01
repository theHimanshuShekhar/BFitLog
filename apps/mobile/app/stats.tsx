import type { BodyWeightGoal, BodyWeightLog } from '@bfitlog/shared';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/use-auth';
import { BodyWeightChart, type ChartRange } from '../src/body-weight/BodyWeightChart';
import { getBodyWeightRepository } from '../src/body-weight/repository';
import { colors, spacing } from '../src/theme';

const ranges: ChartRange[] = ['30d', '90d', '1y', 'all'];

export default function StatsScreen() {
  const session = useAuth();
  const [range, setRange] = useState<ChartRange>('30d');
  const [goal, setGoal] = useState<BodyWeightGoal | null>(null);
  const [logs, setLogs] = useState<BodyWeightLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const repository = getBodyWeightRepository();
      repository.sync().catch(() => undefined).finally(() => {
        Promise.all([repository.getGoal(), repository.listLogs()]).then(([nextGoal, nextLogs]) => {
          if (!active) return;
          setGoal(nextGoal);
          setLogs(nextLogs);
        });
      });
      return () => {
        active = false;
      };
    }, []),
  );

  if (session.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session.data) {
    router.replace('/login');
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <Text style={styles.description}>Body weight trend for {session.data.user.name}</Text>

      <View style={styles.rangeRow}>
        {ranges.map((item) => (
          <Pressable key={item} style={[styles.rangeButton, range === item && styles.rangeButtonActive]} onPress={() => setRange(item)}>
            <Text style={[styles.rangeText, range === item && styles.rangeTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <BodyWeightChart logs={logs} goal={goal} range={range} />

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
        <Text style={styles.secondaryButtonText}>Back home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flexGrow: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: colors.mutedText, fontSize: 16 },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeButton: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  rangeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { color: colors.mutedText, fontWeight: '700' },
  rangeTextActive: { color: colors.background },
  secondaryButton: { alignItems: 'center', padding: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
