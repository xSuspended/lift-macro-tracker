import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { nutritionFor } from '@/lib/food';
import { errorMessage, formatNumber } from '@/lib/format';
import { colors, macroColors, spacing } from '@/lib/theme';
import type { Food } from '@/lib/types';

type Props = {
  food: Food | null;
  onClose: () => void;
  submitLabel: string;
  onSubmit: (grams: number) => Promise<void>;
  /** Amount to start from when editing an entry. */
  initialGrams?: number;
  onDelete?: () => Promise<void>;
};

/** Choose how much of a food, in servings or grams, with a live nutrition preview. */
export function AmountSheet({ food, onClose, ...rest }: Props) {
  return (
    <Sheet visible={food !== null} title={food?.name ?? ''} onClose={onClose}>
      {/* Keyed by food so the amount starts fresh for each food. */}
      {food ? <AmountForm key={food.id} food={food} {...rest} /> : null}
    </Sheet>
  );
}

function AmountForm({ food, submitLabel, onSubmit, initialGrams, onDelete }: Omit<Props, 'onClose'> & { food: Food }) {
  const servingGrams = food.serving_grams && food.serving_grams > 0 ? food.serving_grams : null;
  const startGrams = initialGrams ?? servingGrams ?? 100;
  const startInServings = servingGrams !== null && Number.isInteger((startGrams / servingGrams) * 2);

  const [unit, setUnit] = useState<'serving' | 'grams'>(startInServings ? 'serving' : 'grams');
  const [amount, setAmount] = useState(startInServings && servingGrams ? startGrams / servingGrams : startGrams);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grams = unit === 'serving' && servingGrams ? amount * servingGrams : amount;
  const preview = nutritionFor(food, grams);
  const oneDecimal = (n: number) => formatNumber(Math.round(n * 10) / 10);

  function switchUnit(next: 'serving' | 'grams') {
    if (next === unit || !servingGrams) return;
    setAmount(next === 'serving' ? Math.max(0.5, Math.round((grams / servingGrams) * 2) / 2) : Math.round(grams));
    setUnit(next);
  }

  async function run(kind: 'save' | 'delete', action: () => Promise<void>) {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.per100}>
        {food.brand ? `${food.brand} · ` : ''}
        {formatNumber(food.kcal_per_100g)} kcal per 100 g
      </Text>

      {servingGrams ? (
        <Segmented
          options={[
            { key: 'serving', label: `${food.serving_name || 'Serving'} (${formatNumber(servingGrams)} g)` },
            { key: 'grams', label: 'Grams' },
          ]}
          value={unit}
          onChange={switchUnit}
        />
      ) : null}

      <Stepper
        label={unit === 'serving' ? 'Servings' : 'Grams'}
        value={amount}
        onChange={setAmount}
        step={unit === 'serving' ? 0.5 : 10}
        max={unit === 'serving' ? 50 : 5000}
        allowDecimal
      />

      <View style={styles.preview}>
        <Text style={styles.previewKcal}>
          {Math.round(preview.kcal)} <Text style={styles.previewUnit}>kcal</Text>
        </Text>
        <View style={styles.previewMacros}>
          {[
            { label: 'P', value: preview.protein_g, color: macroColors.protein },
            { label: 'C', value: preview.carbs_g, color: macroColors.carbs },
            { label: 'F', value: preview.fat_g, color: macroColors.fat },
          ].map((m) => (
            <View key={m.label} style={styles.macro}>
              <View style={[styles.swatch, { backgroundColor: m.color }]} />
              <Text style={styles.macroText}>
                {m.label} {oneDecimal(m.value)} g
              </Text>
            </View>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={submitLabel}
        onPress={() =>
          grams > 0 ? run('save', () => onSubmit(grams)) : setError('Choose an amount above zero.')
        }
        loading={busy === 'save'}
        disabled={busy !== null}
      />
      {onDelete ? (
        <Button
          label="Remove from diary"
          onPress={() => run('delete', onDelete)}
          variant="danger"
          loading={busy === 'delete'}
          disabled={busy !== null}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  per100: { color: colors.textDim, fontSize: 14 },
  preview: { alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  previewKcal: { color: colors.text, fontSize: 32, fontWeight: '700' },
  previewUnit: { color: colors.textDim, fontSize: 16, fontWeight: '400' },
  previewMacros: { flexDirection: 'row', gap: spacing.lg },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  macroText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 15 },
});
