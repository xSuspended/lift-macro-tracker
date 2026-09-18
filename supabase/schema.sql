-- Lift & Macro Tracker — database schema
-- Run this ONCE in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run on a fresh project only; it creates tables from scratch.
--
-- Conventions used throughout:
--   * Every table has user_id defaulting to auth.uid(), so the app never sends it.
--   * Row Level Security is on everywhere: you can only ever see your own rows.
--   * All weights are stored in kilograms. Pounds are a display choice only.
--   * All food macro values are stored per 100 g on `foods`, and as absolute
--     amounts on `food_logs`.

-- ============================================================================
-- PROFILES — one row per user, created automatically at sign-up
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  target_kcal integer,
  target_protein_g numeric(6, 1),
  target_carbs_g numeric(6, 1),
  target_fat_g numeric(6, 1),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Give every new account a profile row without the app having to do it.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- EXERCISES — built-in ones have user_id = null and are visible to everybody
-- ============================================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade default auth.uid(),
  name text not null,
  muscle_group text,
  created_at timestamptz not null default now()
);

-- Stops duplicate names, case-insensitively, per user (and among built-ins).
create unique index exercises_unique_name
  on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'), lower(name));

alter table public.exercises enable row level security;

create policy "Read built-in and own exercises" on public.exercises
  for select using (user_id is null or user_id = auth.uid());

create policy "Create own exercises" on public.exercises
  for insert with check (user_id = auth.uid());

create policy "Update own exercises" on public.exercises
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Delete own exercises" on public.exercises
  for delete using (user_id = auth.uid());

-- ============================================================================
-- WORKOUTS and SETS
-- ============================================================================

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- When the current pause began (null while running), and total time paused so far.
  paused_at timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_user_started on public.workouts (user_id, started_at desc);

alter table public.workouts enable row level security;

create policy "Own workouts" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  workout_id uuid not null references public.workouts on delete cascade,
  exercise_id uuid not null references public.exercises on delete restrict,
  set_number integer not null default 1,
  reps integer not null check (reps >= 0),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  -- Rate of Perceived Exertion, 1-10, optional.
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  is_warmup boolean not null default false,
  created_at timestamptz not null default now()
);

create index workout_sets_workout on public.workout_sets (workout_id);
create index workout_sets_exercise on public.workout_sets (user_id, exercise_id, created_at desc);

alter table public.workout_sets enable row level security;

create policy "Own sets" on public.workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- ROUTINES — planned exercises with a target set count and rep range,
-- which drive the double-progression suggestions
-- ============================================================================

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "Own routines" on public.routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  routine_id uuid not null references public.routines on delete cascade,
  exercise_id uuid not null references public.exercises on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 3,
  rep_min integer not null default 8,
  rep_max integer not null default 12,
  -- How much to add once every working set reaches rep_max.
  increment_kg numeric(5, 2) not null default 2.5,
  check (rep_max >= rep_min)
);

create index routine_exercises_routine on public.routine_exercises (routine_id, position);

alter table public.routine_exercises enable row level security;

create policy "Own routine exercises" on public.routine_exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- FOODS — macros always stored per 100 g, with an optional named serving
-- (for example "1 roti" = 40 g)
-- ============================================================================

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade default auth.uid(),
  name text not null,
  brand text,
  kcal_per_100g numeric(7, 2) not null default 0,
  protein_per_100g numeric(6, 2) not null default 0,
  carbs_per_100g numeric(6, 2) not null default 0,
  fat_per_100g numeric(6, 2) not null default 0,
  serving_name text,
  serving_grams numeric(7, 2),
  -- Where this came from: 'custom', 'off' (Open Food Facts), 'usda'.
  source text not null default 'custom',
  -- The id this food has in that external database, so we cache each one once.
  source_ref text,
  created_at timestamptz not null default now()
);

-- One copy per user of each externally sourced food.
create unique index foods_source_ref
  on public.foods (user_id, source, source_ref) where source_ref is not null;

create index foods_user_name on public.foods (user_id, lower(name));

alter table public.foods enable row level security;

create policy "Read shared and own foods" on public.foods
  for select using (user_id is null or user_id = auth.uid());

create policy "Create own foods" on public.foods
  for insert with check (user_id = auth.uid());

create policy "Update own foods" on public.foods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Delete own foods" on public.foods
  for delete using (user_id = auth.uid());

