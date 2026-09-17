import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDay, formatMinutes } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { WorkoutHistoryItem } from '@/lib/types';

export function HistoryRow({ item, onPress }: { item: WorkoutHistoryItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.day}>{formatDay(item.started_at)}</Text>
          <Text style={styles.meta}>
            {formatMinutes(item.started_at, item.finished_at, item.paused_seconds)} · {item.workingSetCount}{' '}
            {item.workingSetCount === 1 ? 'set' : 'sets'}
          </Text>
        </View>
        <Text style={styles.exercises} numberOfLines={1}>
          {item.exerciseNames.join(', ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TAP_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.cardPressed },
  text: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  day: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13 },
  exercises: { color: colors.textDim, fontSize: 14 },
});
