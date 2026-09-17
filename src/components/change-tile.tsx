import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { Change } from '@/lib/progress';
import { colors, radius, spacing } from '@/lib/theme';

/** "Week  ↑ 2.3%  +1.8 kg" — or a dash when there isn't enough history yet. */
export function ChangeTile({ label, change, unit }: { label: string; change: Change | null; unit: string }) {
  const up = change !== null && change.delta >= 0;
  const tint = change === null ? colors.textDim : up ? colors.success : colors.danger;

  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      {change === null ? (
        <Text style={[styles.value, { color: tint }]}>—</Text>
      ) : (
        <View style={styles.valueRow}>
          <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={15} color={tint} />
          <Text style={[styles.value, { color: tint }]}>{Math.abs(change.percent).toFixed(1)}%</Text>
        </View>
      )}
      <Text style={styles.delta}>
        {change === null
          ? 'Not enough data'
          : `${up ? '+' : '−'}${Math.round(Math.abs(change.delta) * 10) / 10} ${unit}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontSize: 19, fontWeight: '700' },
  delta: { color: colors.textDim, fontSize: 11 },
});
