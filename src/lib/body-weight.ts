import { supabase } from './supabase';

export type BodyWeight = { id: string; logged_on: string; weight_kg: number };

/** Every weigh-in, oldest first. */
export async function listBodyWeights(): Promise<BodyWeight[]> {
  const { data, error } = await supabase.from('body_weights').select('id, logged_on, weight_kg').order('logged_on');
  if (error) throw error;
  return data;
}

/** One weigh-in per day: logging again on the same day replaces it. */
export async function logBodyWeight(day: string, weightKg: number) {
  const { error } = await supabase
    .from('body_weights')
    .upsert({ logged_on: day, weight_kg: weightKg }, { onConflict: 'user_id,logged_on' });
  if (error) throw error;
}

export async function deleteBodyWeight(id: string) {
  const { error } = await supabase.from('body_weights').delete().eq('id', id);
  if (error) throw error;
}
