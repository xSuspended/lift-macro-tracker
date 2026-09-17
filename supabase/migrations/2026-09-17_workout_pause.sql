-- Lets a running workout be paused.
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
--   paused_at       when the current pause started; null while the clock is running
--   paused_seconds  total time spent paused so far, left out of the workout's duration

alter table public.workouts
  add column if not exists paused_at timestamptz,
  add column if not exists paused_seconds integer not null default 0 check (paused_seconds >= 0);
