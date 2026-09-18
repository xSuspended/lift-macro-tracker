// Shapes of the database rows the app reads. Weights are always kilograms.

export type Exercise = {
  id: string;
  /** null for the built-in exercises everyone shares. */
  user_id: string | null;
  name: string;
  muscle_group: string | null;
};

export type Workout = {
  id: string;
  started_at: string;
  finished_at: string | null;
  /** When the current pause began; null while the clock is running. */
  paused_at: string | null;
  /** Total seconds spent paused, left out of the workout's duration. */
  paused_seconds: number;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
  note: string | null;
  created_at: string;
};

export type LoggedSet = WorkoutSet & {
  exercise_name: string;
  /** Logged with no signal: kept on the device until it can be saved. */
  pending?: boolean;
};

export type WorkoutDetail = Workout & { sets: LoggedSet[] };

export type RoutineExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  increment_kg: number;
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

/** One row of the `exercise_progress` view: an exercise's numbers for one workout. */
export type ProgressPoint = {
  exercise_id: string;
  exercise_name: string;
  workout_id: string;
  /** "YYYY-MM-DD" */
  workout_date: string;
  set_count: number;
  top_weight_kg: number;
  volume_kg: number;
  est_1rm_kg: number;
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Nutrition is always per 100 g; a serving is an optional shortcut, e.g. "1 roti" = 40 g. */
export type Food = {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_name: string | null;
  serving_grams: number | null;
  source: string;
  source_ref: string | null;
};

export type FoodLog = {
  id: string;
  logged_on: string;
  meal: Meal;
  /** null for quick-add entries. */
  food_id: string | null;
  name: string | null;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  food: Pick<Food, 'serving_name' | 'serving_grams'> | null;
};

/** One row of the `daily_nutrition` view. */
export type DayTotals = {
  logged_on: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Targets = {
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
};

export type SavedMeal = {
  id: string;
  name: string;
  items: { food_id: string; grams: number; food_name: string }[];
};

export type WorkoutHistoryItem = {
  id: string;
  started_at: string;
  finished_at: string;
  paused_seconds: number;
  workingSetCount: number;
  exerciseNames: string[];
};
