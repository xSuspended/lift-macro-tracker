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

export type WorkoutHistoryItem = {
  id: string;
  started_at: string;
  finished_at: string;
  workingSetCount: number;
  exerciseNames: string[];
};
