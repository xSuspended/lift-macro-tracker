import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountSheet } from '@/components/amount-sheet';
import { Button } from '@/components/button';
import { MacroTotals } from '@/components/macro-totals';
import { MealSection } from '@/components/meal-section';
import { NamePrompt } from '@/components/name-prompt';
import { LoadingScreen } from '@/components/screen';
import { confirm } from '@/lib/confirm';
import { addDays, describeDay, todayKey } from '@/lib/dates';
import {
  copyDay,
  deleteLog,
  getFood,
  getTargets,
  listDayTotals,
  listFoodLogs,
  MEALS,
  saveMeal,
  updateLogGrams,
} from '@/lib/food';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { DayTotals, Food, FoodLog, Meal, Targets } from '@/lib/types';

type Loaded = { day: string; logs: FoodLog[]; totals: DayTotals[]; targets: Targets };
type Editing = { log: FoodLog; food: Food };

export default function FoodTab() {
  const [day, setDay] = useState(todayKey);
  const [data, setData] = useState<Loaded | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previousDay = describeDay(addDays(day, -1));
  const previousDayPhrase = previousDay === 'Yesterday' || previousDay === 'Today' ? previousDay.toLowerCase() : previousDay;

  const load = useCallback(() => {
    setError(null);
    Promise.all([listFoodLogs(day), listDayTotals(day, day), getTargets()])
      .then(([logs, totals, targets]) => setData({ day, logs, totals, targets }))
      .catch((e) => setError(errorMessage(e)));
  }, [day]);

  useFocusEffect(load);

  function openAdd(meal: Meal) {
    router.push({ pathname: '/food/add', params: { day, meal } });
  }

  async function handlePressLog(log: FoodLog) {
    if (!log.food_id) {
      const ok = await confirm('Remove this entry?', `${log.name} (${Math.round(log.kcal)} kcal)`, 'Remove');
      if (!ok) return;
      await deleteLog(log.id).then(load, (e) => setError(errorMessage(e)));
      return;
    }
    try {
      setEditing({ log, food: await getFood(log.food_id) });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleCopyPreviousDay() {
    setError(null);
    setCopying(true);
    try {
      const copied = await copyDay(addDays(day, -1), day);
      if (copied === 0) {
        setError(`Nothing was logged ${previousDayPhrase === previousDay ? `on ${previousDay}` : previousDayPhrase}.`);
      } else {
        load();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCopying(false);
    }
  }

  // Keep showing the previous day's numbers while the new day loads, but never mix days.
  const current = data?.day === day ? data : null;
  if (!data && !error) return <LoadingScreen />;

  const logs = current?.logs ?? [];
  const targets = data?.targets;
  const dayTotals = current?.totals.find((t) => t.logged_on === day) ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const hasAllTargets =
    !!targets &&
    [targets.target_kcal, targets.target_protein_g, targets.target_carbs_g, targets.target_fat_g].every(
      (t) => t !== null && t > 0,
    );

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayBar}>
          <Pressable
            accessibilityLabel="Previous day"
            onPress={() => setDay(addDays(day, -1))}
            style={({ pressed }) => [styles.dayButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setDay(todayKey())} style={styles.dayLabelWrap}>
            <Text style={styles.dayLabel}>{describeDay(day)}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Next day"
            disabled={day >= todayKey()}
            onPress={() => setDay(addDays(day, 1))}
            style={({ pressed }) => [styles.dayButton, pressed && styles.pressed, day >= todayKey() && styles.disabled]}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Button label="Try again" onPress={load} variant="secondary" />
          </View>
        ) : null}

        {targets ? <MacroTotals totals={dayTotals} targets={targets} /> : null}

        {targets && !hasAllTargets ? (
          <Pressable onPress={() => router.navigate('/settings')}>
            <Text style={styles.hint}>Set your calorie and macro targets in Settings to track against them →</Text>
          </Pressable>
        ) : null}

        {current && logs.length === 0 ? (
          <Button
            label={`Copy food from ${previousDayPhrase}`}
            onPress={handleCopyPreviousDay}
            variant="secondary"
            loading={copying}
          />
        ) : null}

        {MEALS.map((meal) => (
          <MealSection
            key={meal.key}
            label={meal.label}
            logs={logs.filter((log) => log.meal === meal.key)}
            onAdd={() => openAdd(meal.key)}
            onPressLog={handlePressLog}
            onSaveMeal={() => setSavingMeal(meal.key)}
          />
        ))}
      </ScrollView>

      <AmountSheet
        food={editing?.food ?? null}
        initialGrams={editing?.log.grams ?? undefined}
        submitLabel="Save"
        onClose={() => setEditing(null)}
        onSubmit={async (grams) => {
          if (!editing) return;
          await updateLogGrams(editing.log.id, grams);
          setEditing(null);
          load();
        }}
        onDelete={async () => {
          if (!editing) return;
          await deleteLog(editing.log.id);
          setEditing(null);
          load();
        }}
      />

      <NamePrompt
        visible={savingMeal !== null}
        title="Save as a meal"
        label="Meal name"
        placeholder="e.g. Usual breakfast"
        submitLabel="Save meal"
        onClose={() => setSavingMeal(null)}
        onSubmit={async (name) => {
          await saveMeal(name, logs.filter((log) => log.meal === savingMeal));
          setSavingMeal(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  dayBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayButton: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayLabelWrap: { flex: 1, alignItems: 'center', minHeight: TAP_TARGET, justifyContent: 'center' },
  dayLabel: { color: colors.text, fontSize: 22, fontWeight: '700' },
  pressed: { backgroundColor: colors.cardPressed },
  disabled: { opacity: 0.35 },
  errorBox: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 15 },
  hint: { color: colors.accent, fontSize: 14, lineHeight: 20, paddingVertical: spacing.xs },
});
