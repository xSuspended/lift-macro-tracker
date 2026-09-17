import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ExerciseCard } from '@/components/exercise-card';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatDay, formatMinutes, formatTime } from '@/lib/format';
import { createRoutineFromWorkout } from '@/lib/routines';
import { colors, radius, spacing } from '@/lib/theme';
import type { WorkoutDetail } from '@/lib/types';
import { deleteWorkout, groupByExercise } from '@/lib/workouts';

type Props = {
  workout: WorkoutDetail & { finished_at: string };
  onDeleted: () => void;
};

/** A finished workout, read-only. */
export function WorkoutSummary({ workout, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = groupByExercise(workout.sets);
  const workingCount = workout.sets.filter((s) => !s.is_warmup).length;

  async function handleSaveAsRoutine() {
    setError(null);
    setSaving(true);
    try {
      const id = await createRoutineFromWorkout(`${formatDay(workout.started_at)} routine`, workout);
      router.push({ pathname: '/routine/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm('Delete this workout?', 'All of its sets will be deleted too.', 'Delete');
    if (!ok) return;

    setError(null);
    setDeleting(true);
    try {
      await deleteWorkout(workout.id);
      onDeleted();
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.stats}>
        <Text style={styles.meta}>
          {formatTime(workout.started_at)} · {formatMinutes(workout.started_at, workout.finished_at)} ·{' '}
          {workingCount} working {workingCount === 1 ? 'set' : 'sets'}
        </Text>
      </View>

      {groups.map((group) => (
        <ExerciseCard key={group.exerciseId} group={group} />
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {workout.sets.length > 0 ? (
        <Button label="Save as routine" onPress={handleSaveAsRoutine} variant="secondary" loading={saving} />
      ) : null}

      <View style={styles.danger}>
        <Button label="Delete workout" onPress={handleDelete} variant="danger" loading={deleting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stats: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  meta: { color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 15 },
  danger: { marginTop: spacing.lg },
});
