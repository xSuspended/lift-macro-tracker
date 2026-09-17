import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { HistoryRow } from '@/components/history-row';
import { LoadingScreen } from '@/components/screen';
import { errorMessage, formatTime } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { Workout, WorkoutHistoryItem } from '@/lib/types';
import { getActiveWorkout, listWorkoutHistory, startWorkout } from '@/lib/workouts';

export default function WorkoutTab() {
  const [active, setActive] = useState<Workout | null>(null);
  const [history, setHistory] = useState<WorkoutHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Reload whenever this tab comes back into view, e.g. after finishing a workout.
  const load = useCallback(() => {
    setError(null);
    Promise.all([getActiveWorkout(), listWorkoutHistory()])
      .then(([current, past]) => {
        setActive(current);
        setHistory(past);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useFocusEffect(load);

  function open(id: string) {
    router.push({ pathname: '/session/[id]', params: { id } });
  }

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const workout = await startWorkout();
      open(workout.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  if (history === null && !error) return <LoadingScreen />;

  return (
    <FlatList
      data={history ?? []}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          {active ? (
            <View style={styles.activeCard}>
              <Text style={styles.activeTitle}>Workout in progress</Text>
              <Text style={styles.activeMeta}>Started {formatTime(active.started_at)}</Text>
              <Button label="Resume workout" onPress={() => open(active.id)} />
            </View>
          ) : (
            <Button label="Start workout" onPress={handleStart} loading={starting} />
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
              <Button label="Try again" onPress={load} variant="secondary" />
            </View>
          ) : null}

          {history && history.length > 0 ? <Text style={styles.section}>History</Text> : null}
        </View>
      }
      ListEmptyComponent={
        history ? <Text style={styles.empty}>Finished workouts will show up here.</Text> : null
      }
      renderItem={({ item }) => <HistoryRow item={item} onPress={() => open(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
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
  section: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  empty: { color: colors.textDim, fontSize: 16, textAlign: 'center', paddingVertical: spacing.xxl },
});
