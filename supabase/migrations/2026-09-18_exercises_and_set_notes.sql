-- 1. Adds five exercises to the built-in list.
-- 2. Adds an optional note to each logged set (up to 500 characters).
-- Safe to run more than once: anything already there is skipped.

insert into public.exercises (user_id, name, muscle_group)
select null, new.name, new.muscle_group
from (values
  ('Cable Curl', 'Arms'),
  ('Bent-Over Dumbbell Row', 'Back'),
  ('Standing Forearm Cable Curl', 'Arms'),
  ('Seated Forearm Cable Curl', 'Arms'),
  ('Back Extension', 'Back')
) as new (name, muscle_group)
where not exists (
  select 1 from public.exercises e where e.user_id is null and lower(e.name) = lower(new.name)
);

alter table public.workout_sets
  add column if not exists note text check (note is null or char_length(note) <= 500);
