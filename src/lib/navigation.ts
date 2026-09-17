import { router, type Href } from 'expo-router';

/** Go back, or to `fallback` when there's nothing to go back to (e.g. the page was refreshed on web). */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
