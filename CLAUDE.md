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
- React Compiler is on. Don't use non-null assertions on nullable state inside
  inline callbacks (`picked!.id`): the compiler reads them while rendering and
  crashes when the value is null. Guard with `if (!picked) return;` instead.
- Food days are local "YYYY-MM-DD" keys from `src/lib/dates.ts`; always send
  `logged_on` rather than relying on the database's UTC `current_date`.
- Batch inserts through supabase-js need every row to have the same keys.
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
3. **Progression** — done. Routines (made by hand or saved from a finished
   workout), "last time" + double-progression suggestion while logging, and
   Progress tab charts with week/month/year change. Which routine a workout
   was started from is stored on the device (`src/lib/plans.ts`), not in the
   database.
4. **Food logging** — done. Food tab (day navigation, calorie ring split by
   macro with totals vs targets, meals); the % of target line chart lives on
   the Progress tab with Day / Week / Month; add food (your foods / saved meals / quick add),
   food editor, amount picker in servings or grams, saved meals, copy the
   previous day, targets in Settings.
5. **Food search** — done. Searching and barcode lookups go through the
   Supabase Edge Function `supabase/functions/food-search` (Open Food Facts'
   text search sends no CORS header, so the website can't call it directly).
   It's deployed by pasting into the dashboard editor, not the CLI; after
   changing the file, it must be re-pasted and redeployed. USDA uses the
   `USDA_API_KEY` function secret, or DEMO_KEY without one. Picked results are
   saved into `foods` with `source`/`source_ref` (unique per user). Barcode
   scanning (expo-camera) is phone-only and hidden on web.
6. **Body weight + polish** — done. kg/lb setting (`src/lib/units.tsx`; data
   stays kg, lb steppers move 5 lb), body weight log/chart on Progress, sets
   logged without signal queue on the device and upload later
   (`src/lib/set-queue.ts`), CSV export in Settings (`save-file.ts` for phones,
   `save-file.web.ts` for web), Try again screens, friendly offline messages.
7. **Ship** — done. Code is open source (MIT) at
   github.com/xSuspended/lift-macro-tracker, branch `main`. Commit as the
   repo's local git identity (GitHub noreply address), never a personal email.
   - Web: Vercel builds every push to `main` using `vercel.json`, live at
     https://lift-macro-tracker.vercel.app. The two `EXPO_PUBLIC_*` values
     are set in the Vercel project's Environment Variables.
   - Android: `eas.json` profile `preview` builds an installable APK on Expo's
     servers (account `xsuspended`). The `EXPO_PUBLIC_*` values come from
     the EAS "preview" environment, because `.env` isn't uploaded. New APK:
     `npx.cmd eas-cli@latest build -p android --profile preview`.
