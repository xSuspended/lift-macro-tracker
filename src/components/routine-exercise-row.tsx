import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View, type GestureResponderHandlers } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';
import type { RoutineExercise } from '@/lib/types';

export const ROUTINE_ROW_HEIGHT = 64;

type Props = {
  item: RoutineExercise;
  dragHandlers: GestureResponderHandlers;
  dragging: boolean;
  onChangeSets: (targetSets: number) => void;
  onRemove: () => void;
};

const MAX_SETS = 10;

export function RoutineExerciseRow({ item, dragHandlers, dragging, onChangeSets, onRemove }: Props) {
  return (
    <View style={[styles.row, dragging && styles.dragging]}>
      <View {...dragHandlers} accessibilityLabel={`Hold and drag to move ${item.exercise_name}`} style={styles.grip}>
        <Ionicons name="reorder-three" size={26} color={dragging ? colors.accent : colors.textDim} />
      </View>

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
    height: ROUTINE_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dragging: { borderColor: colors.accent, backgroundColor: colors.cardPressed },
  grip: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
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
