import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountSheet } from '@/components/amount-sheet';
import { Button } from '@/components/button';
import { FoodFinder } from '@/components/food-finder';
import { Segmented } from '@/components/segmented';
import { TextField } from '@/components/text-field';
import { confirm } from '@/lib/confirm';
import { describeDay } from '@/lib/dates';
import { deleteSavedMeal, listFoods, listSavedMeals, logFood, logSavedMeal, MEALS, quickAdd } from '@/lib/food';
import { errorMessage } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { Food, Meal, SavedMeal } from '@/lib/types';

type Tab = 'foods' | 'meals' | 'quick';

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ day: string; meal: Meal }>();
  const day = params.day;
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'snack');
  const [tab, setTab] = useState<Tab>('foods');
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[] | null>(null);
  const [picked, setPicked] = useState<Food | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Food ids we've already seen, so a food created from here can be spotted
  // on return and opened straight into the amount picker to log it.
  const knownFoodIds = useRef<Set<string>>(new Set());
  const creatingFood = useRef(false);

  // Reload when coming back from creating or editing a food.
  const load = useCallback(() => {
    Promise.all([listFoods(), listSavedMeals()])
      .then(([f, m]) => {
        if (creatingFood.current) {
          creatingFood.current = false;
          const created = f.find((food) => !knownFoodIds.current.has(food.id));
          if (created) setPicked(created);
        }
        knownFoodIds.current = new Set(f.map((food) => food.id));
        setFoods(f);
        setSavedMeals(m);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useFocusEffect(load);

  function openNewFood(name: string) {
    creatingFood.current = true;
    router.push({ pathname: '/food/edit', params: { name } });
  }

  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Diary';

  async function handleLogSavedMeal(saved: SavedMeal) {
    setError(null);
    try {
      await logSavedMeal(saved, day, meal);
      goBack('/food');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDeleteSavedMeal(saved: SavedMeal) {
    if (!(await confirm(`Delete "${saved.name}"?`, 'Food you already logged is kept.', 'Delete'))) return;
    try {
      await deleteSavedMeal(saved.id);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `Add to ${mealLabel}` }} />

      <View style={styles.top}>
        <Text style={styles.dim}>{describeDay(day)}</Text>
        <Segmented options={MEALS} value={meal} onChange={setMeal} />
        <Segmented
          options={[
            { key: 'foods', label: 'My foods' },
            { key: 'meals', label: 'Saved meals' },
            { key: 'quick', label: 'Quick add' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {tab === 'foods' ? (
        <FoodFinder
          foods={foods}
          mealLabel={mealLabel}
          onPick={setPicked}
          onNewFood={openNewFood}
          onEditFood={(food) => router.push({ pathname: '/food/edit', params: { id: food.id } })}
          onFoodSaved={load}
        />
      ) : null}

      {tab === 'meals' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {savedMeals === null ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
          {savedMeals?.length === 0 ? (
            <Text style={styles.empty}>
              No saved meals yet. On the Food tab, tap “Save meal” under a meal you eat often.
            </Text>
          ) : null}
          {savedMeals?.map((saved) => (
            <View key={saved.id} style={styles.row}>
              <Pressable
                onPress={() => handleLogSavedMeal(saved)}
                style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                <Text style={styles.name} numberOfLines={1}>
                  {saved.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {saved.items.map((i) => i.food_name).join(', ')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${saved.name}`}
                onPress={() => handleDeleteSavedMeal(saved)}
                style={({ pressed }) => [styles.rowIcon, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {tab === 'quick' ? <QuickAddForm day={day} meal={meal} /> : null}

      <AmountSheet
        food={picked}
        submitLabel={`Add to ${mealLabel}`}
        onClose={() => setPicked(null)}
        onSubmit={async (grams) => {
          if (!picked) return;
          await logFood(day, meal, picked.id, grams);
          setPicked(null);
          goBack('/food');
        }}
      />
    </View>
  );
}

function QuickAddForm({ day, meal }: { day: string; meal: Meal }) {
  const [name, setName] = useState('');
  const [values, setValues] = useState({ kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (text: string) => (text.trim() === '' ? 0 : Number(text.replace(',', '.')));
  const set = (key: keyof typeof values) => (text: string) => setValues({ ...values, [key]: text });

  async function submit() {
    const entry = {
      name: name.trim() || 'Quick add',
      kcal: num(values.kcal),
      protein_g: num(values.protein_g),
      carbs_g: num(values.carbs_g),
      fat_g: num(values.fat_g),
    };
    if ([entry.kcal, entry.protein_g, entry.carbs_g, entry.fat_g].some((n) => !Number.isFinite(n) || n < 0)) {
      setError('Numbers only, and none below zero.');
      return;
    }
    if (entry.kcal === 0) {
      setError('Enter the calories.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await quickAdd(day, meal, entry);
      goBack('/food');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      <Text style={styles.dim}>For when you only know the totals, like a restaurant meal.</Text>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Burrito at lunch" />
      <TextField label="Calories (kcal)" value={values.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" placeholder="0" />
      <View style={styles.grid}>
        <View style={styles.cell}>
          <TextField label="Protein (g)" value={values.protein_g} onChangeText={set('protein_g')} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.cell}>
          <TextField label="Carbs (g)" value={values.carbs_g} onChangeText={set('carbs_g')} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.cell}>
          <TextField label="Fat (g)" value={values.fat_g} onChangeText={set('fat_g')} keyboardType="decimal-pad" placeholder="0" />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Add to diary" onPress={submit} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: colors.bg },
  top: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  dim: { color: colors.textDim, fontSize: 14 },
  error: { color: colors.danger, fontSize: 15 },
  loading: { marginTop: spacing.xxl },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { color: colors.textDim, fontSize: 15, textAlign: 'center', paddingVertical: spacing.xl, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowMain: { flex: 1, minHeight: TAP_TARGET + 4, justifyContent: 'center', gap: 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowIcon: {
    width: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  pressed: { backgroundColor: colors.cardPressed },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13 },
  grid: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
