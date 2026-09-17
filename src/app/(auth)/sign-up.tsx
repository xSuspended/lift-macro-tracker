import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { signUp } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password);
      if (needsEmailConfirmation) {
        setCheckEmail(true);
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account.');
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <Screen>
        <View style={styles.centred}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.
          </Text>
          <Link href="/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>One account for your lifts and your macros.</Text>
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
            autoComplete="new-password"
            secureTextEntry
            placeholder="At least 6 characters"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Create account" onPress={handleSignUp} loading={busy} />

          <Link href="/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  subtitle: { color: colors.textDim, fontSize: 16, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 15 },
  link: { paddingVertical: spacing.lg, alignSelf: 'center' },
  linkText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
