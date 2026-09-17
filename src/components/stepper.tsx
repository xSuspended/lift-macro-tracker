import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, radius, TAP_TARGET } from '@/lib/theme';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
};

/** Big −/+ control. The number in the middle can also be tapped and typed. */
export function Stepper({ label, value, onChange, step, min = 0, max = 9999, allowDecimal }: Props) {
  // While typing, show exactly what was typed ("62." mid-entry) instead of the parsed number.
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));

  function nudge(direction: 1 | -1) {
    setDraft(null);
    onChange(clamp(value + direction * step));
  }

  function handleType(text: string) {
    setDraft(text);
    const n = allowDecimal ? parseFloat(text.replace(',', '.')) : parseInt(text, 10);
    if (Number.isFinite(n)) onChange(clamp(n));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => nudge(-1)}
          style={({ pressed }) => [styles.button, styles.left, pressed && styles.pressed]}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </Pressable>

        <TextInput
          accessibilityLabel={label}
          value={draft ?? formatNumber(value)}
          onChangeText={handleType}
          onFocus={() => setDraft(formatNumber(value))}
          onBlur={() => setDraft(null)}
          keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
          selectTextOnFocus
          style={styles.input}
        />

        <Pressable
          accessibilityLabel={`Increase ${label}`}
          onPress={() => nudge(1)}
          style={({ pressed }) => [styles.button, styles.right, pressed && styles.pressed]}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 6 },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  button: {
    width: 52,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { borderRightWidth: 1, borderRightColor: colors.border },
  right: { borderLeftWidth: 1, borderLeftColor: colors.border },
  pressed: { backgroundColor: colors.cardPressed },
  input: {
    flex: 1,
    minWidth: 0,
    height: TAP_TARGET,
    textAlign: 'center',
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
});
