// Food is logged against a calendar day in YOUR time zone, stored as "YYYY-MM-DD".
// The database's own current_date is UTC, so the app always sends the day itself.

export function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

/** "2026-09-17" -> a Date at local midnight. */
export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** "Today", "Yesterday", or "Mon 15 Sep". */
export function describeDay(key: string) {
  if (key === todayKey()) return 'Today';
  if (key === addDays(todayKey(), -1)) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
