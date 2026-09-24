import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Elapsed } from '@/components/elapsed';
import { HistoryRow } from '@/components/history-row';
import { RoutineCard } from '@/components/routine-card';
import { LoadingScreen } from '@/components/screen';
import { TooltipIconButton } from '@/components/tooltip-icon-button';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatTime } from '@/lib/format';
import { forgetRoutine, rememberRoutine } from '@/lib/plans';
import { createRoutine, listRoutines } from '@/lib/routines';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { Routine, Workout, WorkoutHistoryItem } from '@/lib/types';
import {
  deleteWorkout,
  getActiveWorkout,
  getWorkoutDetail,
  listWorkoutHistory,
  pauseWorkout,
  startWorkout,
  unpauseWorkout,
} from '@/lib/workouts';

type Loaded = { active: Workout | null; routines: Routine[]; history: WorkoutHistoryItem[] };

export default function WorkoutTab() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pausing, setPausing] = useState(false);

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

  async function togglePause(workout: Workout) {
    setError(null);
    setPausing(true);
    try {
      if (workout.paused_at) await unpauseWorkout(workout);
      else await pauseWorkout(workout);
      const active = await getActiveWorkout();
      setData((current) => (current ? { ...current, active } : current));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPausing(false);
    }
  }

  async function quit(workout: Workout) {
    setError(null);
    let sets;
    try {
      ({ sets } = await getWorkoutDetail(workout.id));
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    const message = sets.length
      ? `This deletes the workout and the ${sets.length} ${sets.length === 1 ? 'set' : 'sets'} in it. To keep them, tap Resume and then Finish.`
      : 'Nothing was logged, so there is nothing to lose.';
    if (!(await confirm('Quit workout?', message, 'Quit'))) return;

    run(async () => {
      await deleteWorkout(workout.id);
      await forgetRoutine(workout.id);
      load();
    });
  }

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
            <View style={[styles.activeCard, active.paused_at && styles.activeCardPaused]}>
              <View style={styles.activeHeader}>
                <Text style={styles.activeTitle}>{active.paused_at ? 'Workout paused' : 'Workout in progress'}</Text>
                <View style={styles.clock}>
                  <Ionicons
                    name={active.paused_at ? 'pause' : 'time-outline'}
                    size={15}
                    color={active.paused_at ? colors.warning : colors.textDim}
                  />
                  <Elapsed workout={active} style={[styles.clockText, active.paused_at ? styles.clockPaused : {}]} />
                </View>
              </View>
              <Text style={styles.activeMeta}>Started {formatTime(active.started_at)}</Text>
              <View style={styles.activeButtons}>
                <View style={styles.hopIn}>
                  <Button label="Hop back in" onPress={() => openWorkout(active.id)} />
                </View>
                <View style={styles.pause}>
                  <Button
                    label={active.paused_at ? 'Unpause' : 'Pause'}
                    onPress={() => togglePause(active)}
                    variant="warning"
                    loading={pausing}
                    compact
                  />
                </View>
                <TooltipIconButton
                  icon="trash-outline"
                  label="Quit workout"
                  color={colors.danger}
                  onPress={() => quit(active)}
                  style={styles.quit}
                />
              </View>
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
              {!active ? (
                <View style={styles.flex}>
                  <Button label="New workout" onPress={() => start()} variant="secondary" disabled={busy} />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Button label="New routine" onPress={newRoutine} variant="secondary" disabled={busy} />
              </View>
            </View>
            <Button
              label="Add a shared routine"
              onPress={() => router.push('/routine/import')}
              variant="secondary"
              disabled={busy}
              compact
            />
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
  activeCardPaused: { borderColor: colors.warning },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  activeTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  clockPaused: { color: colors.warning },
  activeMeta: { color: colors.textDim, fontSize: 14, marginBottom: spacing.sm },
  // Hop back in / Pause share the row 70 / 30; the bin keeps a fixed thumb-sized square.
  activeButtons: { flexDirection: 'row', gap: spacing.sm },
  hopIn: { flex: 7 },
  pause: { flex: 3 },
  quit: { width: TAP_TARGET },
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
