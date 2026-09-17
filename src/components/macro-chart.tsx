import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fromDateKey } from '@/lib/dates';
import { colors, macroColors, spacing } from '@/lib/theme';
import type { DayTotals, Targets } from '@/lib/types';

type Props = {
  /** The days to show, oldest first, as "YYYY-MM-DD". */
  days: string[];
  totals: DayTotals[];
  targets: { [K in keyof Targets]: number };
};

const HEIGHT = 160;
const PAD = { top: 8, right: 38, bottom: 20, left: 30 };

// Drawn in this order, so calories ends up on top.
const SERIES = [
  { key: 'carbs_g', target: 'target_carbs_g', label: 'Carbs', short: 'Carb', color: macroColors.carbs, width: 2, dash: '6 3' },
  { key: 'fat_g', target: 'target_fat_g', label: 'Fat', short: 'Fat', color: macroColors.fat, width: 2, dash: '1 4' },
  { key: 'protein_g', target: 'target_protein_g', label: 'Protein', short: 'Prot', color: macroColors.protein, width: 2, dash: undefined },
  { key: 'kcal', target: 'target_kcal', label: 'Calories', short: 'Cal', color: macroColors.kcal, width: 2.6, dash: undefined },
] as const;

/**
 * Calories and the three macros over several days, as % of your daily target.
 * Percentages put kcal and grams on one honest scale; raw amounts can't share an axis.
 */
export function MacroChart({ days, totals, targets }: Props) {
  const [width, setWidth] = useState(0);

  const byDay = new Map(totals.map((t) => [t.logged_on, t]));
  const series = SERIES.map((s) => ({
    ...s,
    values: days.map((day) => {
      const total = byDay.get(day);
      return total ? (total[s.key] / targets[s.target]) * 100 : null;
    }),
  }));

  const highest = Math.max(100, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const gridStep = highest > 150 ? 50 : 25;
  const yMax = Math.ceil((highest + 5) / gridStep) * gridStep;
  const gridValues = Array.from({ length: yMax / gridStep + 1 }, (_, i) => i * gridStep);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length === 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (Math.min(v, yMax) / yMax) * plotH;

  // Days without any food are gaps, not zero, so a missed day doesn't dive the line.
  const pathFor = (values: (number | null)[]) =>
    values
      .map((v, i) => (v === null ? null : `${i === 0 || values[i - 1] === null ? 'M' : 'L'}${x(i)} ${y(v)}`))
      .filter(Boolean)
      .join(' ');

  // End labels, nudged apart so they don't overlap.
  const labels = series
    .map((s) => {
      const i = s.values.map((v) => v !== null).lastIndexOf(true);
      return i === -1 ? null : { text: s.short, i, y: y(s.values[i] as number), color: s.color };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 11);
  }

  return (
    <View style={styles.wrap}>
      <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {gridValues.map((v) => (
              <Line
                key={`grid-${v}`}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 100 ? colors.textDim : colors.border}
                strokeWidth={1}
                strokeDasharray={v === 100 ? '2 3' : undefined}
              />
            ))}
            {gridValues.map((v) => (
              <SvgText key={`y-${v}`} x={PAD.left - 5} y={y(v) + 3} fontSize={9} fill={colors.textDim} textAnchor="end">
                {`${v}%`}
              </SvgText>
            ))}

            {series.map((s) => (
              <Path
                key={s.key}
                d={pathFor(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {series.map((s) => {
              const i = s.values.map((v) => v !== null).lastIndexOf(true);
              return i === -1 ? null : (
                <Circle
                  key={`end-${s.key}`}
                  cx={x(i)}
                  cy={y(s.values[i] as number)}
                  r={4}
                  fill={s.color}
                  stroke={colors.card}
                  strokeWidth={2}
                />
              );
            })}

            {labels.map((l) => (
              <SvgText key={`label-${l.text}`} x={x(l.i) + 8} y={l.y + 3} fontSize={9} fontWeight="700" fill={colors.textDim}>
                {l.text}
              </SvgText>
            ))}

            {days.map((day, i) => (
              <SvgText key={day} x={x(i)} y={HEIGHT - 5} fontSize={9} fill={colors.textDim} textAnchor="middle">
                {fromDateKey(day).toLocaleDateString(undefined, { weekday: 'short' })}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>

      <View style={styles.legend}>
        {[...SERIES].reverse().map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textDim, fontSize: 12 },
});
