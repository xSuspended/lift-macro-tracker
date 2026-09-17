import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { getTargets, saveTargets } from '@/lib/food';
import { errorMessage, formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { Targets } from '@/lib/types';

const FIELDS: { key: keyof Targets; label: string }[] = [
  { key: 'target_kcal', label: 'Calories (kcal)' },
  { key: 'target_protein_g', label: 'Protein (g)' },
  { key: 'target_carbs_g', label: 'Carbs (g)' },
  { key: 'target_fat_g', label: 'Fat (g)' },
];

type Texts = Record<keyof Targets, string>;

/** Daily calorie and macro targets, used by the Food tab. */
export function TargetsForm() {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    getTargets()
      .then((t) =>
        setTexts({
          target_kcal: t.target_kcal === null ? '' : formatNumber(t.target_kcal),
          target_protein_g: t.target_protein_g === null ? '' : formatNumber(t.target_protein_g),
          target_carbs_g: t.target_carbs_g === null ? '' : formatNumber(t.target_carbs_g),
          target_fat_g: t.target_fat_g === null ? '' : formatNumber(t.target_fat_g),
        }),
      )
      .catch((e) => setMessage({ text: errorMessage(e), ok: false }));
  }, []);
  useFocusEffect(load);

  async function handleSave() {
    if (!texts) return;
    const targets = {} as Targets;
    for (const { key, label } of FIELDS) {
      const text = texts[key].trim().replace(',', '.');
      const value = text === '' ? null : Number(text);
      if (value !== null && (!Number.isFinite(value) || value <= 0)) {
        setMessage({ text: `${label} must be a number above zero, or left blank.`, ok: false });
        return;
      }
      targets[key] = key === 'target_kcal' && value !== null ? Math.round(value) : value;
    }

    setMessage(null);
    setBusy(true);
    try {
      await saveTargets(targets);
      setMessage({ text: 'Targets saved.', ok: true });
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily targets</Text>
      {texts === null && !message ? <ActivityIndicator color={colors.accent} /> : null}
      {texts ? (
        <>
          <View style={styles.grid}>
            {FIELDS.map(({ key, label }) => (
              <View key={key} style={styles.cell}>
                <TextField
                  label={label}
                  value={texts[key]}
                  onChangeText={(text) => setTexts({ ...texts, [key]: text })}
                  keyboardType="decimal-pad"
                  placeholder="Not set"
                />
              </View>
            ))}
          </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexGrow: 1, flexBasis: '45%' },
  ok: { color: colors.success, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
});
