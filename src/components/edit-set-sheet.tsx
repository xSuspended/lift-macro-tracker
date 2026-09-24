import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { errorMessage, formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { LoggedSet } from '@/lib/types';
import { LIFT_STEP, toDisplay, toKg, useUnits } from '@/lib/units';
import type { SetPatch } from '@/lib/workouts';

type Props = {
  /** The set being edited, or null when the panel is closed. */
  set: LoggedSet | null;
  onClose: () => void;
  onSave: (set: LoggedSet, patch: SetPatch) => Promise<void>;
};

const RPE_MIN = 6;
const RPE_MAX = 10;

/** Fixes a set you already logged: weight, reps, RPE, warm-up and its note. */
export function EditSetSheet({ set, onClose, onSave }: Props) {
  const { unit } = useUnits();
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the set's own numbers each time the panel opens.
  useEffect(() => {
    if (!set) return;
    setWeight(toDisplay(set.weight_kg, unit));
    setReps(set.reps);
    setRpe(set.rpe);
    setIsWarmup(set.is_warmup);
    setNote(set.note ?? '');
    setError(null);
  }, [set, unit]);

  function nudgeRpe(direction: 1 | -1) {
    if (rpe === null) {
      if (direction === 1) setRpe(RPE_MIN);
      return;
    }
    const next = rpe + direction * 0.5;
    setRpe(next < RPE_MIN ? null : Math.min(RPE_MAX, next));
  }

  async function handleSave() {
    if (!set) return;
    setError(null);
    setBusy(true);
    try {
      await onSave(set, {
        weight_kg: toKg(weight, unit),
        reps,
        rpe,
        is_warmup: isWarmup,
        note: note.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={set !== null} title={set ? `Edit set · ${set.exercise_name}` : 'Edit set'} onClose={onClose}>
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
          <View pointerEvents="none">
            <Switch value={isWarmup} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} />
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
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Save changes" onPress={handleSave} loading={busy} />
      <Button label="Cancel" onPress={onClose} variant="secondary" disabled={busy} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
  rpeButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  rpeValue: { minWidth: 32, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '600' },
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
    paddingRight: spacing.md,
  },
  noteInput: { flex: 1, minHeight: 44, color: colors.text, fontSize: 15 },
  pressed: { backgroundColor: colors.cardPressed },
  error: { color: colors.danger, fontSize: 14 },
});
