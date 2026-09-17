import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatClock } from '@/lib/format';

/** A clock counting up from `since`, updated every second. */
export function Elapsed({ since, style }: { since: string; style?: TextStyle }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{formatClock(now - Date.parse(since))}</Text>;
}
