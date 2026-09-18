import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutSet } from './types';
import { addSet, type NewSet } from './workouts';

// Sets logged with no signal are kept on the device and saved once the
// connection is back, so a gym basement doesn't lose your workout.

const STORAGE_KEY = 'pending-sets';

export type PendingSet = NewSet & {
  temp_id: string;
  exercise_name: string;
  created_at: string;
};

async function readQueue(): Promise<PendingSet[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PendingSet[]) : [];
}

function writeQueue(queue: PendingSet[]) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** True when a request failed because there's no connection, rather than being rejected. */
export function isOfflineError(e: unknown) {
  const message = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
  return /failed to fetch|network request failed|networkerror|load failed|internet connection/i.test(message);
}

/** A saved set, or a queued one standing in for it with `pending: true`. */
export type QueuedResult = { set: WorkoutSet; pending: boolean };

/** Saves a set, or keeps it on the device if there's no connection. */
export async function addSetOrQueue(set: NewSet, exerciseName: string): Promise<QueuedResult> {
  const createdAt = new Date().toISOString();
  try {
    return { set: await addSet(set), pending: false };
  } catch (e) {
    if (!isOfflineError(e)) throw e;
    const queued: PendingSet = {
      ...set,
      exercise_name: exerciseName,
      created_at: createdAt,
      temp_id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    await writeQueue([...(await readQueue()), queued]);
    return { set: toWorkoutSet(queued), pending: true };
  }
}

function toWorkoutSet(p: PendingSet): WorkoutSet {
  return {
    id: p.temp_id,
    workout_id: p.workout_id,
    exercise_id: p.exercise_id,
    set_number: p.set_number,
    reps: p.reps,
    weight_kg: p.weight_kg,
    rpe: p.rpe,
    is_warmup: p.is_warmup,
    // Sets queued before notes existed have no note.
    note: p.note ?? null,
    created_at: p.created_at,
  };
}

export async function pendingSetsFor(workoutId: string) {
  return (await readQueue())
    .filter((p) => p.workout_id === workoutId)
    .map((p) => ({ ...toWorkoutSet(p), exercise_name: p.exercise_name }));
}

export async function removePendingSet(tempId: string) {
  await writeQueue((await readQueue()).filter((p) => p.temp_id !== tempId));
}

let flushing: Promise<Map<string, WorkoutSet>> | null = null;

/**
 * Tries to save every waiting set, oldest first, stopping at the first one that
 * still can't reach the server. Returns the saved sets keyed by their temporary id.
 * Only one flush runs at a time, so a set can't be saved twice.
 */
export function flushPendingSets(): Promise<Map<string, WorkoutSet>> {
  flushing ??= (async () => {
    const saved = new Map<string, WorkoutSet>();
    try {
      for (const pending of await readQueue()) {
        const { temp_id, exercise_name, ...set } = pending;
        try {
          saved.set(temp_id, await addSet(set));
        } catch (e) {
          if (isOfflineError(e)) break;
          // The server refused it outright (e.g. its workout was deleted
          // meanwhile). Retrying would fail forever, so let it go.
        }
        await removePendingSet(temp_id);
      }
      return saved;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
