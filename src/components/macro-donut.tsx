import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, macroColors } from '@/lib/theme';

type Props = {
  kcal: number;
  /** Big text in the middle, and the small line under it. */
  centreValue: string;
  centreCaption: string;
  /** Daily calorie target; draws the outer progress ring when set. */
  targetKcal: number | null;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  size?: number;
};

const OUTER_STROKE = 5;
const RING_GAP = 4;
const INNER_STROKE = 13;
const SLICE_GAP = 3;

/**
 * Two rings with the day's total in the middle. Outer: calories eaten against the
 * target, white for eaten and grey for what's left. Inner: where the calories came
 * from, split by protein, carbs and fat.
 */
export function MacroDonut({ kcal, centreValue, centreCaption, targetKcal, proteinKcal, carbsKcal, fatKcal, size = 140 }: Props) {
  const centre = size / 2;
  const outerR = (size - OUTER_STROKE) / 2;
  const innerR = outerR - OUTER_STROKE / 2 - RING_GAP - INNER_STROKE / 2;
  const outerC = 2 * Math.PI * outerR;
  const innerC = 2 * Math.PI * innerR;
  // Start at 12 o'clock and go clockwise.
  const rotate = `rotate(-90 ${centre} ${centre})`;

  const eatenShare = targetKcal ? Math.min(1, kcal / targetKcal) : 0;

  const macroTotal = proteinKcal + carbsKcal + fatKcal;
  const parts = [
    { key: 'protein', value: proteinKcal, color: macroColors.protein },
    { key: 'carbs', value: carbsKcal, color: macroColors.carbs },
    { key: 'fat', value: fatKcal, color: macroColors.fat },
  ].filter((p) => p.value > 0);

  let offset = 0;
  const arcs = parts.map((part) => {
    const length = (part.value / macroTotal) * innerC;
    // Leave a small gap between slices, unless a slice is the whole ring.
    const drawn = parts.length > 1 ? Math.max(0, length - SLICE_GAP) : length;
    const arc = { ...part, drawn, offset };
    offset += length;
    return arc;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {targetKcal ? (
          <>
            <Circle cx={centre} cy={centre} r={outerR} stroke={colors.border} strokeWidth={OUTER_STROKE} fill="none" />
            {eatenShare > 0 ? (
              <Circle
                cx={centre}
                cy={centre}
                r={outerR}
                stroke={macroColors.kcal}
                strokeWidth={OUTER_STROKE}
                strokeLinecap={eatenShare < 1 ? 'round' : 'butt'}
                fill="none"
                strokeDasharray={`${eatenShare * outerC} ${outerC}`}
                transform={rotate}
              />
            ) : null}
          </>
        ) : null}

        <Circle cx={centre} cy={centre} r={innerR} stroke={colors.bg} strokeWidth={INNER_STROKE} fill="none" />
        {arcs.map((arc) => (
          <Circle
            key={arc.key}
            cx={centre}
            cy={centre}
            r={innerR}
            stroke={arc.color}
            strokeWidth={INNER_STROKE}
            fill="none"
            strokeDasharray={`${arc.drawn} ${innerC - arc.drawn}`}
            strokeDashoffset={-arc.offset}
            transform={rotate}
          />
        ))}
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.kcal}>{centreValue}</Text>
        <Text style={styles.unit}>{centreCaption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  kcal: { color: colors.text, fontSize: 22, fontWeight: '700' },
  unit: { color: colors.textDim, fontSize: 12, marginTop: -2 },
});
