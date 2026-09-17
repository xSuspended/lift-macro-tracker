import { supabase } from './supabase';
import type { ProgressPoint } from './types';

export type Metric = 'est_1rm_kg' | 'top_weight_kg' | 'volume_kg';

/** Every exercise's per-workout numbers from the `exercise_progress` view, oldest first. */
export async function listProgress(): Promise<ProgressPoint[]> {
  const { data, error } = await supabase
    .from('exercise_progress')
    .select('exercise_id, exercise_name, workout_id, workout_date, set_count, top_weight_kg, volume_kg, est_1rm_kg')
    .order('workout_date');
  if (error) throw error;
  return data;
}

/** "2026-09-17" -> a Date at local midnight (new Date("2026-09-17") would be UTC). */
export function parseDateOnly(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export type Change = { percent: number; delta: number };

/**
 * How much a value changed over the last `days` days: the latest entry compared
 * with the last entry from before that window. If every entry falls inside the
 * window, it compares against the first one. `series` is oldest first.
 */
export function changeOverSeries(series: { day: string; value: number }[], days: number): Change | null {
  if (series.length < 2) return null;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);

  let baseline = series[0];
  for (const point of series) {
    if (parseDateOnly(point.day) <= cutoff) baseline = point;
  }

  const latest = series[series.length - 1];
  if (baseline === latest || baseline.value === 0) return null;

  const delta = latest.value - baseline.value;
  return { delta, percent: (delta / baseline.value) * 100 };
}

export function changeOver(points: ProgressPoint[], metric: Metric, days: number) {
  return changeOverSeries(points.map((p) => ({ day: p.workout_date, value: p[metric] })), days);
}
