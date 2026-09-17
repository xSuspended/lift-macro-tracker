import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Elapsed } from '@/components/elapsed';
import { ExerciseCard } from '@/components/exercise-card';
import { ExercisePicker } from '@/components/exercise-picker';
import { SetEntry, type SetValues } from '@/components/set-entry';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatNumber, formatTime } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';
import type { Exercise, LoggedSet, WorkoutDetail } from '@/lib/types';
import {
  addSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  groupByExercise,
  type ExerciseGroup,
} from '@/lib/workouts';

// Starting values for an exercise's first set in this workout.
const DEFAULT_WEIGHT_KG = 20;
const DEFAULT_REPS = 10;

type Props = {
  workout: WorkoutDetail;
  onFinished: () => void;
  onDeleted: () => void;
};

export function ActiveWorkout({ workout, onFinished, onDeleted }: Props) {
  const [sets, setSets] = useState<LoggedSet[]>(workout.sets);
  // Exercises added to the workout that have no sets saved yet. The database
  // only knows an exercise is in a workout once a set exists.
  const [added, setAdded] = useState<Pick<Exercise, 'id' | 'name'>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    workout.sets.length ? workout.sets[workout.sets.length - 1].exercise_id : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logged = groupByExercise(sets);
  const groups: ExerciseGroup[] = [
    ...logged,
    ...added
      .filter((e) => !logged.some((g) => g.exerciseId === e.id))
      .map((e) => ({ exerciseId: e.id, name: e.name, sets: [] })),
  ];
  const selected = groups.find((g) => g.exerciseId === selectedId) ?? null;
  const lastSet = selected?.sets[selected.sets.length - 1];

  function handlePick(exercise: Exercise) {
    setPickerOpen(false);
    if (!groups.some((g) => g.exerciseId === exercise.id)) {
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
        onDeleted();
      } else {
        await finishWorkout(workout.id);
        onFinished();
      }
    } catch (e) {
      setError(errorMessage(e));
      setFinishing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.clock}>
          <Elapsed since={workout.started_at} style={styles.clockValue} />
          <Text style={styles.clockLabel}>Started {formatTime(workout.started_at)}</Text>
        </View>
        <View style={styles.finish}>
          <Button label="Finish" onPress={handleFinish} variant="secondary" loading={finishing} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {groups.length === 0 ? (
          <Text style={styles.hint}>Add your first exercise to start logging sets.</Text>
        ) : null}

        {groups.map((group) => (
          <ExerciseCard
            key={group.exerciseId}
            group={group}
            selected={group.exerciseId === selectedId}
            onSelect={() => setSelectedId(group.exerciseId)}
            onDeleteSet={handleDeleteSet}
          />
        ))}

        <Button label="Add exercise" onPress={() => setPickerOpen(true)} variant="secondary" />
      </ScrollView>

      {selected ? (
        <SetEntry
          // A new key resets the steppers when you switch exercise.
          key={selected.exerciseId}
          exerciseName={selected.name}
          initialWeightKg={lastSet?.weight_kg ?? DEFAULT_WEIGHT_KG}
          initialReps={lastSet?.reps ?? DEFAULT_REPS}
          onAdd={handleAddSet}
        />
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
  clock: { gap: 2 },
  clockValue: { color: colors.text, fontSize: 28, fontWeight: '700' },
  clockLabel: { color: colors.textDim, fontSize: 13 },
  finish: { width: 120 },
  error: { color: colors.danger, fontSize: 15, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  hint: { color: colors.textDim, fontSize: 16, textAlign: 'center', paddingVertical: spacing.xl },
});
