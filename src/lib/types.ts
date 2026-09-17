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
  created_at: string;
};

export type LoggedSet = WorkoutSet & { exercise_name: string };

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

export type WorkoutHistoryItem = {
  id: string;
  started_at: string;
  finished_at: string;
  paused_seconds: number;
  workingSetCount: number;
  exerciseNames: string[];
};
