import { formatNumber } from './format';
import type { WorkoutSet } from './types';

// Used when an exercise isn't part of a routine. Same as the database defaults.
export const DEFAULT_TARGET = { rep_min: 8, rep_max: 12, increment_kg: 2.5 };

export type Target = { rep_min: number; rep_max: number; increment_kg: number; target_sets?: number };

export type Suggestion = {
  weightKg: number;
  reps: number;
  message: string;
};

/**
 * Double progression: if every working set last time reached the top of the
 * rep range, add weight and drop back to the bottom of the range. Otherwise keep
 * the weight and try for more reps.
 */
export function suggestNext(lastSets: WorkoutSet[], target: Target): Suggestion | null {
  const working = lastSets.filter((s) => !s.is_warmup);
  if (working.length === 0) return null;

  const weightKg = Math.max(...working.map((s) => s.weight_kg));
  // Doing fewer sets than the routine asks for doesn't count as earning the jump.
  const allHitTop =
    working.length >= (target.target_sets ?? 1) && working.every((s) => s.reps >= target.rep_max);

  if (allHitTop) {
    const next = weightKg + target.increment_kg;
    return {
      weightKg: next,
      reps: target.rep_min,
      message: `You hit ${target.rep_max} reps on every set. Go up to ${formatNumber(next)} kg and aim for ${target.rep_min}+.`,
    };
  }

  const setCount = target.target_sets ?? working.length;
  return {
    weightKg,
    reps: working[0].reps,
    message: `Stay at ${formatNumber(weightKg)} kg. Get ${target.rep_max} reps on all ${setCount} ${
      setCount === 1 ? 'set' : 'sets'
    } to earn +${formatNumber(target.increment_kg)} kg.`,
  };
}
