import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { FoodLog } from '@/lib/types';

type Props = {
  label: string;
  logs: FoodLog[];
  onAdd: () => void;
  onPressLog: (log: FoodLog) => void;
  onSaveMeal: () => void;
};

function describeAmount(log: FoodLog) {
  if (!log.food_id || !log.grams) return 'Quick add';
  const serving = log.food;
  if (serving?.serving_name && serving.serving_grams) {
    const count = log.grams / serving.serving_grams;
    if (Number.isInteger(count * 2)) return `${formatNumber(count)} × ${serving.serving_name} (${formatNumber(log.grams)} g)`;
  }
  return `${formatNumber(log.grams)} g`;
}

export function MealSection({ label, logs, onAdd, onPressLog, onSaveMeal }: Props) {
  const kcal = logs.reduce((sum, log) => sum + log.kcal, 0);
  const canSave = logs.some((log) => log.food_id);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {logs.length ? <Text style={styles.kcal}>{Math.round(kcal)} kcal</Text> : null}
      </View>

      {logs.map((log) => (
        <Pressable
          key={log.id}
          onPress={() => onPressLog(log)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {log.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {describeAmount(log)} · P {Math.round(log.protein_g)} · C {Math.round(log.carbs_g)} · F{' '}
              {Math.round(log.fat_g)}
            </Text>
          </View>
          <Text style={styles.rowKcal}>{Math.round(log.kcal)}</Text>
        </Pressable>
      ))}

      <View style={styles.actions}>
        <Pressable
          onPress={onAdd}
          accessibilityLabel={`Add food to ${label}`}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <Ionicons name="add" size={20} color={colors.accent} />
          <Text style={styles.addText}>Add food</Text>
        </Pressable>
        {canSave ? (
          <Pressable
            onPress={onSaveMeal}
            accessibilityLabel={`Save ${label} as a meal`}
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
            <Ionicons name="bookmark-outline" size={18} color={colors.textDim} />
            <Text style={styles.saveText}>Save meal</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 2,
  },
  label: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  kcal: { color: colors.textDim, fontSize: 13 },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.cardPressed },
  rowText: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 12 },
  rowKcal: { color: colors.text, fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  add: {
    flex: 1,
    minHeight: TAP_TARGET - 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  addText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  save: {
    minHeight: TAP_TARGET - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  saveText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
});
