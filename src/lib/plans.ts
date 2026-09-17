import AsyncStorage from '@react-native-async-storage/async-storage';

// Which routine a workout was started from. Kept on this device rather than in
// the database, so a workout resumed on a different device shows its logged
// sets but not the routine's targets.

const key = (workoutId: string) => `workout-routine:${workoutId}`;

export function rememberRoutine(workoutId: string, routineId: string) {
  return AsyncStorage.setItem(key(workoutId), routineId);
}

export function getRememberedRoutineId(workoutId: string) {
  return AsyncStorage.getItem(key(workoutId));
}

export function forgetRoutine(workoutId: string) {
  return AsyncStorage.removeItem(key(workoutId));
}
