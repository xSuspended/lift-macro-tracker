import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { MacroSlider } from '@/components/macro-slider';
import { TextField } from '@/components/text-field';
import { getTargets, saveTargets } from '@/lib/food';
import { errorMessage, formatNumber } from '@/lib/format';
import { fitToCalories, kcalFromMacros, kcalTolerance, MACRO_KEYS, moveMacro, type Grams, type MacroKey } from '@/lib/macros';
import { colors, radius, spacing } from '@/lib/theme';

const NAMES: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

type MaybeGrams = Record<MacroKey, number | null>;

/** Blank -> null, a positive number -> that number, anything else -> NaN. */
function parse(text: string) {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : NaN;
}

const kcalText = (n: number) => Math.round(n).toLocaleString();

const allSet = (g: MaybeGrams): g is Grams => MACRO_KEYS.every((m) => g[m] !== null);

/**
 * Daily calorie and macro targets, used by the Food tab. Type the calories,
 * then split them with the sliders: lock one macro and moving another makes
 * the third follow, so the total always matches.
 */
export function TargetsForm() {
  const [kcalInput, setKcalInput] = useState<string | null>(null);
  const [grams, setGrams] = useState<MaybeGrams>({ protein: null, carbs: null, fat: null });
  const [locked, setLocked] = useState<MacroKey>('protein');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    getTargets()
      .then((t) => {
        setKcalInput(t.target_kcal === null ? '' : formatNumber(t.target_kcal));
        const round = (n: number | null) => (n === null ? null : Math.round(n));
        setGrams({ protein: round(t.target_protein_g), carbs: round(t.target_carbs_g), fat: round(t.target_fat_g) });
      })
      .catch((e) => setMessage({ text: errorMessage(e), ok: false }));
  }, []);
  useFocusEffect(load);

  const kcal = kcalInput === null ? null : parse(kcalInput);
  const kcalValid = kcal !== null && !Number.isNaN(kcal) ? Math.round(kcal) : null;

  // When the calories change, keep the locked macro and resize the other two.
  function fit() {
    if (kcalValid === null) return;
    setGrams(fitToCalories(kcalValid, grams, locked));
    setMessage(null);
  }

  function handleMove(macro: MacroKey, value: number) {
    if (kcalValid === null || !allSet(grams)) return;
    setGrams(moveMacro(kcalValid, grams, locked, macro, value));
    setMessage(null);
  }

  async function handleSave() {
    if (kcal !== null && Number.isNaN(kcal)) {
      setMessage({ text: 'Calories must be a number above zero, or left blank.', ok: false });
      return;
    }
    if (kcalValid !== null && allSet(grams)) {
      const total = kcalFromMacros(grams);
      if (Math.abs(total - kcalValid) > kcalTolerance(kcalValid)) {
        setMessage({ text: `Your macros add up to ${kcalText(total)} kcal, not ${kcalText(kcalValid)}. Tap “Make them add up” first.`, ok: false });
        return;
      }
    }

    setMessage(null);
    setBusy(true);
    try {
      await saveTargets({
        target_kcal: kcalValid,
        target_protein_g: grams.protein,
        target_carbs_g: grams.carbs,
        target_fat_g: grams.fat,
      });
      setMessage({ text: 'Targets saved.', ok: true });
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false });
    } finally {
      setBusy(false);
    }
  }

  const total = allSet(grams) ? kcalFromMacros(grams) : null;
  const matches = total !== null && kcalValid !== null && Math.abs(total - kcalValid) <= kcalTolerance(kcalValid);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily targets</Text>
      {kcalInput === null && !message ? <ActivityIndicator color={colors.accent} /> : null}
      {kcalInput !== null ? (
        <>
          <TextField
            label="Calories (kcal)"
            value={kcalInput}
            onChangeText={(text) => {
              setKcalInput(text);
              setMessage(null);
            }}
            onBlur={() => {
              if (!allSet(grams) || !matches) fit();
            }}
            onSubmitEditing={fit}
            returnKeyType="done"
            keyboardType="decimal-pad"
            placeholder="e.g. 2000"
          />

          {kcalValid === null ? (
            <Text style={styles.hint}>Enter your daily calories, then split them between protein, carbs and fat.</Text>
          ) : !allSet(grams) ? (
            <Button label="Split into macros" onPress={fit} variant="secondary" />
          ) : (
            <>
              <Text style={styles.hint}>
                Lock the macro you want to keep. Moving another one makes the last one follow, so the total stays at{' '}
                {kcalText(kcalValid)} kcal.
              </Text>
              {MACRO_KEYS.map((macro) => (
                <MacroSlider
                  key={macro}
                  macro={macro}
                  name={NAMES[macro]}
                  grams={grams[macro] ?? 0}
                  kcal={kcalValid}
                  locked={locked === macro}
                  onLock={() => setLocked(macro)}
                  onChange={(value) => handleMove(macro, value)}
                />
              ))}
              {matches ? (
                <Text style={styles.okText}>✓ Adds up: {kcalText(total ?? 0)} kcal</Text>
              ) : (
                <View style={styles.warn}>
                  <Text style={styles.warnText}>
                    These macros add up to {kcalText(total ?? 0)} kcal, not {kcalText(kcalValid)}.
                  </Text>
                  <Button label="Make them add up" onPress={fit} variant="secondary" compact />
                </View>
              )}
            </>
          )}

          {message ? <Text style={message.ok ? styles.ok : styles.error}>{message.text}</Text> : null}
          <Button label="Save targets" onPress={handleSave} loading={busy} />
        </>
      ) : message ? (
        <Text style={styles.error}>{message.text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  okText: { color: colors.success, fontSize: 15, fontWeight: '600' },
  warn: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning },
  warnText: { color: colors.warning, fontSize: 15, lineHeight: 21 },
  ok: { color: colors.success, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
});
