import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Stepper } from '@/components/stepper';
import { errorMessage, formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';

export type SetValues = {
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
};

type Props = {
  exerciseName: string;
  initialWeightKg: number;
  initialReps: number;
  onAdd: (values: SetValues) => Promise<void>;
};

const RPE_MIN = 6;
const RPE_MAX = 10;

/** The dock pinned to the bottom of the workout screen for logging the next set. */
export function SetEntry({ exerciseName, initialWeightKg, initialReps, onAdd }: Props) {
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RPE is optional: below 6 it switches off, and + from off starts at 6.
  function nudgeRpe(direction: 1 | -1) {
    if (rpe === null) {
      if (direction === 1) setRpe(RPE_MIN);
      return;
    }
    const next = rpe + direction * 0.5;
    setRpe(next < RPE_MIN ? null : Math.min(RPE_MAX, next));
  }

  async function handleAdd() {
    setError(null);
    setBusy(true);
    try {
      await onAdd({ weightKg, reps, rpe, isWarmup });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.dock}>
      <Text style={styles.exercise} numberOfLines={1}>
        {exerciseName}
      </Text>

      <View style={styles.row}>
        <Stepper label="Weight (kg)" value={weightKg} onChange={setWeightKg} step={2.5} allowDecimal />
        <Stepper label="Reps" value={reps} onChange={setReps} step={1} max={999} />
      </View>

      <View style={styles.row}>
        <View style={styles.small}>
          <Text style={styles.smallLabel}>RPE</Text>
          <View style={styles.rpeControls}>
            <Pressable
              accessibilityLabel="Decrease RPE"
              onPress={() => nudgeRpe(-1)}
              style={({ pressed }) => [styles.rpeButton, pressed && styles.pressed]}>
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.rpeValue}>{rpe === null ? '—' : formatNumber(rpe)}</Text>
            <Pressable
              accessibilityLabel="Increase RPE"
              onPress={() => nudgeRpe(1)}
              style={({ pressed }) => [styles.rpeButton, pressed && styles.pressed]}>
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isWarmup }}
          onPress={() => setIsWarmup(!isWarmup)}
          style={styles.small}>
          <Text style={styles.smallLabel}>Warm-up</Text>
          {/* The whole box is the tap target; the switch only shows state, so a
              tap can't toggle twice. */}
          <View pointerEvents="none">
            <Switch
              value={isWarmup}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={isWarmup ? 'Add warm-up set' : 'Add set'} onPress={handleAdd} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exercise: { color: colors.text, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  small: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  smallLabel: { color: colors.textDim, fontSize: 14 },
  rpeControls: { flexDirection: 'row', alignItems: 'center' },
  rpeButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  rpeValue: {
    minWidth: 32,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: { backgroundColor: colors.cardPressed },
  error: { color: colors.danger, fontSize: 14 },
});
