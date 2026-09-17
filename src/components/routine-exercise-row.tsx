import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { RoutineExercise } from '@/lib/types';

type Props = {
  item: RoutineExercise;
  onChangeSets: (targetSets: number) => void;
  onRemove: () => void;
};

const MAX_SETS = 10;

export function RoutineExerciseRow({ item, onChangeSets, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {item.exercise_name}
        </Text>
        <Text style={styles.meta}>
          {item.target_sets} {item.target_sets === 1 ? 'set' : 'sets'}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={`Fewer sets of ${item.exercise_name}`}
        disabled={item.target_sets <= 1}
        onPress={() => onChangeSets(item.target_sets - 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, item.target_sets <= 1 && styles.disabled]}>
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <Pressable
        accessibilityLabel={`More sets of ${item.exercise_name}`}
        disabled={item.target_sets >= MAX_SETS}
        onPress={() => onChangeSets(item.target_sets + 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, item.target_sets >= MAX_SETS && styles.disabled]}>
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${item.exercise_name}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: TAP_TARGET + 8,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  text: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13 },
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: { backgroundColor: colors.cardPressed },
  disabled: { opacity: 0.35 },
});
