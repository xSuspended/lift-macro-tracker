import { createExercise, listExercises } from './exercises';
import { createRoutine } from './routines';
import type { SharedRoutine } from './routine-code';

/** Saves a shared routine as your own, creating any exercises you don't have. */
export async function importRoutine(shared: SharedRoutine): Promise<string> {
  const existing = await listExercises();
  const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]));

  const items = [];
  for (const exercise of shared.exercises) {
    let match = byName.get(exercise.name.toLowerCase());
    if (!match) {
      match = await createExercise(exercise.name);
      byName.set(exercise.name.toLowerCase(), match);
    }
    items.push({
      exercise_id: match.id,
      target_sets: exercise.sets,
      rep_min: exercise.repMin,
      rep_max: exercise.repMax,
      increment_kg: exercise.incrementKg,
    });
  }
  return createRoutine(shared.name, items);
}
