# Lift & Macro Tracker

Personal workout and food logger. One Expo codebase runs on Android and in the
browser, backed by a single Supabase database.

## First-time setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the two values from your Supabase
   project (Project Settings → API). Use the publishable/anon key, never the
   service_role key.

3. Start the dev server:

   ```bash
   npx expo start
   ```

- **Phone:** install Expo Go, make sure the phone is on the same Wi-Fi, and scan
  the QR code shown in the terminal.
- **Browser:** press `w` in the terminal, or open http://localhost:8081.

If you change `.env`, stop the dev server and start it again — env values are
read at startup.

## Layout

```
src/app/        screens and navigation (Expo Router)
src/components/ small shared UI pieces
src/lib/        Supabase client, auth, theme
supabase/       database schema and migrations
```

## Licence

The code is under the [MIT licence](LICENSE).

The built-in food list (`src/data/food-tables.json`) comes from government food
composition tables (UK CoFID, Canadian Nutrient File, Australian AFCD, Indian
IFCT) and keeps their own open licences — sources and links are listed at the
top of `scripts/build-food-tables.mjs`. Online search results come from Open
Food Facts (ODbL) and USDA FoodData Central (public domain).
