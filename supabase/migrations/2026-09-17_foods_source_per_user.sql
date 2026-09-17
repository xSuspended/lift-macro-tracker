-- Lets every user keep their own copy of a food found through search.
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- The original index said a (source, source_ref) pair, e.g. Open Food Facts
-- product 3017624010701, could exist only once in the whole table. But each
-- user's foods are private, so a second person saving the same product would
-- be blocked by a row they can't even see. This makes it unique per user.

drop index if exists public.foods_source_ref;

create unique index foods_source_ref
  on public.foods (user_id, source, source_ref) where source_ref is not null;
