import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { exportBodyWeight, exportFood, exportWorkouts } from '@/lib/export';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';

type Kind = 'workouts' | 'food' | 'weight';

const EXPORTS: { kind: Kind; label: string; run: () => Promise<number>; noun: string }[] = [
  { kind: 'workouts', label: 'Workouts', run: exportWorkouts, noun: 'sets' },
  { kind: 'food', label: 'Food', run: exportFood, noun: 'food entries' },
  { kind: 'weight', label: 'Body weight', run: exportBodyWeight, noun: 'weigh-ins' },
];

/** Download your data as spreadsheet files to keep a copy of your own. */
export function ExportData() {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function run(item: (typeof EXPORTS)[number]) {
    setMessage(null);
    setBusy(item.kind);
    try {
      const count = await item.run();
      setMessage({ text: `Exported ${count.toLocaleString()} ${item.noun}.`, ok: true });
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Export my data</Text>
      <Text style={styles.hint}>
        {Platform.OS === 'web'
          ? 'Downloads a spreadsheet file (CSV) that opens in Excel or Google Sheets.'
          : 'Creates a spreadsheet file (CSV) and opens the share menu, so you can save it to Google Drive or send it to yourself.'}
      </Text>
      <View style={styles.buttons}>
        {EXPORTS.map((item) => (
          <View key={item.kind} style={styles.button}>
            <Button
              label={item.label}
              onPress={() => run(item)}
              variant="secondary"
              loading={busy === item.kind}
              disabled={busy !== null}
              compact
            />
          </View>
        ))}
      </View>
      {message ? <Text style={message.ok ? styles.ok : styles.error}>{message.text}</Text> : null}
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
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
  ok: { color: colors.success, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
