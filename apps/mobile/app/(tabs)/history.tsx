import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../src/theme';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.description}>
        Workout and body weight history timelines will appear here as more logging flows are added.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
});
