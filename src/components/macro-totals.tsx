import { StyleSheet, Text, View } from 'react-native';

import { MacroDonut, type DonutPart } from '@/components/macro-donut';
import { colors, macroColors, radius, spacing } from '@/lib/theme';
import type { DayTotals, Targets } from '@/lib/types';

type Props = {
  totals: Pick<DayTotals, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;
  targets: Targets;
};

// Energy per gram, the standard values used on nutrition labels.
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

const fmt = (n: number) => Math.round(n).toLocaleString();

function Bar({ value, target, color }: { value: number; target: number | null; color: string }) {
  if (!target) return null;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(1, value / target) * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

/**
 * The day's nutrition in one card: calories against target across the top, then
 * a ring (outer: target eaten, inner: where the calories came from) beside each
 * macro's grams, % of target, calories and progress bar.
 */
export function MacroTotals({ totals, targets }: Props) {
  const macros: DonutPart[] = [
    { key: 'protein', label: 'Protein', color: macroColors.protein, grams: totals.protein_g, targetGrams: targets.target_protein_g, kcal: totals.protein_g * KCAL_PER_GRAM.protein },
    { key: 'carbs', label: 'Carbs', color: macroColors.carbs, grams: totals.carbs_g, targetGrams: targets.target_carbs_g, kcal: totals.carbs_g * KCAL_PER_GRAM.carbs },
    { key: 'fat', label: 'Fat', color: macroColors.fat, grams: totals.fat_g, targetGrams: targets.target_fat_g, kcal: totals.fat_g * KCAL_PER_GRAM.fat },
  ];
  const macroKcal = macros.reduce((sum, m) => sum + m.kcal, 0);

  const kcalTarget = targets.target_kcal;
  const remaining = kcalTarget ? kcalTarget - totals.kcal : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
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

      <View style={styles.row}>
        <MacroDonut kcal={totals.kcal} targetKcal={kcalTarget} parts={macros} />

        <View style={styles.side}>
          {macros.map((m) => (
            <View key={m.key} style={styles.macro}>
              <View style={styles.macroTop}>
                <View style={[styles.swatch, { backgroundColor: m.color }]} />
                <Text style={styles.macroName}>{m.label}</Text>
                <Text style={styles.grams}>
                  {fmt(m.grams)}
                  {m.targetGrams ? `/${fmt(m.targetGrams)}` : ''} g
                </Text>
                {m.targetGrams ? (
                  <Text style={[styles.percent, m.grams > m.targetGrams && styles.percentOver]}>
                    {Math.round((m.grams / m.targetGrams) * 100)}%
                  </Text>
                ) : null}
              </View>
              <Text style={styles.macroKcal}>
                {fmt(m.kcal)} kcal{macroKcal > 0 ? ` · ${Math.round((m.kcal / macroKcal) * 100)}% of calories` : ''}
              </Text>
              <Bar value={m.grams} target={m.targetGrams} color={m.color} />
            </View>
          ))}
        </View>
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
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  kcal: { color: colors.text, fontSize: 26, fontWeight: '700' },
  kcalTarget: { color: colors.textDim, fontSize: 14, fontWeight: '400' },
  remaining: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  over: { color: colors.overTarget, textShadowColor: 'rgba(255, 43, 43, 0.6)', textShadowRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  side: { flex: 1, gap: spacing.md },
  macro: { gap: 2 },
  macroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  macroName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  grams: { color: colors.text, fontSize: 12, fontWeight: '600' },
  percent: { minWidth: 32, textAlign: 'right', color: colors.textDim, fontSize: 12, fontWeight: '600' },
  percentOver: { color: colors.overTarget, textShadowColor: 'rgba(255, 43, 43, 0.6)', textShadowRadius: 8 },  macroKcal: { color: colors.textDim, fontSize: 11, marginLeft: 14 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden', marginLeft: 14, marginTop: 2 },
  fill: { height: 5, borderRadius: 3 },
});
