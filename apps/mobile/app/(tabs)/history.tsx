import type { BodyWeightLog } from '@bfitlog/shared';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/use-auth';
import { getBodyWeightRepository } from '@/body-weight/repository';
import { colors, spacing } from '@/theme';

export default function HistoryScreen() {
  const session = useAuth();
  const [logs, setLogs] = useState<BodyWeightLog[]>([]);
  const [syncStatus, setSyncStatus] = useState('Loaded locally');

  const load = useCallback(async () => {
    const repository = getBodyWeightRepository();
    setLogs(await repository.listLogs());
    setSyncStatus('Syncing…');
    try {
      await repository.sync();
      setLogs(await repository.listLogs());
      setSyncStatus('Synced');
    } catch {
      setSyncStatus('Offline / sync pending');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
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
      <Text style={styles.title}>History</Text>
      <Text style={styles.description}>Body weight logs for {session.data.user.name}</Text>
      <Text style={styles.status}>{syncStatus}</Text>

      <Pressable style={styles.secondaryButton} onPress={() => void load()}>
        <Text style={styles.secondaryButtonText}>Refresh</Text>
      </Pressable>

      {logs.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No entries yet</Text>
          <Text style={styles.description}>Add body weight from Home to see it here.</Text>
        </View>
      ) : (
        logs.map((log) => (
          <View key={log.id} style={styles.card}>
            <Text style={styles.cardTitle}>{log.weightKg.toFixed(1)} kg</Text>
            <Text style={styles.status}>{new Date(log.measuredAt).toLocaleString()}</Text>
            {log.note ? <Text style={styles.description}>{log.note}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flexGrow: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
  status: { color: colors.mutedText, fontSize: 14 },
  card: { gap: spacing.xs, padding: spacing.md, borderRadius: 16, backgroundColor: colors.card },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', padding: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
