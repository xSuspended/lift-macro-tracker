import type { WorkoutSet } from './types';
import { formatWeight, toDisplay, toKg, type WeightUnit } from './units';

// Used when an exercise isn't part of a routine. Same as the database defaults.
export const DEFAULT_TARGET = { rep_min: 8, rep_max: 12, increment_kg: 2.5 };

export type Target = { rep_min: number; rep_max: number; increment_kg: number; target_sets?: number };

export type Suggestion = {
  weightKg: number;
  reps: number;
  message: string;
};

/**
 * The weight jump in your unit. In pounds it's rounded to plates that exist,
 * so 2.5 kg becomes 5 lb rather than 5.5 lb.
 */
function incrementIn(unit: WeightUnit, incrementKg: number) {
  if (unit === 'kg') return incrementKg;
  return Math.max(2.5, Math.round(toDisplay(incrementKg, 'lb') / 2.5) * 2.5);
}

/**
 * Double progression: if every working set last time reached the top of the
 * rep range, add weight and drop back to the bottom of the range. Otherwise keep
 * the weight and try for more reps.
 */
export function suggestNext(lastSets: WorkoutSet[], target: Target, unit: WeightUnit): Suggestion | null {
  const working = lastSets.filter((s) => !s.is_warmup);
  if (working.length === 0) return null;

  const weightKg = Math.max(...working.map((s) => s.weight_kg));
  const increment = incrementIn(unit, target.increment_kg);
  // Doing fewer sets than the routine asks for doesn't count as earning the jump.
  const allHitTop =
    working.length >= (target.target_sets ?? 1) && working.every((s) => s.reps >= target.rep_max);

  if (allHitTop) {
    const nextKg = toKg(toDisplay(weightKg, unit) + increment, unit);
    return {
      weightKg: nextKg,
      reps: target.rep_min,
      message: `You hit ${target.rep_max} reps on every set. Go up to ${formatWeight(nextKg, unit)} and aim for ${target.rep_min}+.`,
    };
  }

  const setCount = target.target_sets ?? working.length;
  return {
    weightKg,
    reps: working[0].reps,
    message: `Stay at ${formatWeight(weightKg, unit)}. Get ${target.rep_max} reps on all ${setCount} ${
      setCount === 1 ? 'set' : 'sets'
    } to earn +${increment} ${unit}.`,
  };
}
