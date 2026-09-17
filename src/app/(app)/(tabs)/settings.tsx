import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { TargetsForm } from '@/components/targets-form';
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

      <TargetsForm />

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
});
