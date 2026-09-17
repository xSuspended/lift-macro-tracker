import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { Routine } from '@/lib/types';

type Props = {
  routine: Routine;
  /** Omit to show the routine without a start action (e.g. a workout is already running). */
  onStart?: () => void;
  onEdit: () => void;
};

export function RoutineCard({ routine, onStart, onEdit }: Props) {
  const summary = routine.exercises.length
    ? routine.exercises.map((e) => e.exercise_name).join(', ')
    : 'No exercises yet';

  return (
    <View style={styles.card}>
      <Pressable
        disabled={!onStart}
        onPress={onStart}
        accessibilityLabel={`Start ${routine.name}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {routine.name}
          </Text>
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        {onStart ? <Ionicons name="play" size={22} color={colors.accent} /> : null}
      </Pressable>

      <Pressable
        onPress={onEdit}
        accessibilityLabel={`Edit ${routine.name}`}
        style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
        <Ionicons name="create-outline" size={22} color={colors.textDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    minHeight: TAP_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  summary: { color: colors.textDim, fontSize: 14 },
  edit: {
    width: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  pressed: { backgroundColor: colors.cardPressed },
});
