import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { HistoryRow } from '@/components/history-row';
import { RoutineCard } from '@/components/routine-card';
import { LoadingScreen } from '@/components/screen';
import { errorMessage, formatTime } from '@/lib/format';
import { rememberRoutine } from '@/lib/plans';
import { createRoutine, listRoutines } from '@/lib/routines';
import { colors, radius, spacing } from '@/lib/theme';
import type { Routine, Workout, WorkoutHistoryItem } from '@/lib/types';
import { getActiveWorkout, listWorkoutHistory, startWorkout } from '@/lib/workouts';

type Loaded = { active: Workout | null; routines: Routine[]; history: WorkoutHistoryItem[] };

export default function WorkoutTab() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reload whenever this tab comes back into view, e.g. after finishing a workout.
  const load = useCallback(() => {
    setError(null);
    Promise.all([getActiveWorkout(), listRoutines(), listWorkoutHistory()])
      .then(([active, routines, history]) => setData({ active, routines, history }))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useFocusEffect(load);

  function openWorkout(id: string) {
    router.push({ pathname: '/session/[id]', params: { id } });
  }

  function openRoutine(id: string) {
    router.push({ pathname: '/routine/[id]', params: { id } });
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const start = (routine?: Routine) =>
    run(async () => {
      const workout = await startWorkout();
      if (routine) await rememberRoutine(workout.id, routine.id);
      openWorkout(workout.id);
    });

  const newRoutine = () =>
    run(async () => {
      openRoutine(await createRoutine('New routine'));
    });

  if (!data && !error) return <LoadingScreen />;

  const active = data?.active ?? null;
  const routines = data?.routines ?? [];
  const history = data?.history ?? [];

  return (
    <FlatList
      data={history}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          {active ? (
            <View style={styles.activeCard}>
              <Text style={styles.activeTitle}>Workout in progress</Text>
              <Text style={styles.activeMeta}>Started {formatTime(active.started_at)}</Text>
              <Button label="Resume workout" onPress={() => openWorkout(active.id)} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
              <Button label="Try again" onPress={load} variant="secondary" />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Routines</Text>
            {routines.length === 0 ? (
              <Text style={styles.hint}>
                Save a finished workout as a routine, or make one here, to start your usual days in one tap.
              </Text>
            ) : null}
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onStart={active || busy ? undefined : () => start(routine)}
                onEdit={() => openRoutine(routine.id)}
              />
            ))}
            <View style={styles.buttons}>
              <View style={styles.flex}>
                <Button label="New routine" onPress={newRoutine} variant="secondary" disabled={busy} />
              </View>
              {!active ? (
                <View style={styles.flex}>
                  <Button label="Empty workout" onPress={() => start()} variant="secondary" disabled={busy} />
                </View>
              ) : null}
            </View>
          </View>

          {history.length > 0 ? <Text style={styles.sectionLabel}>History</Text> : null}
        </View>
      }
      ListEmptyComponent={data ? <Text style={styles.empty}>Finished workouts will show up here.</Text> : null}
      renderItem={({ item }) => <HistoryRow item={item} onPress={() => openWorkout(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: spacing.xl, marginBottom: spacing.sm },
  activeCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  activeTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  activeMeta: { color: colors.textDim, fontSize: 14, marginBottom: spacing.sm },
  errorBox: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 15 },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  hint: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  empty: { color: colors.textDim, fontSize: 16, textAlign: 'center', paddingVertical: spacing.xxl },
});
