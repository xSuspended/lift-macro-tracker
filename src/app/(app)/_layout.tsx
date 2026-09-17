import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** Everything behind the login. Kicks you back to sign-in if logged out. */
export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session/[id]" options={{ headerShown: true, title: 'Workout' }} />
    </Stack>
  );
}
