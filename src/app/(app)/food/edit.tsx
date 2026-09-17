import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorScreen, LoadingScreen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { confirm } from '@/lib/confirm';
import { createFood, deleteFood, getFood, updateFood, type FoodInput } from '@/lib/food';
import { errorMessage, formatNumber } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { colors, spacing } from '@/lib/theme';

type Fields = {
  name: string;
  brand: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  servingName: string;
  servingGrams: string;
};

const BLANK: Fields = { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', servingName: '', servingGrams: '' };

/** Create a food from its nutrition label, or edit one of yours. */
export default function EditFoodScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const editingId = params.id;
  const [fields, setFields] = useState<Fields | null>(editingId ? null : { ...BLANK, name: params.name ?? '' });
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFood = useCallback(() => {
    if (!editingId) return;
    setError(null);
    getFood(editingId)
      .then((food) =>
        setFields({
          name: food.name,
          brand: food.brand ?? '',
          kcal: formatNumber(food.kcal_per_100g),
          protein: formatNumber(food.protein_per_100g),
          carbs: formatNumber(food.carbs_per_100g),
          fat: formatNumber(food.fat_per_100g),
          servingName: food.serving_name ?? '',
          servingGrams: food.serving_grams ? formatNumber(food.serving_grams) : '',
        }),
      )
      .catch((e) => setError(errorMessage(e)));
  }, [editingId]);

  useEffect(loadFood, [loadFood]);

  if (!fields) return error ? <ErrorScreen message={error} onRetry={loadFood} /> : <LoadingScreen />;

  const set = (key: keyof Fields) => (text: string) => setFields({ ...fields, [key]: text });

  function parse(): FoodInput | string {
    const f = fields!;
    const num = (text: string) => (text.trim() === '' ? 0 : Number(text.replace(',', '.')));
    if (!f.name.trim()) return 'Give the food a name.';
    const values = [num(f.kcal), num(f.protein), num(f.carbs), num(f.fat)];
    if (values.some((v) => !Number.isFinite(v) || v < 0)) return 'Nutrition values must be numbers, none below zero.';
    if (f.kcal.trim() === '') return 'Enter the calories per 100 g.';
    if (values[1] > 100 || values[2] > 100 || values[3] > 100) return 'Protein, carbs and fat per 100 g can’t be more than 100 g.';

    const servingGrams = f.servingGrams.trim() === '' ? null : num(f.servingGrams);
    if (servingGrams !== null && (!Number.isFinite(servingGrams) || servingGrams <= 0)) {
      return 'Serving size must be a number of grams above zero.';
    }

    return {
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      kcal_per_100g: values[0],
      protein_per_100g: values[1],
      carbs_per_100g: values[2],
      fat_per_100g: values[3],
      serving_name: servingGrams ? f.servingName.trim() || 'serving' : null,
      serving_grams: servingGrams,
    };
  }

  async function handleSave() {
    const food = parse();
    if (typeof food === 'string') {
      setError(food);
      return;
    }
    setError(null);
    setBusy('save');
    try {
      if (editingId) await updateFood(editingId, food);
      else await createFood(food);
      goBack('/food');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    const ok = await confirm(
      `Delete "${fields!.name}"?`,
      'Days you already logged it keep their numbers. Saved meals using it lose it.',
      'Delete',
    );
    if (!ok) return;
    setError(null);
    setBusy('delete');
    try {
      await deleteFood(editingId);
      goBack('/food');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Edit food' : 'New food' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Name" value={fields.name} onChangeText={set('name')} placeholder="e.g. Greek yoghurt 0%" />
        <TextField label="Brand (optional)" value={fields.brand} onChangeText={set('brand')} placeholder="e.g. Fage" />

        <Text style={styles.section}>Per 100 g</Text>
        <Text style={styles.hint}>Copy these from the “per 100 g” column of the nutrition label.</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <TextField label="Calories (kcal)" value={fields.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={styles.cell}>
            <TextField label="Protein (g)" value={fields.protein} onChangeText={set('protein')} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <TextField label="Carbs (g)" value={fields.carbs} onChangeText={set('carbs')} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={styles.cell}>
            <TextField label="Fat (g)" value={fields.fat} onChangeText={set('fat')} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>

        <Text style={styles.section}>Serving (optional)</Text>
        <Text style={styles.hint}>Lets you log “2 roti” instead of working out the grams.</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <TextField label="Called" value={fields.servingName} onChangeText={set('servingName')} placeholder="e.g. roti" />
          </View>
          <View style={styles.cell}>
            <TextField label="Weighs (g)" value={fields.servingGrams} onChangeText={set('servingGrams')} keyboardType="decimal-pad" placeholder="e.g. 40" />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Save food" onPress={handleSave} loading={busy === 'save'} disabled={busy !== null} />
        {editingId ? (
          <Button label="Delete food" onPress={handleDelete} variant="danger" loading={busy === 'delete'} disabled={busy !== null} />
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  hint: { color: colors.textDim, fontSize: 14, marginTop: -spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
  error: { color: colors.danger, fontSize: 15 },
  padded: { padding: spacing.xl },
});
