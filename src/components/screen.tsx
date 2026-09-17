import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, spacing } from '@/lib/theme';

/** Standard dark page wrapper that respects notches and the status bar. */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

/** Full-page spinner, used while a screen's data loads. */
export function LoadingScreen() {
  return (
    <View style={styles.centred}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

/** Full-page message for when a screen couldn't load, with a way to try again. */
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centred}>
      <Text style={styles.title}>Couldn’t load this</Text>
      <Text style={styles.note}>{message}</Text>
      <View style={styles.retry}>
        <Button label="Try again" onPress={onRetry} variant="secondary" />
      </View>
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
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  note: { color: colors.textDim, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  retry: { alignSelf: 'stretch', maxWidth: 320, width: '100%', marginTop: spacing.sm },
});
