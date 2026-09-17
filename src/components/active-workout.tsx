import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Elapsed } from '@/components/elapsed';
import { ExerciseCard } from '@/components/exercise-card';
import { ExercisePicker } from '@/components/exercise-picker';
import { LastTime } from '@/components/last-time';
import { SetEntry, type SetValues } from '@/components/set-entry';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatNumber, formatTime } from '@/lib/format';
import { forgetRoutine, getRememberedRoutineId } from '@/lib/plans';
import { DEFAULT_TARGET, suggestNext } from '@/lib/progression';
import { getRoutine } from '@/lib/routines';
import { colors, spacing } from '@/lib/theme';
import type { Exercise, LoggedSet, Routine, RoutineExercise, WorkoutDetail } from '@/lib/types';
import {
  addSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getLastSession,
  groupByExercise,
  type ExerciseGroup,
  type LastSession,
} from '@/lib/workouts';

// Starting values for an exercise you've never logged before.
const DEFAULT_WEIGHT_KG = 20;
const DEFAULT_REPS = 10;

type Props = {
  workout: WorkoutDetail;
  onFinished: () => void;
  onDeleted: () => void;
};

type Row = ExerciseGroup & { plan?: RoutineExercise };

export function ActiveWorkout({ workout, onFinished, onDeleted }: Props) {
  const [sets, setSets] = useState<LoggedSet[]>(workout.sets);
  const [routine, setRoutine] = useState<Routine | null>(null);
  // Exercises added during the workout that have no sets saved yet.
  const [added, setAdded] = useState<Pick<Exercise, 'id' | 'name'>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    workout.sets.length ? workout.sets[workout.sets.length - 1].exercise_id : null,
  );
  // Previous session per exercise id; a missing key means not loaded yet.
  const [lastSessions, setLastSessions] = useState<Record<string, LastSession | null>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRememberedRoutineId(workout.id)
      .then((routineId) => (routineId ? getRoutine(routineId) : null))
      .then((found) => {
        if (!found) return;
        setRoutine(found);
        // Jump to the first routine exercise that still needs sets.
        const next =
          found.exercises.find(
            (item) =>
              workout.sets.filter((s) => s.exercise_id === item.exercise_id && !s.is_warmup).length <
              item.target_sets,
          ) ?? found.exercises[0];
        if (next) setSelectedId((current) => current ?? next.exercise_id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [workout.id, workout.sets]);

  useEffect(() => {
    if (!selectedId || selectedId in lastSessions) return;
    const exerciseId = selectedId;
    getLastSession(exerciseId, workout.id)
      .then((session) => setLastSessions((prev) => ({ ...prev, [exerciseId]: session })))
      .catch((e) => {
        setError(errorMessage(e));
        setLastSessions((prev) => ({ ...prev, [exerciseId]: null }));
      });
  }, [selectedId, lastSessions, workout.id]);

  const logged = groupByExercise(sets);
  const planned = routine?.exercises ?? [];
  const isPlanned = (id: string) => planned.some((p) => p.exercise_id === id);
  const isLogged = (id: string) => logged.some((g) => g.exerciseId === id);

  const rows: Row[] = [
    ...planned.map((plan) => ({
      ...(logged.find((g) => g.exerciseId === plan.exercise_id) ?? {
        exerciseId: plan.exercise_id,
        name: plan.exercise_name,
        sets: [],
      }),
      plan,
    })),
    ...logged.filter((g) => !isPlanned(g.exerciseId)),
    ...added
      .filter((e) => !isPlanned(e.id) && !isLogged(e.id))
      .map((e) => ({ exerciseId: e.id, name: e.name, sets: [] })),
  ];

  const selected = rows.find((r) => r.exerciseId === selectedId) ?? null;
  const lastSession = selected ? lastSessions[selected.exerciseId] : undefined;
  const suggestion =
    selected && lastSession ? suggestNext(lastSession.sets, selected.plan ?? DEFAULT_TARGET) : null;
  const lastSetToday = selected?.sets[selected.sets.length - 1];

  function handlePick(exercise: Exercise) {
    setPickerOpen(false);
    if (!rows.some((r) => r.exerciseId === exercise.id)) {
      setAdded([...added, { id: exercise.id, name: exercise.name }]);
    }
    setSelectedId(exercise.id);
  }

  async function handleAddSet(values: SetValues) {
    if (!selected) return;
    const row = await addSet({
      workout_id: workout.id,
      exercise_id: selected.exerciseId,
      set_number: selected.sets.length + 1,
      reps: values.reps,
      weight_kg: values.weightKg,
      rpe: values.rpe,
      is_warmup: values.isWarmup,
    });
    setSets((prev) => [...prev, { ...row, exercise_name: selected.name }]);
  }

  async function handleDeleteSet(set: LoggedSet) {
    const ok = await confirm(
      'Delete this set?',
      `${set.exercise_name}: ${formatNumber(set.weight_kg)} kg × ${set.reps}`,
      'Delete',
    );
    if (!ok) return;

    setError(null);
    try {
      await deleteSet(set.id);
      setSets((prev) => prev.filter((s) => s.id !== set.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleFinish() {
    const empty = sets.length === 0;
    const workingCount = sets.filter((s) => !s.is_warmup).length;
    const ok = await confirm(
      empty ? 'Discard workout?' : 'Finish workout?',
      empty
        ? 'No sets were logged, so this workout will be deleted.'
        : `${workingCount} working ${workingCount === 1 ? 'set' : 'sets'} logged.`,
      empty ? 'Discard' : 'Finish',
    );
    if (!ok) return;

    setError(null);
    setFinishing(true);
    try {
      if (empty) {
        await deleteWorkout(workout.id);
      } else {
        await finishWorkout(workout);
      }
      await forgetRoutine(workout.id);
      if (empty) onDeleted();
      else onFinished();
    } catch (e) {
      setError(errorMessage(e));
      setFinishing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.clock}>
          <Elapsed workout={workout} style={styles.clockValue} />
          <Text style={styles.clockLabel}>
            {routine ? `${routine.name} · ` : ''}Started {formatTime(workout.started_at)}
          </Text>
        </View>
        <View style={styles.finish}>
          <Button label="Finish" onPress={handleFinish} variant="secondary" loading={finishing} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {rows.length === 0 ? (
          <Text style={styles.hint}>Add your first exercise to start logging sets.</Text>
        ) : null}

        {rows.map((row) => (
          <ExerciseCard
            key={row.exerciseId}
            group={row}
            targetSets={row.plan?.target_sets}
            selected={row.exerciseId === selectedId}
            onSelect={() => setSelectedId(row.exerciseId)}
            onDeleteSet={handleDeleteSet}
          />
        ))}

        <Button label="Add exercise" onPress={() => setPickerOpen(true)} variant="secondary" />
      </ScrollView>

      {selected && lastSession === undefined ? (
        <View style={styles.dockLoading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {selected && lastSession !== undefined ? (
        <SetEntry
          // A new key resets the steppers when you switch exercise.
          key={selected.exerciseId}
          exerciseName={selected.name}
          initialWeightKg={lastSetToday?.weight_kg ?? suggestion?.weightKg ?? DEFAULT_WEIGHT_KG}
          initialReps={lastSetToday?.reps ?? suggestion?.reps ?? DEFAULT_REPS}
          onAdd={handleAddSet}>
          <LastTime session={lastSession} suggestion={suggestion} />
        </SetEntry>
      ) : null}

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  clock: { flex: 1, gap: 2 },
  clockValue: { color: colors.text, fontSize: 28, fontWeight: '700' },
  clockLabel: { color: colors.textDim, fontSize: 13 },
  finish: { width: 120 },
  error: { color: colors.danger, fontSize: 15, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  hint: { color: colors.textDim, fontSize: 16, textAlign: 'center', paddingVertical: spacing.xl },
  dockLoading: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
