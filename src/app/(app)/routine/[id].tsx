import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ExercisePicker } from '@/components/exercise-picker';
import { RoutineExerciseRow } from '@/components/routine-exercise-row';
import { LoadingScreen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/format';
import {
  addRoutineExercise,
  deleteRoutine,
  getRoutine,
  removeRoutineExercise,
  renameRoutine,
  setTargetSets,
} from '@/lib/routines';
import { colors, spacing } from '@/lib/theme';
import type { Exercise, Routine, RoutineExercise } from '@/lib/types';

/** Edit a routine. Every change saves straight away. */
export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [name, setName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/workout');
  }, []);

  const refresh = useCallback(async () => {
    const found = await getRoutine(id);
    if (!found) leave();
    else setRoutine(found);
    return found;
  }, [id, leave]);

  useEffect(() => {
    refresh()
      .then((found) => found && setName(found.name))
      .catch((e) => setError(errorMessage(e)));
  }, [refresh]);

  async function save(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
    await refresh().catch((e) => setError(errorMessage(e)));
  }

  function handleRename() {
    const trimmed = name.trim();
    if (!routine || !trimmed || trimmed === routine.name) {
      if (routine) setName(routine.name);
      return;
    }
    save(() => renameRoutine(routine.id, trimmed));
  }

  function handlePick(exercise: Exercise) {
    setPickerOpen(false);
    if (!routine) return;
    if (routine.exercises.some((e) => e.exercise_id === exercise.id)) {
      setError(`${exercise.name} is already in this routine.`);
      return;
    }
    const position = routine.exercises.reduce((max, e) => Math.max(max, e.position + 1), 0);
    save(() => addRoutineExercise(routine.id, exercise.id, position));
  }

  function handleChangeSets(item: RoutineExercise, targetSets: number) {
    if (!routine) return;
    // Update the screen immediately so repeated taps feel instant.
    setRoutine({
      ...routine,
      exercises: routine.exercises.map((e) => (e.id === item.id ? { ...e, target_sets: targetSets } : e)),
    });
    setTargetSets(item.id, targetSets).catch((e) => {
      setError(errorMessage(e));
      refresh();
    });
  }

  function handleRemove(item: RoutineExercise) {
    save(() => removeRoutineExercise(item.id));
  }

  async function handleDelete() {
    if (!routine) return;
    const ok = await confirm(
      `Delete "${routine.name}"?`,
      'Workouts you already logged with it are kept.',
      'Delete',
    );
    if (!ok) return;

    setError(null);
    setDeleting(true);
    try {
      await deleteRoutine(routine.id);
      leave();
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  if (!routine) {
    return error ? <Text style={[styles.error, styles.padded]}>{error}</Text> : <LoadingScreen />;
  }

  return (
    <>
      <Stack.Screen options={{ title: routine.name }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={handleRename}
          onSubmitEditing={handleRename}
          returnKeyType="done"
          placeholder="e.g. Arm Day"
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Exercises</Text>
          {routine.exercises.length === 0 ? (
            <Text style={styles.empty}>No exercises yet. Add the ones you do on this day.</Text>
          ) : null}
          {routine.exercises.map((item) => (
            <RoutineExerciseRow
              key={item.id}
              item={item}
              onChangeSets={(n) => handleChangeSets(item, n)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Add exercise" onPress={() => setPickerOpen(true)} variant="secondary" />

        <View style={styles.danger}>
          <Button label="Delete routine" onPress={handleDelete} variant="danger" loading={deleting} />
        </View>
      </ScrollView>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: { color: colors.textDim, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
  padded: { padding: spacing.xl },
  danger: { marginTop: spacing.xl },
});