-- ============================================================================
-- FOOD LOGS — what you actually ate
-- With food_id set, a trigger fills the macros from `foods` and `grams`.
-- Without one ("quick add"), the app supplies name and macros directly.
-- ============================================================================

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  logged_on date not null default current_date,
  meal text not null default 'snack'
    check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods on delete set null,
  name text,
  grams numeric(7, 2),
  kcal numeric(7, 2) not null default 0,
  protein_g numeric(6, 2) not null default 0,
  carbs_g numeric(6, 2) not null default 0,
  fat_g numeric(6, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index food_logs_user_day on public.food_logs (user_id, logged_on);

alter table public.food_logs enable row level security;

create policy "Own food logs" on public.food_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.fill_food_log_macros()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  f public.foods%rowtype;
  factor numeric;
begin
  if new.food_id is not null then
    select * into f from public.foods where id = new.food_id;

    if found then
      factor := coalesce(new.grams, f.serving_grams, 100) / 100.0;
      new.name := coalesce(new.name, f.name);
      new.grams := coalesce(new.grams, f.serving_grams, 100);
      new.kcal := round(f.kcal_per_100g * factor, 2);
      new.protein_g := round(f.protein_per_100g * factor, 2);
      new.carbs_g := round(f.carbs_per_100g * factor, 2);
      new.fat_g := round(f.fat_per_100g * factor, 2);
    end if;
  end if;

  return new;
end;
$$;

create trigger food_logs_fill_macros
  before insert or update on public.food_logs
  for each row execute function public.fill_food_log_macros();

-- ============================================================================
-- SAVED MEALS — a reusable group of foods, e.g. "usual breakfast"
-- ============================================================================

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.saved_meals enable row level security;

create policy "Own saved meals" on public.saved_meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  saved_meal_id uuid not null references public.saved_meals on delete cascade,
  food_id uuid not null references public.foods on delete cascade,
  grams numeric(7, 2) not null
);

create index saved_meal_items_meal on public.saved_meal_items (saved_meal_id);

alter table public.saved_meal_items enable row level security;

create policy "Own saved meal items" on public.saved_meal_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- BODY WEIGHT
-- ============================================================================

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  logged_on date not null default current_date,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

alter table public.body_weights enable row level security;

create policy "Own body weights" on public.body_weights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- VIEWS — the app reads totals and chart data from these instead of
-- recalculating in JavaScript.
-- `security_invoker` makes each view obey the caller's Row Level Security.
-- ============================================================================

create view public.daily_nutrition
with (security_invoker = on) as
select
  user_id,
  logged_on,
  round(sum(kcal), 0) as kcal,
  round(sum(protein_g), 1) as protein_g,
  round(sum(carbs_g), 1) as carbs_g,
  round(sum(fat_g), 1) as fat_g
from public.food_logs
group by user_id, logged_on;

-- One row per exercise per workout: the numbers the Progress charts plot.
-- Warm-up sets are excluded. Estimated 1RM uses the Epley formula.
create view public.exercise_progress
with (security_invoker = on) as
select
  s.user_id,
  s.exercise_id,
  e.name as exercise_name,
  s.workout_id,
  coalesce(w.finished_at, w.started_at)::date as workout_date,
  count(*) as set_count,
  max(s.weight_kg) as top_weight_kg,
  round(sum(s.weight_kg * s.reps), 1) as volume_kg,
  round(max(s.weight_kg * (1 + s.reps::numeric / 30)), 1) as est_1rm_kg
from public.workout_sets s
join public.workouts w on w.id = s.workout_id
join public.exercises e on e.id = s.exercise_id
where s.is_warmup = false
group by s.user_id, s.exercise_id, e.name, s.workout_id,
         coalesce(w.finished_at, w.started_at)::date;

-- ============================================================================
-- BUILT-IN EXERCISES (user_id stays null, so everyone can see them)
-- ============================================================================

insert into public.exercises (user_id, name, muscle_group) values
  (null, 'Barbell Back Squat', 'Legs'),
  (null, 'Barbell Front Squat', 'Legs'),
  (null, 'Leg Press', 'Legs'),
  (null, 'Romanian Deadlift', 'Legs'),
  (null, 'Leg Curl', 'Legs'),
  (null, 'Leg Extension', 'Legs'),
  (null, 'Walking Lunge', 'Legs'),
  (null, 'Standing Calf Raise', 'Legs'),
  (null, 'Deadlift', 'Back'),
  (null, 'Barbell Row', 'Back'),
  (null, 'Pull-up', 'Back'),
  (null, 'Chin-up', 'Back'),
  (null, 'Lat Pulldown', 'Back'),
  (null, 'Seated Cable Row', 'Back'),
  (null, 'Face Pull', 'Back'),
  (null, 'Barbell Bench Press', 'Chest'),
  (null, 'Incline Barbell Bench Press', 'Chest'),
  (null, 'Dumbbell Bench Press', 'Chest'),
  (null, 'Incline Dumbbell Press', 'Chest'),
  (null, 'Cable Fly', 'Chest'),
  (null, 'Push-up', 'Chest'),
  (null, 'Dip', 'Chest'),
  (null, 'Overhead Press', 'Shoulders'),
  (null, 'Seated Dumbbell Press', 'Shoulders'),
  (null, 'Lateral Raise', 'Shoulders'),
  (null, 'Rear Delt Fly', 'Shoulders'),
  (null, 'Barbell Curl', 'Arms'),
  (null, 'Dumbbell Curl', 'Arms'),
  (null, 'Hammer Curl', 'Arms'),
  (null, 'Cable Curl', 'Arms'),
  (null, 'Triceps Pushdown', 'Arms'),
  (null, 'Skull Crusher', 'Arms'),
  (null, 'Overhead Triceps Extension', 'Arms'),
  (null, 'Plank', 'Core'),
  (null, 'Hanging Leg Raise', 'Core'),
  (null, 'Cable Crunch', 'Core');
