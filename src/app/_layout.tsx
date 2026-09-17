import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SetupNeeded } from '@/components/setup-needed';
import { AuthProvider } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  if (!supabaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SetupNeeded />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
