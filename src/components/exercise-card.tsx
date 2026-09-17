import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SetRow } from '@/components/set-row';
import { colors, radius, spacing } from '@/lib/theme';
import type { LoggedSet } from '@/lib/types';
import type { ExerciseGroup } from '@/lib/workouts';

type Props = {
  group: ExerciseGroup;
  /** From the routine this workout was started with, if any. */
  targetSets?: number;
  selected?: boolean;
  onSelect?: () => void;
  onDeleteSet?: (set: LoggedSet) => void;
};

/** One exercise and its sets. Tappable while logging, read-only in history. */
export function ExerciseCard({ group, targetSets, selected, onSelect, onDeleteSet }: Props) {
  const workingCount = group.sets.filter((s) => !s.is_warmup).length;
  const done = targetSets !== undefined && workingCount >= targetSets;
  let workingNumber = 0;

  return (
    <Pressable
      disabled={!onSelect}
      onPress={onSelect}
      style={[styles.card, selected && styles.selected]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.count, done && styles.done]}>
          {targetSets !== undefined
            ? `${workingCount} / ${targetSets} sets`
            : workingCount === 1
              ? '1 set'
              : `${workingCount} sets`}
        </Text>
      </View>

      {group.sets.length === 0 ? (
        <Text style={styles.empty}>No sets yet</Text>
      ) : (
        <View style={styles.sets}>
          {group.sets.map((set) => {
            if (!set.is_warmup) workingNumber += 1;
            return (
              <SetRow
                key={set.id}
                label={set.is_warmup ? 'W' : String(workingNumber)}
                weightKg={set.weight_kg}
                reps={set.reps}
                rpe={set.rpe}
                isWarmup={set.is_warmup}
                onDelete={onDeleteSet ? () => onDeleteSet(set) : undefined}
              />
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  selected: { borderColor: colors.accent, borderWidth: 2, padding: spacing.md - 1 },
  header: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  count: { color: colors.textDim, fontSize: 13 },
  done: { color: colors.success, fontWeight: '600' },
  empty: { color: colors.textDim, fontSize: 14, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  sets: { gap: spacing.xs },
});
