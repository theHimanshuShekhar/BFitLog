import type { BodyWeightLog } from '@bfitlog/shared';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '../theme';
import { createClientId } from './id';
import { getBodyWeightRepository } from './repository';

type Props = {
  userId: string;
  onSaved?: (log: BodyWeightLog) => void;
};

export function AddBodyWeightLogForm({ userId, onSaved }: Props) {
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [syncStatus, setSyncStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsedWeight = Number(weightKg);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid weight', 'Enter your body weight in kg.');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const log: BodyWeightLog = {
      id: createClientId(),
      userId,
      measuredAt: now,
      weightKg: Math.round(parsedWeight * 10) / 10,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const repository = getBodyWeightRepository();
      await repository.saveLog(log);
      onSaved?.(log);
      setWeightKg('');
      setNote('');
      setSyncStatus('Saved locally; syncing…');
      await repository.sync();
      setSyncStatus('Synced');
    } catch (error) {
      setSyncStatus('Saved locally; sync pending');
      Alert.alert('Sync pending', error instanceof Error ? error.message : 'Body weight saved locally.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add body weight</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="90.0"
        placeholderTextColor={colors.mutedText}
        value={weightKg}
        onChangeText={setWeightKg}
      />
      <TextInput
        style={styles.input}
        placeholder="Optional note"
        placeholderTextColor={colors.mutedText}
        value={note}
        onChangeText={setNote}
      />
      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save body weight'}</Text>
      </Pressable>
      <Text style={styles.status}>{syncStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.card },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  input: { color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: spacing.md, backgroundColor: colors.surface },
  button: { alignItems: 'center', padding: spacing.md, borderRadius: 999, backgroundColor: colors.primary, marginTop: spacing.sm },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  status: { color: colors.mutedText, fontSize: 13 },
});
