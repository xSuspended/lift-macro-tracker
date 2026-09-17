import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AmountSheet } from '@/components/amount-sheet';
import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { TextField } from '@/components/text-field';
import { confirm } from '@/lib/confirm';
import { describeDay } from '@/lib/dates';
import { deleteSavedMeal, listFoods, listSavedMeals, logFood, logSavedMeal, MEALS, quickAdd } from '@/lib/food';
import { errorMessage, formatNumber } from '@/lib/format';
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
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload when coming back from creating or editing a food.
  const load = useCallback(() => {
    Promise.all([listFoods(), listSavedMeals()])
      .then(([f, m]) => {
        setFoods(f);
        setSavedMeals(m);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useFocusEffect(load);

  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Diary';
  const query = search.trim().toLowerCase();
  const matches = (foods ?? []).filter(
    (f) => f.name.toLowerCase().includes(query) || (f.brand ?? '').toLowerCase().includes(query),
  );

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
        <>
          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={20} color={colors.textDim} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search your foods"
                placeholderTextColor={colors.textDim}
                style={styles.searchInput}
              />
            </View>
            <Pressable
              accessibilityLabel="New food"
              onPress={() => router.push({ pathname: '/food/edit', params: { name: search.trim() } })}
              style={({ pressed }) => [styles.newFood, pressed && styles.pressed]}>
              <Ionicons name="add" size={26} color={colors.onAccent} />
            </Pressable>
          </View>

          {foods === null ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {foods.length === 0
                    ? 'No foods yet. Tap + to add one from its nutrition label.'
                    : 'No match. Tap + to add it.'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Pressable
                    onPress={() => setPicked(item)}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[
                        item.brand,
                        item.serving_name && item.serving_grams
                          ? `${formatNumber(Math.round((item.kcal_per_100g * item.serving_grams) / 100))} kcal per ${item.serving_name}`
                          : `${formatNumber(item.kcal_per_100g)} kcal per 100 g`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Pressable>
                  {item.user_id ? (
                    <Pressable
                      accessibilityLabel={`Edit ${item.name}`}
                      onPress={() => router.push({ pathname: '/food/edit', params: { id: item.id } })}
                      style={({ pressed }) => [styles.rowIcon, pressed && styles.pressed]}>
                      <Ionicons name="create-outline" size={20} color={colors.textDim} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          )}
        </>
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
  searchRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: TAP_TARGET,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, minHeight: TAP_TARGET, color: colors.text, fontSize: 17 },
  newFood: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
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
