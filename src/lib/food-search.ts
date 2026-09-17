import { createFood, getFood } from './food';
import { supabase } from './supabase';
import type { Food } from './types';

/** A food found online, not yet saved to your foods. Nutrition is per 100 g. */
export type FoodCandidate = {
  source: 'off' | 'usda';
  source_ref: string;
  name: string;
  brand: string | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_name: string | null;
  serving_grams: number | null;
};

export const SOURCE_LABELS: Record<FoodCandidate['source'], string> = {
  off: 'Open Food Facts',
  usda: 'USDA',
};

type SearchResponse = { results: FoodCandidate[]; errors: string[] };

async function callSearch(body: { query: string } | { barcode: string }): Promise<SearchResponse> {
  const { data, error } = await supabase.functions.invoke<SearchResponse>('food-search', { body });
  if (error) {
    // A missing function returns 404 on a phone, but a browser blocks that reply
    // before the app can read it, so on web it looks like a network failure.
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) {
      throw new Error('Online search isn’t set up yet: deploy the food-search function in Supabase.');
    }
    throw new Error(
      'Couldn’t reach online search. Check your connection, and that the food-search function is deployed in Supabase.',
    );
  }
  return data ?? { results: [], errors: [] };
}

/** Searches Open Food Facts and USDA. Any source that failed is listed in `errors`. */
export function searchFoodsOnline(query: string) {
  return callSearch({ query });
}

export async function lookupBarcode(barcode: string) {
  const { results, errors } = await callSearch({ barcode });
  if (errors.length) throw new Error(errors[0]);
  return results[0] ?? null;
}

/**
 * Saves a found food into your foods so it can be logged, and works offline next
 * time. If you've saved this exact product before, returns that copy instead.
 */
export async function saveFoundFood(candidate: FoodCandidate): Promise<Food> {
  const { data: existing, error } = await supabase
    .from('foods')
    .select('id')
    .eq('source', candidate.source)
    .eq('source_ref', candidate.source_ref)
    .not('user_id', 'is', null)
    .maybeSingle();
  if (error) throw error;

  if (existing) return getFood(existing.id);
  return createFood(candidate);
}
