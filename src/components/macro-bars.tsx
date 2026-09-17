import { StyleSheet, Text, View } from 'react-native';

import { colors, macroColors, radius, spacing } from '@/lib/theme';
import type { DayTotals, Targets } from '@/lib/types';

type Props = {
  totals: Pick<DayTotals, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;
  targets: Targets;
};

const fmt = (n: number) => Math.round(n).toLocaleString();

function Bar({ value, target, color, height }: { value: number; target: number | null; color: string; height: number }) {
  if (!target) return null;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${Math.min(1, value / target) * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** The day's calories and macros against target, as a compact row of bars. */
export function MacroBars({ totals, targets }: Props) {
  const kcalTarget = targets.target_kcal;
  const remaining = kcalTarget ? kcalTarget - totals.kcal : null;

  const macros = [
    { label: 'Protein', value: totals.protein_g, target: targets.target_protein_g, color: macroColors.protein },
    { label: 'Carbs', value: totals.carbs_g, target: targets.target_carbs_g, color: macroColors.carbs },
    { label: 'Fat', value: totals.fat_g, target: targets.target_fat_g, color: macroColors.fat },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.kcalRow}>
        <Text style={styles.kcal}>
          {fmt(totals.kcal)}
          <Text style={styles.kcalTarget}>{kcalTarget ? ` / ${fmt(kcalTarget)} kcal` : ' kcal'}</Text>
        </Text>
        {remaining !== null ? (
          <Text style={[styles.remaining, remaining < 0 && styles.over]}>
            {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(-remaining)} over`}
          </Text>
        ) : null}
      </View>
      <Bar value={totals.kcal} target={kcalTarget} color={macroColors.kcal} height={8} />

      <View style={styles.macros}>
        {macros.map((m) => (
          <View key={m.label} style={styles.macro}>
            <View style={styles.macroText}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <Text style={styles.macroValue}>
                {fmt(m.value)}
                {m.target ? `/${fmt(m.target)}` : ''}
              </Text>
            </View>
            <Bar value={m.value} target={m.target} color={m.color} height={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  kcal: { color: colors.text, fontSize: 26, fontWeight: '700' },
  kcalTarget: { color: colors.textDim, fontSize: 14, fontWeight: '400' },
  remaining: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  over: { color: colors.danger },
  track: { backgroundColor: colors.bg, overflow: 'hidden' },
  macros: { flexDirection: 'row', gap: spacing.md },
  macro: { flex: 1, gap: 5 },
  macroText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 },
  macroLabel: { color: colors.textDim, fontSize: 12 },
  macroValue: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
