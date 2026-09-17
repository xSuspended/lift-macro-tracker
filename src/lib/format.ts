/** 60 -> "60", 62.5 -> "62.5". */
export function formatNumber(n: number) {
  return String(Math.round(n * 100) / 100);
}

/** 125 seconds -> "2:05", 3725 seconds -> "1:02:05". */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Workout length, leaving out time spent paused. */
export function formatMinutes(startIso: string, endIso: string, pausedSeconds = 0) {
  const minutes = Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso) - pausedSeconds * 1000) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** "Wed 17 Sep" */
export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Supabase errors are plain objects, not Error instances, so read .message defensively. */
export function errorMessage(e: unknown) {
  const message = e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : null;
  // Browsers and phones word a dropped connection differently, and none of them helpfully.
  if (!message || /failed to fetch|network request failed|networkerror|load failed/i.test(message)) {
    return 'No connection. Check your signal and try again.';
  }
  return message;
}
