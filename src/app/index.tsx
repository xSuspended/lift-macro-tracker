import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/screen';
import { useAuth } from '@/lib/auth';

/** Entry point: send the user to the app or to the login screen. */
export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return <Redirect href={session ? '/workout' : '/sign-in'} />;
}
