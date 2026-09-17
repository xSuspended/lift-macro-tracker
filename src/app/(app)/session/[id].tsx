import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActiveWorkout } from '@/components/active-workout';
import { Button } from '@/components/button';
import { LoadingScreen } from '@/components/screen';
import { WorkoutSummary } from '@/components/workout-summary';
import { errorMessage, formatDay } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';
import type { WorkoutDetail } from '@/lib/types';
import { getWorkoutDetail } from '@/lib/workouts';

/** One workout: the logging screen while it's running, a summary once finished. */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getWorkoutDetail(id)
      .then(setWorkout)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(load, [load]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/workout');
  }

  const title = workout?.finished_at ? formatDay(workout.started_at) : 'Workout';

  let body;
  if (error) {
    body = (
      <View style={styles.centred}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Try again" onPress={load} variant="secondary" />
      </View>
    );
  } else if (!workout) {
    body = <LoadingScreen />;
  } else if (workout.finished_at) {
    body = <WorkoutSummary workout={{ ...workout, finished_at: workout.finished_at }} onDeleted={leave} />;
  } else {
    body = <ActiveWorkout workout={workout} onFinished={load} onDeleted={leave} />;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      {body}
    </>
  );
}

const styles = StyleSheet.create({
  centred: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
});
