// Supabase Edge Function: searches Open Food Facts and USDA FoodData Central,
// and looks up barcodes, on behalf of the app.
//
// Why a server function: Open Food Facts' text search doesn't allow requests from
// web pages (no CORS header), so the website can't call it directly. Server-to-server
// calls have no such limit, so the app asks this function instead, on web and phone.
//
// Deploy: Supabase Dashboard -> Edge Functions -> Deploy a new function -> Via Editor,
// name it `food-search`, paste this whole file, Deploy.
// Optional: add a secret USDA_API_KEY (free from https://fdc.nal.usda.gov/api-key-signup)
// under Edge Functions -> Secrets. Without it USDA's shared DEMO_KEY is used, which is
// limited to a few dozen searches an hour.
//
// Request body:  { "query": "greek yoghurt" }  or  { "barcode": "3017624010701" }
// Response:      { "results": FoodCandidate[], "errors": string[] }

type FoodCandidate = {
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

const USER_AGENT = 'LiftMacroTracker/1.0';
const PAGE_SIZE = 15;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const num = (value: unknown) => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const round = (n: number) => Math.round(n * 10) / 10;

// ---------- Open Food Facts ----------

// deno-lint-ignore no-explicit-any
function fromOpenFoodFacts(p: any): FoodCandidate | null {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  const kj = num(n['energy_100g']);
  if (kcal === null && kj !== null) kcal = kj / 4.184;

  const name = typeof p.product_name === 'string' ? p.product_name.trim() : '';
  if (!name || kcal === null || !p.code) return null;

  const brand = Array.isArray(p.brands) ? p.brands.join(', ') : p.brands;
  const servingGrams = num(p.serving_quantity);
  const servingUnit = (p.serving_quantity_unit ?? 'g').toString().toLowerCase();
  // "1 pot (170 g)" -> "1 pot"
  const servingName =
    typeof p.serving_size === 'string' && p.serving_size.includes('(') ? p.serving_size.split('(')[0].trim() : null;

  return {
    source: 'off',
    source_ref: String(p.code),
    name,
    brand: brand ? String(brand) : null,
    kcal_per_100g: round(kcal),
    protein_per_100g: round(num(n.proteins_100g) ?? 0),
    carbs_per_100g: round(num(n.carbohydrates_100g) ?? 0),
    fat_per_100g: round(num(n.fat_100g) ?? 0),
    serving_name: servingGrams && servingUnit === 'g' ? servingName || 'serving' : null,
    serving_grams: servingGrams && servingGrams > 0 && servingUnit === 'g' ? servingGrams : null,
  };
}

const OFF_FIELDS = 'code,product_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit';

async function searchOpenFoodFacts(query: string) {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${PAGE_SIZE}&langs=en&fields=${OFF_FIELDS}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);
  const data = await res.json();
  return (data.hits ?? []).map(fromOpenFoodFacts).filter(Boolean) as FoodCandidate[];
}

async function lookupOpenFoodFacts(barcode: string) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`);
  const data = await res.json();
  const food = data.status === 1 ? fromOpenFoodFacts(data.product) : null;
  return food ? [food] : [];
}

// ---------- USDA FoodData Central ----------

const NUTRIENT = { protein: 1003, fat: 1004, carbs: 1005, kcal: 1008, kcalAtwaterGeneral: 2047, kcalAtwaterSpecific: 2048 };

// deno-lint-ignore no-explicit-any
function fromUsda(f: any): FoodCandidate | null {
  // deno-lint-ignore no-explicit-any
  const nutrient = (id: number) => num(f.foodNutrients?.find((x: any) => x.nutrientId === id && x.unitName !== 'kJ')?.value);
  const kcal = nutrient(NUTRIENT.kcal) ?? nutrient(NUTRIENT.kcalAtwaterGeneral) ?? nutrient(NUTRIENT.kcalAtwaterSpecific);
  if (kcal === null || !f.description) return null;

  const unit = (f.servingSizeUnit ?? '').toString().toLowerCase();
  const servingGrams = (unit === 'g' || unit === 'grm') && num(f.servingSize) ? num(f.servingSize) : null;

  const brand = f.brandName || f.brandOwner;
  const household = typeof f.householdServingFullText === 'string' ? f.householdServingFullText : '';

  return {
    source: 'usda',
    source_ref: String(f.fdcId),
    name: unshout(f.description),
    brand: brand ? unshout(brand) : null,
    kcal_per_100g: round(kcal),
    protein_per_100g: round(nutrient(NUTRIENT.protein) ?? 0),
    carbs_per_100g: round(nutrient(NUTRIENT.carbs) ?? 0),
    fat_per_100g: round(nutrient(NUTRIENT.fat) ?? 0),
    // "1 CONTAINER" -> "1 container", "5.3 ONZ" -> "5.3 oz"
    serving_name: servingGrams ? household.toLowerCase().replace(/\bonz\b/g, 'oz') || 'serving' : null,
    serving_grams: servingGrams,
  };
}

/** USDA often sends names in capitals; turn mostly-capital text into Title Case. */
function unshout(text: string) {
  const letters = text.replace(/[^\p{L}]/gu, '');
  const capitals = letters.replace(/[^\p{Lu}]/gu, '');
  if (letters.length === 0 || capitals.length / letters.length < 0.6) return text;
  return text.toLowerCase().replace(/(^|[\s,(/-])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

/** Drops results that are the same food listed twice (e.g. one product under two barcodes). */
function withoutDuplicates(foods: FoodCandidate[]) {
  const seen = new Set<string>();
  return foods.filter((f) => {
    const key = [f.source, f.name.toLowerCase(), (f.brand ?? '').toLowerCase(), f.kcal_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchUsda(query: string) {
  const key = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=${PAGE_SIZE}&dataType=Foundation,SR%20Legacy,Branded`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error('USDA search limit reached for now. Try again later.');
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`);
  const data = await res.json();
  return (data.foods ?? []).map(fromUsda).filter(Boolean) as FoodCandidate[];
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: { query?: string; barcode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ results: [], errors: ['Send JSON with "query" or "barcode".'] }, 400);
  }

  const barcode = body.barcode?.replace(/\D/g, '');
  if (barcode) {
    try {
      return json({ results: await lookupOpenFoodFacts(barcode), errors: [] });
    } catch (e) {
      return json({ results: [], errors: [(e as Error).message] });
    }
  }

  const query = body.query?.trim() ?? '';
  if (query.length < 2) return json({ results: [], errors: ['Type at least 2 letters.'] }, 400);

  // Ask both at once; one being down shouldn't hide the other's results.
  const [off, usda] = await Promise.allSettled([searchOpenFoodFacts(query), searchUsda(query)]);
  const results = withoutDuplicates([
    ...(off.status === 'fulfilled' ? off.value : []),
    ...(usda.status === 'fulfilled' ? usda.value : []),
  ]);
  const errors = [off, usda].filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason.message);
  return json({ results, errors });
});
