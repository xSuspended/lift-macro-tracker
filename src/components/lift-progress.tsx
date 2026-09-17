import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChangeTile } from '@/components/change-tile';
import { LineChart } from '@/components/line-chart';
import { Segmented } from '@/components/segmented';
import { SelectModal } from '@/components/select-modal';
import { errorMessage, formatNumber } from '@/lib/format';
import { changeOver, listProgress, parseDateOnly, type Metric } from '@/lib/progress';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { ProgressPoint } from '@/lib/types';

const METRICS: { key: Metric; label: string; title: string }[] = [
  { key: 'est_1rm_kg', label: 'Est. 1RM', title: 'Estimated 1RM' },
  { key: 'top_weight_kg', label: 'Top weight', title: 'Top weight' },
  { key: 'volume_kg', label: 'Volume', title: 'Volume' },
];

const PERIODS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: 'Year', days: 365 },
];

const shortDate = (d: string) => parseDateOnly(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Per-exercise charts of estimated 1RM, top weight and volume. */
export function LiftProgress() {
  const [points, setPoints] = useState<ProgressPoint[] | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('est_1rm_kg');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listProgress()
      .then(setPoints)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useFocusEffect(load);

  if (error && !points) {
    return (
      <View style={styles.gap}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Try again" onPress={load} variant="secondary" />
      </View>
    );
  }
  if (!points) return <ActivityIndicator color={colors.accent} />;
  if (points.length === 0) {
    return <Text style={styles.dim}>Finish a workout and your lifts will be charted here.</Text>;
  }

  // Exercises you've logged, most recently trained first.
  const latestByExercise = new Map<string, ProgressPoint>();
  for (const p of points) latestByExercise.set(p.exercise_id, p);
  const exercises = [...latestByExercise.values()].sort((a, b) => b.workout_date.localeCompare(a.workout_date));

  const current = exercises.find((e) => e.exercise_id === exerciseId) ?? exercises[0];
  const series = points.filter((p) => p.exercise_id === current.exercise_id);
  const latest = series[series.length - 1];
  const metricInfo = METRICS.find((m) => m.key === metric)!;

  return (
    <View style={styles.gap}>
      <Pressable onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.selector, pressed && styles.pressed]}>
        <Ionicons name="barbell" size={20} color={colors.accent} />
        <Text style={styles.selectorText} numberOfLines={1}>
          {current.exercise_name}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textDim} />
      </Pressable>

      <Segmented options={METRICS} value={metric} onChange={setMetric} />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.label}>{metricInfo.title}</Text>
            <Text style={styles.bigValue}>
              {formatNumber(latest[metric])} <Text style={styles.unit}>kg</Text>
            </Text>
          </View>
          <Text style={styles.dim}>
            {series.length} {series.length === 1 ? 'session' : 'sessions'}
          </Text>
        </View>
        <LineChart unit="kg" points={series.map((p) => ({ label: shortDate(p.workout_date), value: p[metric] }))} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Change</Text>
        <View style={styles.tiles}>
          {PERIODS.map((period) => (
            <ChangeTile key={period.label} label={period.label} change={changeOver(series, metric, period.days)} unit="kg" />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Recent sessions</Text>
        {[...series]
          .reverse()
          .slice(0, 5)
          .map((p) => (
            <View key={p.workout_id} style={styles.session}>
              <View style={styles.sessionText}>
                <Text style={styles.sessionDay}>{shortDate(p.workout_date)}</Text>
                <Text style={styles.dim}>
                  {p.set_count} {p.set_count === 1 ? 'set' : 'sets'} · top {formatNumber(p.top_weight_kg)} kg
                </Text>
              </View>
              <Text style={styles.sessionValue}>{formatNumber(p[metric])}</Text>
            </View>
          ))}
      </View>

      <SelectModal
        visible={pickerOpen}
        title="Choose exercise"
        options={exercises.map((e) => ({ id: e.exercise_id, label: e.exercise_name, meta: shortDate(e.workout_date) }))}
        selectedId={current.exercise_id}
        onPick={(id) => {
          setExerciseId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: 16 },
  selector: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  selectorText: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  pressed: { backgroundColor: colors.cardPressed },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  section: { gap: spacing.sm },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  bigValue: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 2 },
  unit: { color: colors.textDim, fontSize: 15, fontWeight: '400' },
  dim: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  session: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  sessionText: { flex: 1, gap: 2 },
  sessionDay: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sessionValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
