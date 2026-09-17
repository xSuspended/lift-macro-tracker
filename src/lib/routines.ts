import { supabase } from './supabase';
import type { Routine, RoutineExercise, WorkoutDetail } from './types';
import { groupByExercise } from './workouts';

const ROUTINE_SELECT =
  'id, name, routine_exercises(id, exercise_id, position, target_sets, rep_min, rep_max, increment_kg, exercises(name))';

type RoutineRow = {
  id: string;
  name: string;
  routine_exercises: (Omit<RoutineExercise, 'exercise_name'> & { exercises: { name: string } })[];
};

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    exercises: row.routine_exercises
      .map(({ exercises, ...item }) => ({ ...item, exercise_name: exercises.name }))
      .sort((a, b) => a.position - b.position),
  };
}

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase.from('routines').select(ROUTINE_SELECT).order('name');
  if (error) throw error;
  return (data as unknown as RoutineRow[]).map(toRoutine);
}

/** Returns null if the routine no longer exists. */
export async function getRoutine(id: string): Promise<Routine | null> {
  const { data, error } = await supabase.from('routines').select(ROUTINE_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toRoutine(data as unknown as RoutineRow) : null;
}

export async function createRoutine(
  name: string,
  items: { exercise_id: string; target_sets: number }[] = [],
): Promise<string> {
  const { data, error } = await supabase.from('routines').insert({ name }).select('id').single();
  if (error) throw error;

  if (items.length) {
    const { error: itemsError } = await supabase
      .from('routine_exercises')
      .insert(items.map((item, position) => ({ ...item, routine_id: data.id, position })));
    if (itemsError) throw itemsError;
  }
  return data.id;
}

/** Copies a finished workout's exercises, and how many working sets each got. */
export function createRoutineFromWorkout(name: string, workout: WorkoutDetail) {
  const items = groupByExercise(workout.sets).map((group) => ({
    exercise_id: group.exerciseId,
    target_sets: Math.max(1, group.sets.filter((s) => !s.is_warmup).length),
  }));
  return createRoutine(name, items);
}

export async function renameRoutine(id: string, name: string) {
  const { error } = await supabase.from('routines').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function addRoutineExercise(routineId: string, exerciseId: string, position: number) {
  const { error } = await supabase
    .from('routine_exercises')
    .insert({ routine_id: routineId, exercise_id: exerciseId, position });
  if (error) throw error;
}

export async function setTargetSets(routineExerciseId: string, targetSets: number) {
  const { error } = await supabase
    .from('routine_exercises')
    .update({ target_sets: targetSets })
    .eq('id', routineExerciseId);
  if (error) throw error;
}

export async function removeRoutineExercise(routineExerciseId: string) {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', routineExerciseId);
  if (error) throw error;
}
