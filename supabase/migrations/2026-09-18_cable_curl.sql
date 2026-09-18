-- Adds Cable Curl to the built-in exercise list.
-- Safe to run more than once: it skips the insert if it's already there.
insert into public.exercises (user_id, name, muscle_group)
select null, 'Cable Curl', 'Arms'
where not exists (
  select 1 from public.exercises where user_id is null and lower(name) = 'cable curl'
);
