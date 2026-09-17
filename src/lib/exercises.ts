import { supabase } from './supabase';
import type { Exercise } from './types';

const COLUMNS = 'id, user_id, name, muscle_group';

/** Built-in exercises plus your own, alphabetically. */
export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select(COLUMNS).order('name');
  if (error) throw error;
  return data;
}

export async function createExercise(name: string): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ name })
    .select(COLUMNS)
    .single();

  if (error) {
    // 23505 = the unique-name rule in the database.
    if (error.code === '23505') throw new Error(`You already have an exercise called "${name}".`);
    throw error;
  }
  return data;
}
