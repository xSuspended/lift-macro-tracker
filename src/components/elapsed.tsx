import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatClock } from '@/lib/format';
import type { Workout } from '@/lib/types';
import { activeDurationMs } from '@/lib/workouts';

type Props = {
  workout: Pick<Workout, 'started_at' | 'paused_at' | 'paused_seconds'>;
  style?: TextStyle | TextStyle[];
};

/** How long a workout has been running, ticking every second and frozen while paused. */
export function Elapsed({ workout, style }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (workout.paused_at) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [workout.paused_at]);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {formatClock(activeDurationMs(workout, now))}
    </Text>
  );
}
