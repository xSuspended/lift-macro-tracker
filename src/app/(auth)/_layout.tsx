import { Redirect, Stack, useGlobalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** Login/sign-up screens. If already logged in, skip straight to the app. */
export default function AuthLayout() {
  const { session, loading } = useAuth();
  const params = useGlobalSearchParams();

  if (loading) return <LoadingScreen />;
  // `next` is set when you followed a link while logged out (see (app)/_layout).
  // Only in-app paths are allowed, so a link can't send you off somewhere else.
  const next = typeof params.next === 'string' && /^\/[^/]/.test(params.next) ? params.next : null;
  if (session) return <Redirect href={(next ?? '/workout') as never} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
