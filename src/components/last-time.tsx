import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { formatDay, formatNumber } from '@/lib/format';
import type { Suggestion } from '@/lib/progression';
import { colors, radius, spacing } from '@/lib/theme';
import { toDisplay, useUnits } from '@/lib/units';
import type { LastSession } from '@/lib/workouts';

type Props = {
  session: LastSession | null;
  suggestion: Suggestion | null;
};

export function LastTime({ session, suggestion }: Props) {
  const { unit } = useUnits();
  if (!session) {
    return <Text style={styles.none}>First time logging this exercise.</Text>;
  }

  const working = session.sets.filter((s) => !s.is_warmup);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>Last time</Text>
        <Text style={styles.date}>{formatDay(session.startedAt)}</Text>
      </View>

      <View style={styles.chips}>
        {working.map((set) => (
          <Text key={set.id} style={styles.chip}>
            {formatNumber(toDisplay(set.weight_kg, unit))} × {set.reps}
          </Text>
        ))}
      </View>

      {suggestion ? (
        <View style={styles.suggestion}>
          <Ionicons name="trending-up" size={18} color={colors.accent} />
          <Text style={styles.suggestionText}>{suggestion.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  date: { color: colors.textDim, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 19 },
  none: { color: colors.textDim, fontSize: 14 },
});
