import { supabase } from './supabase';
import type { LoggedSet, Workout, WorkoutDetail, WorkoutHistoryItem, WorkoutSet } from './types';

const WORKOUT_COLUMNS = 'id, started_at, finished_at, notes';
const SET_COLUMNS = 'id, workout_id, exercise_id, set_number, reps, weight_kg, rpe, is_warmup, created_at';

/** The workout you started but have not finished, if any. */
export async function getActiveWorkout(): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_COLUMNS)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startWorkout(): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ started_at: new Date().toISOString() })
    .select(WORKOUT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function finishWorkout(id: string) {
  const { error } = await supabase
    .from('workouts')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Deleting a workout also deletes its sets. */
export async function deleteWorkout(id: string) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

export async function getWorkoutDetail(id: string): Promise<WorkoutDetail> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`${WORKOUT_COLUMNS}, workout_sets(${SET_COLUMNS}, exercises(name))`)
    .eq('id', id)
    .single();
  if (error) throw error;

  // Without generated database types, supabase-js guesses a joined row is a
  // list; each set belongs to exactly one exercise, so it is a single object.
  const { workout_sets, ...workout } = data as unknown as Workout & {
    workout_sets: (WorkoutSet & { exercises: { name: string } })[];
  };
  const sets: LoggedSet[] = workout_sets
    .map(({ exercises, ...set }) => ({ ...set, exercise_name: exercises.name }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return { ...workout, sets };
}

/** Finished workouts, newest first. */
export async function listWorkoutHistory(): Promise<WorkoutHistoryItem[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at, finished_at, workout_sets(is_warmup, created_at, exercises(name))')
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows = data as unknown as {
    id: string;
    started_at: string;
    finished_at: string;
    workout_sets: { is_warmup: boolean; created_at: string; exercises: { name: string } }[];
  }[];

  return rows.map((w) => {
    const sets = [...w.workout_sets].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const exerciseNames = [...new Set(sets.map((s) => s.exercises.name))];
    return {
      id: w.id,
      started_at: w.started_at,
      finished_at: w.finished_at,
      workingSetCount: sets.filter((s) => !s.is_warmup).length,
      exerciseNames,
    };
  });
}

export type NewSet = {
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
};

export async function addSet(set: NewSet): Promise<WorkoutSet> {
  const { data, error } = await supabase.from('workout_sets').insert(set).select(SET_COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

export type ExerciseGroup = { exerciseId: string; name: string; sets: LoggedSet[] };

/** Groups sets by exercise, in the order each exercise was first logged. */
export function groupByExercise(sets: LoggedSet[]): ExerciseGroup[] {
  const groups = new Map<string, ExerciseGroup>();
  for (const set of sets) {
    const group = groups.get(set.exercise_id);
    if (group) group.sets.push(set);
    else groups.set(set.exercise_id, { exerciseId: set.exercise_id, name: set.exercise_name, sets: [set] });
  }
  return [...groups.values()];
}
