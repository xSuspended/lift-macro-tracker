// Sharing a routine doesn't use the database: the routine is packed into a
// link, and whoever opens it gets their own copy. Exercises are matched by
// name, and any the other person doesn't have are created for them.

import type { Routine } from './types';

export const SITE_URL = 'https://lift-macro-tracker.vercel.app';

/** A routine squeezed into a link: name, then one row per exercise. */
type Packed = {
  v: 1;
  n: string;
  e: [name: string, sets: number, repMin: number, repMax: number, incrementKg: number][];
};

export type SharedRoutine = { name: string; exercises: { name: string; sets: number; repMin: number; repMax: number; incrementKg: number }[] };

export function packRoutine(routine: Routine): string {
  const packed: Packed = {
    v: 1,
    n: routine.name,
    e: routine.exercises.map((e) => [e.exercise_name, e.target_sets, e.rep_min, e.rep_max, e.increment_kg]),
  };
  return encodeURIComponent(JSON.stringify(packed));
}

export function routineLink(routine: Routine) {
  return `${SITE_URL}/routine/import?r=${packRoutine(routine)}`;
}

/** Reads a shared routine from a full link or a pasted code. Null if it isn't one. */
export function unpackRoutine(text: string): SharedRoutine | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fromLink = trimmed.match(/[?&]r=([^&\s]+)/);
  const raw = fromLink ? fromLink[1] : trimmed;

  try {
    const packed = JSON.parse(decode(raw)) as Packed;
    if (packed?.v !== 1 || typeof packed.n !== 'string' || !Array.isArray(packed.e)) return null;
    const exercises = packed.e
      .filter((row) => Array.isArray(row) && typeof row[0] === 'string' && row[0].trim() !== '')
      .map(([name, sets, repMin, repMax, incrementKg]) => {
        const min = clamp(repMin, 1, 100, 8);
        return {
          name: name.trim().slice(0, 80),
          sets: clamp(sets, 1, 20, 3),
          repMin: min,
          // The database won't accept a rep range that runs backwards.
          repMax: Math.max(min, clamp(repMax, 1, 100, 12)),
          incrementKg: clamp(incrementKg, 0, 50, 2.5),
        };
      });
    if (exercises.length === 0) return null;
    return { name: packed.n.trim().slice(0, 80) || 'Shared routine', exercises };
  } catch {
    return null;
  }
}

/** Router params arrive already decoded, so undo the encoding only if it's still there. */
function decode(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

