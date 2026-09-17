import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { MacroChart } from '@/components/macro-chart';
import { MacroTotals } from '@/components/macro-totals';
import { Segmented } from '@/components/segmented';
import { addDays, todayKey } from '@/lib/dates';
import { getTargets, listDayTotals } from '@/lib/food';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { DayTotals, Targets } from '@/lib/types';

type Range = 'day' | 'week' | 'month';

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: 'day', label: 'Day', days: 1 },
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
];
const LONGEST = 30;

/** Calories and macros: today's breakdown, or a line per day over a week or month. */
export function NutritionProgress() {
  const [range, setRange] = useState<Range>('week');
  const [data, setData] = useState<{ totals: DayTotals[]; targets: Targets } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load a month once; the week and today are just the end of it.
  const load = useCallback(() => {
    setError(null);
    const today = todayKey();
    Promise.all([listDayTotals(addDays(today, -(LONGEST - 1)), today), getTargets()])
      .then(([totals, targets]) => setData({ totals, targets }))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useFocusEffect(load);

  const today = todayKey();
  const spanDays = RANGES.find((r) => r.key === range)!.days;
  const days = Array.from({ length: spanDays }, (_, i) => addDays(today, i - (spanDays - 1)));

  let body;
  if (error && !data) {
    body = (
      <View style={styles.gap}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Try again" onPress={load} variant="secondary" />
      </View>
    );
  } else if (!data) {
    body = <ActivityIndicator color={colors.accent} />;
  } else if (range === 'day') {
    const todayTotals = data.totals.find((t) => t.logged_on === today) ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    body = <MacroTotals totals={todayTotals} targets={data.targets} />;
  } else {
    const t = data.targets;
    const hasAllTargets = [t.target_kcal, t.target_protein_g, t.target_carbs_g, t.target_fat_g].every((v) => v !== null && v > 0);
    body = (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.label}>{range === 'week' ? 'Last 7 days' : 'Last 30 days'}</Text>
          <Text style={styles.dim}>% of daily target</Text>
        </View>
        {hasAllTargets ? (
          <MacroChart days={days} totals={data.totals} targets={t as { [K in keyof Targets]: number }} />
        ) : (
          <View style={styles.gap}>
            <Text style={styles.dim}>Set your calorie and macro targets to see how your days compare.</Text>
            <Button label="Set targets" onPress={() => router.navigate('/settings')} variant="secondary" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Segmented options={RANGES} value={range} onChange={setRange} />
      {body}
      {range !== 'day' && data ? (
        <Text style={styles.hintText}>Hover over or touch the chart to see a day's numbers.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  dim: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  hintText: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
});
