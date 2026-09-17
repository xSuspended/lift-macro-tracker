import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChangeTile } from '@/components/change-tile';
import { LineChart } from '@/components/line-chart';
import { Stepper } from '@/components/stepper';
import { deleteBodyWeight, listBodyWeights, logBodyWeight, type BodyWeight } from '@/lib/body-weight';
import { confirm } from '@/lib/confirm';
import { describeDay, fromDateKey, todayKey } from '@/lib/dates';
import { errorMessage, formatNumber } from '@/lib/format';
import { changeOverSeries } from '@/lib/progress';
import { colors, radius, spacing } from '@/lib/theme';
import { formatWeight, toDisplay, toKg, useUnits } from '@/lib/units';

const PERIODS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: 'Year', days: 365 },
];

// Where the stepper starts before your first weigh-in.
const STARTING_KG = 75;

const shortDate = (day: string) => fromDateKey(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Log today's weight and see the trend. */
export function BodyWeightProgress() {
  const { unit } = useUnits();
  const [entries, setEntries] = useState<BodyWeight[] | null>(null);
  // What's on the stepper, in your unit. null = follow your latest weigh-in.
  const [draft, setDraft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listBodyWeights()
      .then(setEntries)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useFocusEffect(load);

  const today = todayKey();
  const latest = entries?.[entries.length - 1];
  const loggedToday = latest?.logged_on === today;
  const value = draft ?? toDisplay(latest?.weight_kg ?? STARTING_KG, unit);

  async function handleLog() {
    setError(null);
    setBusy(true);
    try {
      await logBodyWeight(today, toKg(value, unit));
      setDraft(null);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entry: BodyWeight) {
    const ok = await confirm('Delete this weigh-in?', `${describeDay(entry.logged_on)}: ${formatWeight(entry.weight_kg, unit)}`, 'Delete');
    if (!ok) return;
    setError(null);
    try {
      await deleteBodyWeight(entry.id);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const series = (entries ?? []).map((e) => ({ day: e.logged_on, value: e.weight_kg }));

  return (
    <View style={styles.gap}>
      <View style={styles.card}>
        <Stepper label={`Today (${unit})`} value={value} onChange={setDraft} step={0.1} min={20} max={700} allowDecimal />
        <Button label={loggedToday ? 'Update today’s weight' : 'Log today’s weight'} onPress={handleLog} loading={busy} />
      </View>

      {error ? (
        <View style={styles.gap}>
          <Text style={styles.error}>{error}</Text>
          {!entries ? <Button label="Try again" onPress={load} variant="secondary" /> : null}
        </View>
      ) : null}

      {entries === null && !error ? <ActivityIndicator color={colors.accent} /> : null}

      {entries && entries.length === 0 ? (
        <Text style={styles.dim}>Log your weight a few mornings a week and the trend will show here.</Text>
      ) : null}

      {latest ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.label}>Latest</Text>
                <Text style={styles.bigValue}>
                  {formatNumber(toDisplay(latest.weight_kg, unit))} <Text style={styles.unit}>{unit}</Text>
                </Text>
              </View>
              <Text style={styles.dim}>{describeDay(latest.logged_on)}</Text>
            </View>
            {entries && entries.length > 1 ? (
              <LineChart unit={unit} points={entries.map((e) => ({ label: shortDate(e.logged_on), value: toDisplay(e.weight_kg, unit) }))} />
            ) : null}
          </View>

          <View style={styles.tiles}>
            {PERIODS.map((period) => {
              const change = changeOverSeries(series, period.days);
              return (
                <ChangeTile
                  key={period.label}
                  label={period.label}
                  change={change ? { ...change, delta: toDisplay(change.delta, unit) } : null}
                  unit={unit}
                  neutral
                />
              );
            })}
          </View>

          <View style={styles.list}>
            {[...(entries ?? [])]
              .reverse()
              .slice(0, 5)
              .map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <Text style={styles.rowDay}>{describeDay(entry.logged_on)}</Text>
                  <Text style={styles.rowValue}>{formatWeight(entry.weight_kg, unit)}</Text>
                  <Pressable
                    accessibilityLabel={`Delete weigh-in from ${describeDay(entry.logged_on)}`}
                    onPress={() => handleDelete(entry)}
                    style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                    <Ionicons name="close" size={20} color={colors.textDim} />
                  </Pressable>
                </View>
              ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  bigValue: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 2 },
  unit: { color: colors.textDim, fontSize: 15, fontWeight: '400' },
  dim: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 15 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.xs },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  rowDay: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  delete: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.cardPressed },
});
