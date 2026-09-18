import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import { formatWeight, useUnits } from '@/lib/units';

type Props = {
  /** "1", "2"... for working sets, "W" for warm-ups. */
  label: string;
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  note?: string | null;
  /** Saved on the device only, waiting for signal. */
  pending?: boolean;
  onDelete?: () => void;
};

export function SetRow({ label, weightKg, reps, rpe, isWarmup, note, pending, onDelete }: Props) {
  const { unit } = useUnits();
  return (
    <View style={[styles.row, !onDelete && styles.rowReadOnly]}>
      <Text style={[styles.label, isWarmup && styles.warmup]}>{label}</Text>
      <View style={styles.body}>
        <Text style={[styles.main, isWarmup && styles.dim]}>
          {formatWeight(weightKg, unit)} × {reps}
        </Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {rpe !== null ? <Text style={styles.rpe}>RPE {formatNumber(rpe)}</Text> : null}
      {pending ? (
        <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} accessibilityLabel="Waiting for signal" />
      ) : null}
      {onDelete ? (
        <Pressable
          accessibilityLabel="Delete set"
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingLeft: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  rowReadOnly: { paddingRight: spacing.md },
  label: {
    width: 22,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  warmup: { color: colors.textDim, fontWeight: '600' },
  body: { flex: 1, paddingVertical: spacing.xs, gap: 2 },
  main: { color: colors.text, fontSize: 16, fontWeight: '600' },
  note: { color: colors.textDim, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  dim: { color: colors.textDim },
  rpe: { color: colors.textDim, fontSize: 13 },
  delete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: { backgroundColor: colors.cardPressed },
});
