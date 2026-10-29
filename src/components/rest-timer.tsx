import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatClock } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';

/** Rest counts as long once it passes this, so you notice you've been chatting. */
const LONG_REST_MS = 5 * 60 * 1000;

type Props = {
  /** When the last set was logged, or null if none yet. */
  lastSetAt: string | null;
};

/** Time since your last set, so you can keep rest periods even. */
export function RestTimer({ lastSetAt }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lastSetAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lastSetAt]);

  const since = lastSetAt ? now - Date.parse(lastSetAt) : null;
  const long = since !== null && since >= LONG_REST_MS;

  return (
    <View style={[styles.tile, long && styles.tileLong]}>
      <Text style={[styles.value, long && styles.valueLong]}>{since === null ? '—' : formatClock(since)}</Text>
      <Text style={styles.label}>Rest</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  tileLong: { borderColor: colors.warning },
  value: { color: colors.text, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] },
  valueLong: { color: colors.warning },
  label: { color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
});
