import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import { useUnits, type WeightUnit } from '@/lib/units';

/** kg or lb for everything weight-related. Only changes what's shown; data stays in kg. */
export function UnitSetting() {
  const { unit, setUnit } = useUnits();
  const [error, setError] = useState<string | null>(null);

  function change(next: WeightUnit) {
    setError(null);
    setUnit(next).catch((e) => setError(errorMessage(e)));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weight unit</Text>
      <Segmented
        options={[
          { key: 'kg', label: 'Kilograms (kg)' },
          { key: 'lb', label: 'Pounds (lb)' },
        ]}
        value={unit}
        onChange={change}
      />
      <Text style={styles.hint}>
        Used for lifts and body weight. Switching converts what you see; nothing you’ve logged changes.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  hint: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14 },
});
