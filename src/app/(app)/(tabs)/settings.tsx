import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { signOut, useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';

export default function Settings() {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Signed in as</Text>
        <Text style={styles.cardValue}>{session?.user.email ?? 'Unknown'}</Text>
      </View>

      <Text style={styles.note}>
        Macro targets, weight units, and body weight settings arrive in later phases.
      </Text>

      <Button label="Sign out" onPress={handleSignOut} variant="danger" loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  cardValue: { color: colors.text, fontSize: 18 },
  note: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
});
