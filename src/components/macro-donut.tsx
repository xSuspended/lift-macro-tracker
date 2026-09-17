import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, macroColors } from '@/lib/theme';

type Props = {
  kcal: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  size?: number;
};

const STROKE = 14;
const GAP = 3;

/** A ring split by where the calories came from, with the day's total in the middle. */
export function MacroDonut({ kcal, proteinKcal, carbsKcal, fatKcal, size = 132 }: Props) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const macroTotal = proteinKcal + carbsKcal + fatKcal;

  const parts = [
    { key: 'protein', value: proteinKcal, color: macroColors.protein },
    { key: 'carbs', value: carbsKcal, color: macroColors.carbs },
    { key: 'fat', value: fatKcal, color: macroColors.fat },
  ].filter((p) => p.value > 0);

  let offset = 0;
  const arcs = parts.map((part) => {
    const length = (part.value / macroTotal) * circumference;
    // Leave a small gap between slices, unless a slice is the whole ring.
    const drawn = parts.length > 1 ? Math.max(0, length - GAP) : length;
    const arc = { ...part, drawn, offset };
    offset += length;
    return arc;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bg} strokeWidth={STROKE} fill="none" />
        {arcs.map((arc) => (
          <Circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={arc.color}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${arc.drawn} ${circumference - arc.drawn}`}
            strokeDashoffset={-arc.offset}
            // Start at 12 o'clock and go clockwise.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.kcal}>{Math.round(kcal).toLocaleString()}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  kcal: { color: colors.text, fontSize: 24, fontWeight: '700' },
  unit: { color: colors.textDim, fontSize: 12, marginTop: -2 },
});
