import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { signIn } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // The auth listener flips the session, which redirects us into the app.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Lift & Macro</Text>
            <Text style={styles.subtitle}>Log your training and your food.</Text>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            placeholder="Your password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Sign in" onPress={handleSignIn} loading={busy} />

          <Link href="/sign-up" style={styles.link}>
            <Text style={styles.linkText}>No account yet? Create one</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  subtitle: { color: colors.textDim, fontSize: 16 },
  error: { color: colors.danger, fontSize: 15 },
  link: { paddingVertical: spacing.lg, alignSelf: 'center' },
  linkText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
