import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Stepper } from '@/components/stepper';
import { errorMessage, formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import { LIFT_STEP, toDisplay, toKg, useUnits } from '@/lib/units';

export type SetValues = {
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  note: string | null;
};

type Props = {
  exerciseName: string;
  initialWeightKg: number;
  initialReps: number;
  onAdd: (values: SetValues) => Promise<void>;
  /** Shown between the exercise name and the steppers. */
  children?: ReactNode;
};

const RPE_MIN = 6;
const RPE_MAX = 10;

/** The dock pinned to the bottom of the workout screen for logging the next set. */
export function SetEntry({ exerciseName, initialWeightKg, initialReps, onAdd, children }: Props) {
  const { unit } = useUnits();
  // The stepper works in your unit; the weight is turned back into kg when saved.
  const [weight, setWeight] = useState(toDisplay(initialWeightKg, unit));
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);
  const [note, setNote] = useState('');
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
      await onAdd({ weightKg: toKg(weight, unit), reps, rpe, isWarmup, note: note.trim() || null });
      // A note belongs to one set, so start the next one blank.
      setNote('');
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

      {children}

      <View style={styles.row}>
        <Stepper label={`Weight (${unit})`} value={weight} onChange={setWeight} step={LIFT_STEP[unit]} allowDecimal />
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

      <View style={styles.note}>
        <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.textDim} />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note for this set (optional)"
          placeholderTextColor={colors.textDim}
          maxLength={500}
          returnKeyType="done"
          accessibilityLabel="Note for this set"
          style={styles.noteInput}
        />
        {note ? (
          <Pressable accessibilityLabel="Clear note" onPress={() => setNote('')} hitSlop={8} style={styles.noteClear}>
            <Ionicons name="close-circle" size={18} color={colors.textDim} />
          </Pressable>
        ) : null}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm + 2,
  },
  exercise: { color: colors.text, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  small: {
    flex: 1,
    minHeight: 44,
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
  note: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
  },
  noteInput: { flex: 1, minHeight: 44, color: colors.text, fontSize: 15 },
  noteClear: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.cardPressed },
  error: { color: colors.danger, fontSize: 14 },
});
