import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// `|| undefined` matters: an unfilled line in .env arrives as an empty string.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || undefined;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() || undefined;

// When .env is missing we still build a client so the app can boot and show a
// friendly "finish your setup" screen instead of a blank crash.
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder', {
  auth: {
    // AsyncStorage keeps the login across app restarts. On web it is backed by
    // localStorage, so the same code works in the browser.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Look up fetch on every request instead of keeping the one that existed at
    // startup, so a test can simulate losing signal by swapping it out.
    fetch: (...args) => fetch(...args),
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
