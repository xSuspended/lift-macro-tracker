// Builds src/data/food-tables.json: the offline food list searched in the app.
// Every value is per 100 g edible portion.
//
// Not part of the app, and its libraries aren't app dependencies. To rebuild,
// in an empty folder outside the project:
//   1. Download the four source files below, using the names shown.
//   2. npm install xlsx@0.18.5 csv-parse@5
//   3. Copy this script there, run `node build-food-tables.mjs`, and copy
//      food-tables.json to src/data/.
//
// Sources and licences:
//   cofid.xlsx      UK McCance & Widdowson's CoFID 2021 — Open Government Licence v3.0
//     https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
//   cnf_food_name.csv, cnf_nutrient_amount.csv
//                   Canadian Nutrient File 2026 — Open Government Licence – Canada
//     https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109
//   afcd.xlsx       Australian Food Composition Database Release 3 (FSANZ) — "Nutrient profiles"
//     https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/data-files
//   ifct/package/index.csv
//                   Indian Food Composition Tables 2017 (ICMR-NIN), via npm @ifct2017/compositions 2.0.9 (MIT)
//     https://registry.npmjs.org/@ifct2017/compositions/-/compositions-2.0.9.tgz

import XLSX from 'xlsx';
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

const KJ_PER_KCAL = 4.184;
const kcalRound = (n) => Math.round(n);
const gRound = (n) => Math.round(n * 10) / 10;
// Tables write "Tr" for trace amounts and "N" for not measured.
const value = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (/^tr$/i.test(s)) return 0;
  const n = Number(s.replace(/[()]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const SOURCES = ['cofid', 'cnf', 'afcd', 'ifct'];
const foods = [];
const stats = {};
function add(source, ref, name, kcal, protein, carbs, fat, alt = '') {
  stats[source] ??= { kept: 0, skipped: 0 };
  name = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!name || kcal === null || kcal < 0 || kcal > 950) { stats[source].skipped++; return; }
  const row = [SOURCES.indexOf(source), String(ref), name, kcalRound(kcal), gRound(protein ?? 0), gRound(carbs ?? 0), gRound(fat ?? 0)];
  if (alt) row.push(alt);
  foods.push(row);
  stats[source].kept++;
}

// UK CoFID 2021 — "1.3 Proximates", first 3 rows are headers, values per 100 g, kcal given.
{
  const rows = XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync('cofid.xlsx')).Sheets['1.3 Proximates'], { header: 1, blankrows: false });
  const head = rows[0].map(String);
  const c = (label) => head.findIndex((h) => h.startsWith(label));
  const col = { code: 0, name: 1, protein: c('Protein (g)'), fat: c('Fat (g)'), carbs: c('Carbohydrate (g)'), kcal: c('Energy (kcal)') };
  for (const r of rows.slice(3)) add('cofid', r[col.code], r[col.name], value(r[col.kcal]), value(r[col.protein]), value(r[col.carbs]), value(r[col.fat]));
}

// Canadian Nutrient File 2026 — nutrient codes follow USDA: 208 kcal, 203 protein, 204 fat, 205 carbohydrate.
{
  const names = parse(fs.readFileSync('cnf_food_name.csv'), { columns: true, bom: true });
  const amounts = parse(fs.readFileSync('cnf_nutrient_amount.csv'), { columns: true, bom: true });
  const byFood = new Map();
  for (const a of amounts) {
    if (!['208', '203', '204', '205'].includes(a.Nutrient_Code)) continue;
    const f = byFood.get(a.Food_Code) ?? {};
    f[a.Nutrient_Code] = value(a.Nutrient_Amount);
    byFood.set(a.Food_Code, f);
  }
  for (const n of names) {
    const f = byFood.get(n.Food_Code) ?? {};
    add('cnf', n.Food_Code, n.Food_Description_EN, f['208'] ?? null, f['203'], f['205'], f['204']);
  }
}

// Australian AFCD Release 3 — per 100 g sheet, energy in kJ (with dietary fibre).
{
  const rows = XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync('afcd.xlsx')).Sheets['All solids & liquids per 100 g'], { header: 1, blankrows: false });
  const headIndex = rows.findIndex((r) => r.includes('Food Name'));
  const head = rows[headIndex].map((h) => String(h).replace(/\s+/g, ' '));
  const c = (re) => head.findIndex((h) => re.test(h));
  const col = { key: c(/^Public Food Key/), name: c(/^Food Name/), kj: c(/^Energy with dietary fibre/), protein: c(/^Protein \(g\)/), fat: c(/^Fat, total/), carbs: c(/^Available carbohydrate, with sugar alcohols/) };
  for (const r of rows.slice(headIndex + 1)) {
    const kj = value(r[col.kj]);
    add('afcd', r[col.key], r[col.name], kj === null ? null : kj / KJ_PER_KCAL, value(r[col.protein]), value(r[col.carbs]), value(r[col.fat]));
  }
}

// Indian IFCT 2017 — energy in kJ; local names (Hindi, Tamil, …) kept so "chana dal" or "atta" finds the food.
{
  const rows = parse(fs.readFileSync('ifct/package/index.csv'));
  const head = rows[0];
  const c = (key) => head.findIndex((h) => h.endsWith(`; ${key}`));
  const col = { code: c('code'), name: c('name'), lang: c('lang'), kj: c('enerc'), protein: c('protcnt'), fat: c('fatce'), carbs: c('choavldf') };
  for (const r of rows.slice(1)) {
    const kj = value(r[col.kj]);
    // "A. Moricha guti; H. Ramdana; Kan. Danthu beeja" -> "moricha guti ramdana danthu beeja"
    const alt = String(r[col.lang] ?? '')
      .split(';')
      .map((s) => s.replace(/^\s*[A-Z][a-z]*\.\s*/, '').trim())
      .filter(Boolean)
      .join(', ')
      .slice(0, 200);
    add('ifct', r[col.code], r[col.name], kj === null ? null : kj / KJ_PER_KCAL, value(r[col.protein]), value(r[col.carbs]), value(r[col.fat]), alt);
  }
}

const out = {
  // One entry per food: [source, ref, name, kcal, protein g, carbs g, fat g, other names?], all per 100 g.
  sources: SOURCES,
  foods,
};
fs.writeFileSync('food-tables.json', JSON.stringify(out));
console.log(stats, 'total', foods.length, 'bytes', fs.statSync('food-tables.json').size);

// spot checks against known values
const find = (s, re) => foods.find((f) => f[0] === SOURCES.indexOf(s) && re.test(f[2]));
for (const [s, re] of [['cofid', /^Chapati flour, brown/i], ['cofid', /^Bananas, flesh only/i], ['cnf', /^Chicken, broiler, breast, meat, roasted/i], ['afcd', /^Banana, cavendish, peeled, raw/i], ['ifct', /^Bengal gram, dal/i], ['ifct', /^Egg, poultry, whole, raw/i]]) {
  const f = find(s, re);
  console.log(s.padEnd(6), f ? `${f[2]} — ${f[3]} kcal P${f[4]} C${f[5]} F${f[6]} (macros≈${Math.round(f[4] * 4 + f[5] * 4 + f[6] * 9)})${f[7] ? ' | ' + f[7].slice(0, 60) : ''}` : 'NOT FOUND ' + re);
}
