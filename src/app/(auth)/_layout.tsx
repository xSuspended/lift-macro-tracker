import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** Login/sign-up screens. If already logged in, skip straight to the app. */
export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session) return <Redirect href="/workout" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
