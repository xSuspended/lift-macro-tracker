import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KCAL_PER_GRAM, type MacroKey } from '@/lib/macros';
import { colors, macroColors, radius, spacing, TAP_TARGET } from '@/lib/theme';

type Props = {
  macro: MacroKey;
  name: string;
  grams: number;
  /** The daily calorie target the macros share. */
  kcal: number;
  locked: boolean;
  onLock: () => void;
  onChange: (grams: number) => void;
};

/** One macro's slider, with −/+ for fine steps and a lock that keeps it fixed. */
export function MacroSlider({ macro, name, grams, kcal, locked, onLock, onChange }: Props) {
  const perGram = KCAL_PER_GRAM[macro];
  const macroKcal = grams * perGram;
  const percent = kcal > 0 ? Math.round((macroKcal / kcal) * 100) : 0;
  const color = macroColors[macro];

  return (
    <View style={[styles.row, locked && styles.rowLocked]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={locked ? `${name} is locked` : `Lock ${name}`}
          onPress={onLock}
          style={({ pressed }) => [styles.lock, locked && styles.lockOn, pressed && styles.pressed]}>
          <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={20} color={locked ? colors.onAccent : colors.textDim} />
        </Pressable>
        <View style={styles.titles}>
          <Text style={[styles.name, { color }]}>{name}</Text>
          <Text style={styles.meta}>
            {Math.round(macroKcal).toLocaleString()} kcal · {percent}%{locked ? ' · locked' : ''}
          </Text>
        </View>
        <Text style={styles.grams}>{grams} g</Text>
      </View>

      <View style={styles.controls}>
        <StepButton icon="remove" label={`Less ${name}`} disabled={locked} onPress={() => onChange(grams - 1)} />
        <Slider
          style={styles.slider}
          value={grams}
          minimumValue={0}
          maximumValue={Math.max(1, Math.floor(kcal / perGram))}
          step={1}
          disabled={locked}
          onValueChange={onChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor={colors.border}
          thumbTintColor={locked ? colors.textDim : color}
          accessibilityLabel={`${name} grams`}
        />
        <StepButton icon="add" label={`More ${name}`} disabled={locked} onPress={() => onChange(grams + 1)} />
      </View>
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.step, disabled && styles.stepDisabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLocked: { borderColor: colors.accent },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lock: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  titles: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: 13 },
  grams: { color: colors.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slider: { flex: 1, height: TAP_TARGET },
  step: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.cardPressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
