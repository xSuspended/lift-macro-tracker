import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

/** Shown when .env has no Supabase URL/key, so the cause is obvious. */
export function SetupNeeded() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Finish setup</Text>
      <Text style={styles.body}>
        The app cannot reach Supabase because its address and key are missing.
      </Text>
      <View style={styles.code}>
        <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_URL=...</Text>
        <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_KEY=...</Text>
      </View>
      <Text style={styles.body}>
        Put those two lines in the .env file at the root of the project, then stop and restart the
        dev server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  body: { color: colors.textDim, fontSize: 16, textAlign: 'center', lineHeight: 22, maxWidth: 420 },
  code: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  codeText: { color: colors.success, fontSize: 14, fontFamily: 'monospace' },
});
