# Lift & Macro Tracker

Personal app for logging workouts (with progression tracking) and food (with macro
totals). One codebase runs as an Android app and a web app, sharing one Supabase
database.

The owner is a beginner. Explain changes in plain language, keep things simple, and
prefer boring, well-documented tools over clever ones.

## Stack (do not swap without asking)

- Expo SDK 57 + React Native + TypeScript
- Expo Router for navigation (routes live in `src/app`)
- Supabase (`@supabase/supabase-js`) for auth and database
- Targets Android and Web. Every library added must work on both — check before
  installing, and say so if something is Android-only.
- Check current docs rather than relying on memory for versions and setup steps.

## Database rules

- Schema lives in `supabase/schema.sql`. It is applied by running it in the
  Supabase SQL Editor.
- Do not change the schema without asking. Needed changes go in a new file under
  `supabase/migrations/`, to be run manually in the SQL Editor.
- `user_id` columns default to `auth.uid()` — never send `user_id` from the app on insert.
- Row Level Security is on. Only the publishable/anon key belongs in the app.
  Never use or ask for the service_role key.
- All weights are stored in kg. Convert to lb only for display, based on
  `profiles.weight_unit`.
- `food_logs` macros are filled by a database trigger when `food_id` is set. For
  "quick add" (no `food_id`), the app sends name + macros directly.
- Use the views `exercise_progress` and `daily_nutrition` for charts and totals
  instead of recomputing in the app.

## Conventions

- Keep components small. Supabase queries belong in `src/lib/`, not scattered
  through screens.
- Dark UI with big tap targets — sets get logged mid-workout with sweaty hands.
  Colours and spacing live in `src/lib/theme.ts`; `TAP_TARGET` is the minimum
  height for anything tappable.
- Screens behind the login live under `src/app/(app)/`, whose layout does the
  signed-in check. Put new logged-in screens there, not at the top level.
- The owner wants things kept simple: one double-progression rule with defaults,
  no alternative training schemes or elaborate settings.
- `app.json` uses `web.output: "single"`. Do not switch it back to `"static"`:
  static output pre-renders in Node, where `window` is undefined and
  AsyncStorage-backed Supabase sessions crash the build.

## Secrets

- Supabase URL and key live in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_KEY`. `.env` is gitignored; `.env.example` is committed
  with blank values.

## Working agreement

- Build one phase at a time. At the end of each phase: stop, summarise what
  changed, and give exact steps to test on a phone (Expo Go) and in a browser.
- Make a git commit at the end of every working phase.
- If something fails, read the error and fix it before asking.

## Phases

1. **Setup + auth** — done.
2. **Workout logging** — done.
3. Progression: "last time" while logging; routines with target sets and rep
   range; double progression (all working sets hit `rep_max` last time →
   suggest `+increment_kg`, otherwise same weight and aim for more reps);
   Progress tab charts for est. 1RM, top weight, and volume.
4. Food logging: daily view grouped by meal with totals vs targets (from
   `daily_nutrition`), macro targets in Settings, custom foods with per-100g
   values and optional serving, quick add, saved meals, "copy yesterday".
5. Food search: Open Food Facts (and USDA FoodData Central if a key is added);
   cache logged results into `foods` with `source` and `source_ref`. Barcode
   scanning on Android only if simple; hide it on web.
6. Body weight + polish: body weight log and chart, weight unit setting,
   loading/empty/error states, offline-friendly where easy.
7. Ship: Android APK via EAS Build; web build deployed to Vercel or Netlify.
