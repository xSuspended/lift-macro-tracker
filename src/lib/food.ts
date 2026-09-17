import { supabase } from './supabase';
import type { DayTotals, Food, FoodLog, Meal, SavedMeal, Targets } from './types';

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

const FOOD_COLUMNS =
  'id, user_id, name, brand, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_name, serving_grams, source, source_ref';
const LOG_COLUMNS =
  'id, logged_on, meal, food_id, name, grams, kcal, protein_g, carbs_g, fat_g, created_at, food:foods(serving_name, serving_grams)';

// ---------- targets ----------

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('You are signed out. Sign in again.');
  return data.session.user.id;
}

export async function getTargets(): Promise<Targets> {
  const { data, error } = await supabase
    .from('profiles')
    .select('target_kcal, target_protein_g, target_carbs_g, target_fat_g')
    .single();
  if (error) throw error;
  return data;
}

export async function saveTargets(targets: Targets) {
  const { error } = await supabase.from('profiles').update(targets).eq('id', await currentUserId());
  if (error) throw error;
}

// ---------- foods ----------

export async function listFoods(): Promise<Food[]> {
  const { data, error } = await supabase.from('foods').select(FOOD_COLUMNS).order('name');
  if (error) throw error;
  return data;
}

export async function getFood(id: string): Promise<Food> {
  const { data, error } = await supabase.from('foods').select(FOOD_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data;
}

export type FoodInput = Pick<
  Food,
  | 'name'
  | 'brand'
  | 'kcal_per_100g'
  | 'protein_per_100g'
  | 'carbs_per_100g'
  | 'fat_per_100g'
  | 'serving_name'
  | 'serving_grams'
>;

/** `source` defaults to "custom"; foods found online pass where they came from. */
export async function createFood(food: FoodInput & Partial<Pick<Food, 'source' | 'source_ref'>>): Promise<Food> {
  const { data, error } = await supabase.from('foods').insert(food).select(FOOD_COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function updateFood(id: string, food: FoodInput) {
  const { error } = await supabase.from('foods').update(food).eq('id', id);
  if (error) throw error;
}

/** Past log entries keep their numbers; saved meals lose this food. */
export async function deleteFood(id: string) {
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw error;
}

// ---------- the food diary ----------

export async function listFoodLogs(day: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select(LOG_COLUMNS)
    .eq('logged_on', day)
    .order('created_at');
  if (error) throw error;
  return data as unknown as FoodLog[];
}

/** Totals per day from the `daily_nutrition` view, for days that have any food. */
export async function listDayTotals(fromDay: string, toDay: string): Promise<DayTotals[]> {
  const { data, error } = await supabase
    .from('daily_nutrition')
    .select('logged_on, kcal, protein_g, carbs_g, fat_g')
    .gte('logged_on', fromDay)
    .lte('logged_on', toDay)
    .order('logged_on');
  if (error) throw error;
  return data;
}

/** The database fills in the name and macros from the food and grams. */
export async function logFood(day: string, meal: Meal, foodId: string, grams: number) {
  const { error } = await supabase.from('food_logs').insert({ logged_on: day, meal, food_id: foodId, grams });
  if (error) throw error;
}

export type QuickAdd = { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export async function quickAdd(day: string, meal: Meal, entry: QuickAdd) {
  const { error } = await supabase.from('food_logs').insert({ logged_on: day, meal, ...entry });
  if (error) throw error;
}

export async function updateLogGrams(id: string, grams: number) {
  const { error } = await supabase.from('food_logs').update({ grams }).eq('id', id);
  if (error) throw error;
}

export async function deleteLog(id: string) {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

/** Copies every entry from one day onto another, in the same meals. Returns how many were copied. */
export async function copyDay(fromDay: string, toDay: string) {
  const logs = await listFoodLogs(fromDay);
  if (logs.length === 0) return 0;

  // A batch insert needs every row to have the same fields. For entries from a
  // food, the database recalculates the macros from food_id and grams anyway.
  const rows = logs.map((log) => ({
    logged_on: toDay,
    meal: log.meal,
    food_id: log.food_id,
    grams: log.grams,
    name: log.name,
    kcal: log.kcal,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
  }));
  const { error } = await supabase.from('food_logs').insert(rows);
  if (error) throw error;
  return rows.length;
}

// ---------- saved meals ----------

type SavedMealRow = {
  id: string;
  name: string;
  saved_meal_items: { food_id: string; grams: number; foods: { name: string } }[];
};

export async function listSavedMeals(): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('id, name, saved_meal_items(food_id, grams, foods(name))')
    .order('name');
  if (error) throw error;
  return (data as unknown as SavedMealRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    items: row.saved_meal_items.map((item) => ({
      food_id: item.food_id,
      grams: item.grams,
      food_name: item.foods.name,
    })),
  }));
}

/** Only entries logged from a food can be saved; quick-add entries have nothing to point at. */
export async function saveMeal(name: string, logs: FoodLog[]) {
  const items = logs.filter((log) => log.food_id && log.grams);
  if (items.length === 0) throw new Error('Only foods from your list can be saved as a meal, not quick adds.');
  const { data, error } = await supabase.from('saved_meals').insert({ name }).select('id').single();
  if (error) throw error;

  const { error: itemsError } = await supabase
    .from('saved_meal_items')
    .insert(items.map((log) => ({ saved_meal_id: data.id, food_id: log.food_id, grams: log.grams })));
  if (itemsError) throw itemsError;
}

export async function deleteSavedMeal(id: string) {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id);
  if (error) throw error;
}

export async function logSavedMeal(savedMeal: SavedMeal, day: string, meal: Meal) {
  const { error } = await supabase
    .from('food_logs')
    .insert(savedMeal.items.map((item) => ({ logged_on: day, meal, food_id: item.food_id, grams: item.grams })));
  if (error) throw error;
}

/** A preview of what an amount of a food works out to. The database does the real sum when it's logged. */
export function nutritionFor(food: Food, grams: number) {
  const f = grams / 100;
  return {
    kcal: food.kcal_per_100g * f,
    protein_g: food.protein_per_100g * f,
    carbs_g: food.carbs_per_100g * f,
    fat_g: food.fat_per_100g * f,
  };
}
