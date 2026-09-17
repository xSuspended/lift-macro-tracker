import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/lib/theme';

/** Standard dark page wrapper that respects notches and the status bar. */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

/** Full-page spinner, used while we check for a saved login. */
export function LoadingScreen() {
  return (
    <View style={styles.centred}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

/** Placeholder body for tabs we have not built yet. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.centred}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centred: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  note: { color: colors.textDim, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
