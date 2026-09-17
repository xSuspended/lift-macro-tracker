import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ChartScrubber, ChartTooltip } from '@/components/chart-touch';
import { CHART_FONT, niceScale } from '@/lib/chart';
import { fromDateKey } from '@/lib/dates';
import { colors, macroColors, spacing } from '@/lib/theme';
import type { DayTotals, Targets } from '@/lib/types';

type Props = {
  /** The days to show, oldest first, as "YYYY-MM-DD". Each day is one point. */
  days: string[];
  totals: DayTotals[];
  targets: { [K in keyof Targets]: number };
};

const HEIGHT = 200;
const PAD = { top: 8, right: 38, bottom: 22, left: 36 };

// Drawn in this order, so calories ends up on top.
const SERIES = [
  { key: 'carbs_g', target: 'target_carbs_g', label: 'Carbs', short: 'Carb', unit: 'g', color: macroColors.carbs, width: 2 },
  { key: 'fat_g', target: 'target_fat_g', label: 'Fat', short: 'Fat', unit: 'g', color: macroColors.fat, width: 2 },
  { key: 'protein_g', target: 'target_protein_g', label: 'Protein', short: 'Prot', unit: 'g', color: macroColors.protein, width: 2 },
  { key: 'kcal', target: 'target_kcal', label: 'Calories', short: 'Cal', unit: 'kcal', color: macroColors.kcal, width: 2.6 },
] as const;
const LEGEND_ORDER = ['kcal', 'protein_g', 'carbs_g', 'fat_g'].map((key) => SERIES.find((s) => s.key === key)!);

const weekday = (day: string) => fromDateKey(day).toLocaleDateString(undefined, { weekday: 'short' });
const shortDate = (day: string) => fromDateKey(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * Calories and the three macros, one point per day, as % of your daily target.
 * Percentages put kcal and grams on one honest scale; raw amounts can't share an axis.
 * Hover or touch a day to read the real amounts.
 */
export function MacroChart({ days, totals, targets }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const byDay = new Map(totals.map((t) => [t.logged_on, t]));
  const series = SERIES.map((s) => ({
    ...s,
    values: days.map((day) => {
      const total = byDay.get(day);
      return total ? (total[s.key] / targets[s.target]) * 100 : null;
    }),
  }));

  // Always keep the 100% target line in view.
  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const scale = niceScale(Math.min(100, ...allValues), Math.max(100, ...allValues), 5);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length === 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - scale.min) / (scale.max - scale.min)) * plotH;

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
      return i === -1 ? null : { text: s.short, i, y: y(s.values[i] as number) };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 11);
  }

  // A week shows every weekday; longer ranges show a date about once a week.
  const lastIndex = days.length - 1;
  const xLabelIndexes =
    days.length <= 7
      ? days.map((_, i) => i)
      : [...new Set([...Array.from({ length: Math.floor(lastIndex / 7) + 1 }, (_, k) => k * 7), lastIndex])].filter(
          (i) => i === lastIndex || lastIndex - i >= 4,
        );

  const shown = active !== null && active < days.length ? active : null;
  const shownDay = shown !== null ? byDay.get(days[shown]) : undefined;

  return (
    <View style={styles.wrap}>
      <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            <Svg width={width} height={HEIGHT}>
              {scale.ticks.map((v) => (
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
              {scale.ticks.map((v) => (
                <SvgText key={`y-${v}`} x={PAD.left - 5} y={y(v) + 3} fontSize={10} fontFamily={CHART_FONT} fill={colors.textDim} textAnchor="end">
                  {`${v}%`}
                </SvgText>
              ))}

              {shown !== null ? (
                <Line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.textDim} strokeWidth={1} strokeDasharray="3 3" />
              ) : null}

              {series.map((s) => (
                <Path
                  key={s.key}
                  d={pathFor(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Dots on the day being looked at, otherwise on each line's latest day. */}
              {series.map((s) => {
                const i = shown ?? s.values.map((v) => v !== null).lastIndexOf(true);
                const v = i >= 0 ? s.values[i] : null;
                return v === null ? null : (
                  <Circle key={`dot-${s.key}`} cx={x(i)} cy={y(v)} r={shown !== null ? 5 : 4} fill={s.color} stroke={colors.card} strokeWidth={2} />
                );
              })}

              {shown === null
                ? labels.map((l) => (
                    <SvgText key={`label-${l.text}`} x={x(l.i) + 8} y={l.y + 3} fontSize={10} fontFamily={CHART_FONT} fontWeight="700" fill={colors.textDim}>
                      {l.text}
                    </SvgText>
                  ))
                : null}

              {xLabelIndexes.map((i) => (
                <SvgText
                  key={days[i]}
                  x={x(i)}
                  y={HEIGHT - 5}
                  fontSize={10}
                  fontFamily={CHART_FONT}
                  fill={colors.textDim}
                  textAnchor={days.length <= 7 ? 'middle' : i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle'}>
                  {days.length <= 7 ? weekday(days[i]) : shortDate(days[i])}
                </SvgText>
              ))}
            </Svg>

            {shown !== null ? (
              <ChartTooltip x={x(shown)} chartWidth={width} width={196}>
                <Text style={styles.tipDay}>
                  {weekday(days[shown])} {shortDate(days[shown])}
                </Text>
                {shownDay ? (
                  LEGEND_ORDER.map((s) => (
                    <View key={s.key} style={styles.tipRow}>
                      <View style={[styles.swatch, { backgroundColor: s.color }]} />
                      <Text style={styles.tipName}>{s.label}</Text>
                      <Text style={styles.tipValue} numberOfLines={1}>
                        {Math.round(shownDay[s.key]).toLocaleString()} {s.unit}
                      </Text>
                      <Text style={styles.tipPercent}>{Math.round((shownDay[s.key] / targets[s.target]) * 100)}%</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.tipName}>Nothing logged</Text>
                )}
              </ChartTooltip>
            ) : null}

            <ChartScrubber plotLeft={PAD.left} plotWidth={plotW} count={days.length} onIndex={setActive} />
          </>
        ) : null}
      </View>

      <View style={styles.legend}>
        {LEGEND_ORDER.map((s) => (
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
  swatch: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textDim, fontSize: 12 },
  tipDay: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipName: { flex: 1, color: colors.textDim, fontSize: 12 },
  tipValue: { color: colors.text, fontSize: 12, fontWeight: '600' },
  tipPercent: { width: 34, textAlign: 'right', color: colors.textDim, fontSize: 11 },
});
