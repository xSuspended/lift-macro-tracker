/** Calories in one gram of each macro (the standard Atwater numbers food labels use). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export type MacroKey = keyof typeof KCAL_PER_GRAM;
export type Grams = Record<MacroKey, number>;

export const MACRO_KEYS: MacroKey[] = ['protein', 'carbs', 'fat'];

/** Share of calories each macro gets when nothing is set yet. */
const DEFAULT_SPLIT: Record<MacroKey, number> = { protein: 0.3, carbs: 0.4, fat: 0.3 };

/** Calories that a set of macro grams adds up to. */
export function kcalFromMacros(g: Grams) {
  return g.protein * KCAL_PER_GRAM.protein + g.carbs * KCAL_PER_GRAM.carbs + g.fat * KCAL_PER_GRAM.fat;
}

/** How far macros may be from the calorie target and still count as matching. */
export function kcalTolerance(kcal: number) {
  return Math.max(20, kcal * 0.02);
}

/** The two macros that aren't `key`. */
function others(key: MacroKey) {
  return MACRO_KEYS.filter((m) => m !== key) as [MacroKey, MacroKey];
}

/**
 * Makes the macros add up to `kcal`. The locked macro keeps its grams and the
 * other two share what's left, keeping the same ratio between them as before.
 */
export function fitToCalories(kcal: number, grams: Record<MacroKey, number | null>, locked: MacroKey): Grams {
  if (MACRO_KEYS.every((m) => grams[m] === null)) {
    return {
      protein: Math.round((kcal * DEFAULT_SPLIT.protein) / KCAL_PER_GRAM.protein),
      carbs: Math.round((kcal * DEFAULT_SPLIT.carbs) / KCAL_PER_GRAM.carbs),
      fat: Math.round((kcal * DEFAULT_SPLIT.fat) / KCAL_PER_GRAM.fat),
    };
  }

  const g: Grams = { protein: grams.protein ?? 0, carbs: grams.carbs ?? 0, fat: grams.fat ?? 0 };

  // Some left blank: the blank ones get what's left over, the set ones stay.
  const blank = MACRO_KEYS.filter((m) => grams[m] === null);
  const left = kcal - kcalFromMacros(g);
  if (blank.length > 0 && left >= 0) {
    const shareTotal = blank.reduce((sum, m) => sum + DEFAULT_SPLIT[m], 0);
    for (const m of blank) g[m] = Math.round((left * DEFAULT_SPLIT[m]) / shareTotal / KCAL_PER_GRAM[m]);
    return g;
  }

  // The locked macro can't use more than all the calories.
  g[locked] = Math.min(g[locked], Math.floor(kcal / KCAL_PER_GRAM[locked]));
  const rest = kcal - g[locked] * KCAL_PER_GRAM[locked];

  const [a, b] = others(locked);
  const aKcal = g[a] * KCAL_PER_GRAM[a];
  const bKcal = g[b] * KCAL_PER_GRAM[b];
  const share = aKcal + bKcal > 0 ? aKcal / (aKcal + bKcal) : 0.5;
  g[a] = Math.round((rest * share) / KCAL_PER_GRAM[a]);
  g[b] = Math.round((rest * (1 - share)) / KCAL_PER_GRAM[b]);
  return g;
}

/**
 * Sets one macro to `value` grams. The locked macro stays put and the third
 * macro moves the other way so the total stays at `kcal`.
 */
export function moveMacro(kcal: number, grams: Grams, locked: MacroKey, moved: MacroKey, value: number): Grams {
  if (moved === locked) return grams;
  const [other] = others(locked).filter((m) => m !== moved);
  const left = kcal - grams[locked] * KCAL_PER_GRAM[locked];
  const max = Math.max(0, Math.floor(left / KCAL_PER_GRAM[moved]));
  const next = Math.min(max, Math.max(0, Math.round(value)));
  const rest = Math.max(0, Math.round((left - next * KCAL_PER_GRAM[moved]) / KCAL_PER_GRAM[other]));
  return { ...grams, [moved]: next, [other]: rest };
}
