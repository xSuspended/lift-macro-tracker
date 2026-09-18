import { toDateKey, todayKey } from './dates';
import { saveTextFile } from './save-file';
import { supabase } from './supabase';

// Your data as spreadsheet (CSV) files: a copy you keep, independent of this app.

const PAGE = 1000;

/** Supabase returns at most 1,000 rows per request, so read in pages until done. */
async function readAll<T>(table: string, columns: string, orderBy: string[]): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select(columns);
    for (const column of orderBy) query = query.order(column);
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]) {
  // The leading byte-order mark makes Excel read accents and symbols correctly.
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

const KG_TO_LB = 1 / 0.45359237;
const lb = (kg: number) => Math.round(kg * KG_TO_LB * 10) / 10;
const localDate = (iso: string) => toDateKey(new Date(iso));
const localTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

async function save(name: string, csv: string) {
  await saveTextFile(`lift-macro-${name}-${todayKey()}.csv`, csv, 'text/csv');
}

type SetRow = {
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
  note: string | null;
  created_at: string;
  exercises: { name: string };
  workouts: { started_at: string; finished_at: string | null; paused_seconds: number };
};

/** One row per set, with its workout's date and length. Returns how many rows. */
export async function exportWorkouts() {
  const sets = await readAll<SetRow>(
    'workout_sets',
    'set_number, reps, weight_kg, rpe, is_warmup, note, created_at, exercises(name), workouts!inner(started_at, finished_at, paused_seconds)',
    // `id` breaks ties, so paging never repeats or skips rows with the same timestamp.
    ['created_at', 'id'],
  );
  const rows = sets.map((s) => {
    const w = s.workouts;
    const minutes = w.finished_at
      ? Math.round((Date.parse(w.finished_at) - Date.parse(w.started_at) - w.paused_seconds * 1000) / 60000)
      : null;
    return [
      localDate(w.started_at),
      localTime(w.started_at),
      minutes,
      s.exercises.name,
      s.set_number,
      s.is_warmup ? 'yes' : 'no',
      s.weight_kg,
      lb(s.weight_kg),
      s.reps,
      s.rpe,
      s.note,
    ];
  });
  await save(
    'workouts',
    toCsv(['date', 'workout start', 'workout minutes', 'exercise', 'set', 'warm-up', 'weight kg', 'weight lb', 'reps', 'RPE', 'note'], rows),
  );
  return rows.length;
}

type LogRow = {
  logged_on: string;
  meal: string;
  name: string | null;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  food_id: string | null;
};

/** One row per food entry. Returns how many rows. */
export async function exportFood() {
  const logs = await readAll<LogRow>(
    'food_logs',
    'logged_on, meal, name, grams, kcal, protein_g, carbs_g, fat_g, food_id',
    ['logged_on', 'created_at', 'id'],
  );
  const rows = logs.map((l) => [
    l.logged_on,
    l.meal,
    l.name,
    l.grams,
    Math.round(l.kcal),
    l.protein_g,
    l.carbs_g,
    l.fat_g,
    l.food_id ? 'food' : 'quick add',
  ]);
  await save('food', toCsv(['date', 'meal', 'food', 'grams', 'kcal', 'protein g', 'carbs g', 'fat g', 'type'], rows));
  return rows.length;
}

/** One row per weigh-in. Returns how many rows. */
export async function exportBodyWeight() {
  const weights = await readAll<{ logged_on: string; weight_kg: number }>('body_weights', 'logged_on, weight_kg', ['logged_on']);
  const rows = weights.map((w) => [w.logged_on, w.weight_kg, lb(w.weight_kg)]);
  await save('body-weight', toCsv(['date', 'weight kg', 'weight lb'], rows));
  return rows.length;
}
