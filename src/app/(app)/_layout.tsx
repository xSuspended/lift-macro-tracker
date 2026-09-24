import { Redirect, Stack, useGlobalSearchParams, usePathname } from 'expo-router';

import { LoadingScreen } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { UnitsProvider } from '@/lib/units';

/** Everything behind the login. Kicks you back to sign-in if logged out. */
export default function AppLayout() {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  if (loading) return <LoadingScreen />;
  // Remember where you were going (e.g. a shared routine link) so signing in
  // carries on there instead of dropping you on the workout tab.
  if (!session) return <Redirect href={{ pathname: '/sign-in', params: { next: withQuery(pathname, params) } }} />;

  return (
    <UnitsProvider>
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
        <Stack.Screen name="routine/[id]" options={{ headerShown: true, title: 'Routine' }} />
        <Stack.Screen name="food/add" options={{ headerShown: true, title: 'Add food' }} />
        <Stack.Screen name="food/edit" options={{ headerShown: true, title: 'Food' }} />
      </Stack>
    </UnitsProvider>
  );
}

function withQuery(pathname: string, params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.append(key, value);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}
