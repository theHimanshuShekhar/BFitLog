import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../src/theme';

export default function PlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.description}>
        Training plan viewing and seeded Day 1–4 data come after the body-weight vertical slice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: colors.mutedText, fontSize: 16, lineHeight: 24 },
});
