import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { errorMessage } from '@/lib/format';
import { unpackRoutine, type SharedRoutine } from '@/lib/routine-code';
import { importRoutine } from '@/lib/share-routine';
import { colors, radius, spacing } from '@/lib/theme';

/** Opens a shared routine link (or a pasted code) and saves it as your own. */
export default function ImportRoutineScreen() {
  const params = useLocalSearchParams<{ r?: string }>();
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shared: SharedRoutine | null = unpackRoutine(params.r ?? '') ?? unpackRoutine(pasted);

  async function handleImport() {
    if (!shared) return;
    setError(null);
    setBusy(true);
    try {
      const id = await importRoutine(shared);
      router.replace({ pathname: '/routine/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Shared routine' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {params.r ? null : (
          <>
            <Text style={styles.hint}>Paste a routine link someone sent you.</Text>
            <TextField
              label="Routine link"
              value={pasted}
              onChangeText={(text) => {
                setPasted(text);
                setError(null);
              }}
              placeholder="https://..."
              autoCapitalize="none"
              multiline
            />
          </>
        )}

        {shared ? (
          <View style={styles.preview}>
            <Text style={styles.name}>{shared.name}</Text>
            {shared.exercises.map((exercise, i) => (
              <Text key={`${exercise.name}-${i}`} style={styles.exercise}>
                {exercise.name} · {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'} of {exercise.repMin}–
                {exercise.repMax}
              </Text>
            ))}
          </View>
        ) : null}

        {!shared && (params.r || pasted.trim()) ? (
          <Text style={styles.error}>That link doesn’t look like a shared routine.</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {shared ? (
          <>
            <Text style={styles.hint}>
              This saves a copy under your account. Any exercises you don’t have yet are added for you, and changing
              your copy later doesn’t affect theirs.
            </Text>
            <Button label="Add to my routines" onPress={handleImport} loading={busy} />
          </>
        ) : null}

        <Button label="Back" onPress={() => router.replace('/workout')} variant="secondary" disabled={busy} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  preview: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  exercise: { color: colors.textDim, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
});
