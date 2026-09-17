import type { FoodCandidate } from './food-search';

// Offline search over official national food composition tables bundled with
// the app (built by scripts/build-food-tables.mjs). No network, keys or limits.

export type TableSource = 'cofid' | 'cnf' | 'afcd' | 'ifct';

type TableFile = {
  sources: TableSource[];
  /** [source index, ref, name, kcal, protein, carbs, fat, other names?] per 100 g */
  foods: [number, string, string, number, number, number, number, string?][];
};

type Indexed = {
  source: TableSource;
  ref: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  nameWords: string[];
  otherWords: string[];
};

// The list is ~800 KB, so it's loaded the first time someone searches rather than at startup.
let loading: Promise<Indexed[]> | null = null;

function loadTables() {
  loading ??= import('@/data/food-tables.json').then((module) => {
    const data = (module.default ?? module) as unknown as TableFile;
    return data.foods.map(([s, ref, name, kcal, protein, carbs, fat, other]) => ({
      source: data.sources[s],
      ref,
      name,
      kcal,
      protein,
      carbs,
      fat,
      nameWords: words(name),
      otherWords: other ? words(other) : [],
    }));
  });
  return loading;
}

// Different spellings of the same thing, all mapped to one word.
const SAME_WORD: Record<string, string> = {
  yoghurt: 'yogurt',
  yoghurts: 'yogurt',
  yogurts: 'yogurt',
  chapatti: 'chapati',
  chapattis: 'chapati',
  chapatis: 'chapati',
  roti: 'chapati',
  rotis: 'chapati',
  dhal: 'dal',
  daal: 'dal',
  dahl: 'dal',
  dahi: 'yogurt',
  chickpeas: 'chickpea',
  garbanzo: 'chickpea',
  aubergine: 'eggplant',
  courgette: 'zucchini',
  mince: 'ground',
};

function normalise(word: string) {
  const plain = word.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return SAME_WORD[plain] ?? plain;
}

function words(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}%]+/u)
    .filter(Boolean)
    .map(normalise);
}

/**
 * Finds foods whose words start with every word you typed, so "rice boiled" finds
 * "Rice, white, boiled" but "dal" doesn't find "Wensleydale". Whole-word matches in
 * the name rank above partial ones, and shorter, simpler names rank higher.
 */
export async function searchFoodTables(query: string, limit = 20): Promise<FoodCandidate[]> {
  const terms = words(query);
  if (terms.length === 0 || query.trim().length < 2) return [];
  const foods = await loadTables();

  const scored: { food: Indexed; score: number }[] = [];
  for (const food of foods) {
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      if (food.nameWords.includes(term)) score += 3;
      else if (food.nameWords.some((w) => w.startsWith(term))) score += 2;
      else if (food.otherWords.some((w) => w.startsWith(term))) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (!matchedAll) continue;
    if (food.nameWords[0]?.startsWith(terms[0])) score += 2;
    score -= food.nameWords.length * 0.15;
    scored.push({ food, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => ({
      source: food.source,
      source_ref: food.ref,
      name: food.name,
      brand: null,
      kcal_per_100g: food.kcal,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      serving_name: null,
      serving_grams: null,
    }));
}
