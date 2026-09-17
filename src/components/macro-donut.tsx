import { useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors, macroColors } from '@/lib/theme';

export type DonutPart = {
  key: string;
  label: string;
  color: string;
  /** Calories this macro supplied; sets the slice size. */
  kcal: number;
  grams: number;
  targetGrams: number | null;
};

type Props = {
  kcal: number;
  targetKcal: number | null;
  parts: DonutPart[];
  size?: number;
};

const OUTER_STROKE = 5;
const RING_GAP = 4;
const INNER_STROKE = 13;
const SLICE_GAP = 3;
// Extra room around each ring that still counts as pointing at it.
const HIT_SLOP = 5;

const fmt = (n: number) => Math.round(n).toLocaleString();
const percent = (value: number, target: number | null) => (target ? `${Math.round((value / target) * 100)}%` : null);

/**
 * Two rings. Outer: calories eaten against the target, white for eaten and grey for
 * what's left. Inner: where the calories came from, split by macro. Hover or tap a
 * ring or slice to see its numbers in the middle.
 */
export function MacroDonut({ kcal, targetKcal, parts, size = 140 }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const centre = size / 2;
  const outerR = (size - OUTER_STROKE) / 2;
  const innerR = outerR - OUTER_STROKE / 2 - RING_GAP - INNER_STROKE / 2;
  const outerC = 2 * Math.PI * outerR;
  const innerC = 2 * Math.PI * innerR;
  // Start at 12 o'clock and go clockwise.
  const rotate = `rotate(-90 ${centre} ${centre})`;

  const eatenShare = targetKcal ? Math.min(1, kcal / targetKcal) : 0;
  const kcalOver = !!targetKcal && kcal > targetKcal;

  const filled = parts.filter((p) => p.kcal > 0);
  const macroTotal = filled.reduce((sum, p) => sum + p.kcal, 0);
  let offset = 0;
  const arcs = filled.map((part) => {
    const length = (part.kcal / macroTotal) * innerC;
    // Leave a small gap between slices, unless a slice is the whole ring.
    const drawn = filled.length > 1 ? Math.max(0, length - SLICE_GAP) : length;
    // Each slice fills with progress toward that macro's own target, like the
    // calorie ring does. Without a target the slice is shown full.
    const progress = part.targetGrams ? Math.min(1, part.grams / part.targetGrams) : 1;
    const over = !!part.targetGrams && part.grams > part.targetGrams;
    const arc = { ...part, drawn, fill: drawn * progress, over, offset, length };
    offset += length;
    return arc;
  });

  /** Which ring or slice sits under a point measured from the top-left of the donut. */
  function hitTest(x: number, y: number) {
    const dx = x - centre;
    const dy = y - centre;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (targetKcal && Math.abs(distance - outerR) <= OUTER_STROKE / 2 + HIT_SLOP) return 'kcal';
    if (Math.abs(distance - innerR) <= INNER_STROKE / 2 + HIT_SLOP / 2 && arcs.length) {
      // Angle clockwise from 12 o'clock, as a distance along the inner ring.
      const degrees = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
      const along = (degrees / 360) * innerC;
      return arcs.find((a) => along >= a.offset && along < a.offset + a.length)?.key ?? null;
    }
    return null;
  }

  const touch = (e: GestureResponderEvent) => setActive(hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY));
  const hover =
    Platform.OS === 'web'
      ? {
          onPointerMove: (e: { nativeEvent: { offsetX: number; offsetY: number } }) =>
            setActive(hitTest(e.nativeEvent.offsetX, e.nativeEvent.offsetY)),
          onPointerLeave: () => setActive(null),
        }
      : {};

  let centreLabel: string | null = null;
  let centreValue: string;
  let centreCaption: string;
  let centreColor: string = colors.text;
  const activePart = parts.find((p) => p.key === active);

  if (active === 'kcal' && targetKcal) {
    centreLabel = 'Calories';
    centreValue = percent(kcal, targetKcal) ?? fmt(kcal);
    centreCaption = `${fmt(kcal)} / ${fmt(targetKcal)}`;
  } else if (activePart) {
    centreLabel = activePart.label;
    centreColor = activePart.color;
    centreValue = percent(activePart.grams, activePart.targetGrams) ?? `${fmt(activePart.grams)} g`;
    centreCaption = activePart.targetGrams
      ? `${fmt(activePart.grams)} / ${fmt(activePart.targetGrams)} g`
      : `${fmt(activePart.kcal)} kcal`;
  } else {
    centreValue = percent(kcal, targetKcal) ?? fmt(kcal);
    centreCaption = targetKcal ? 'of target' : 'kcal';
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {targetKcal ? (
          <>
            <Circle cx={centre} cy={centre} r={outerR} stroke={colors.border} strokeWidth={OUTER_STROKE} fill="none" />
            {kcalOver ? (
              <Circle
                cx={centre}
                cy={centre}
                r={outerR}
                stroke={colors.overTarget}
                strokeWidth={OUTER_STROKE + 8}
                strokeOpacity={active && active !== 'kcal' ? 0.08 : 0.25}
                fill="none"
              />
            ) : null}
            {eatenShare > 0 ? (
              <Circle
                cx={centre}
                cy={centre}
                r={outerR}
                stroke={kcalOver ? colors.overTarget : macroColors.kcal}
                strokeWidth={active === 'kcal' ? OUTER_STROKE + 2 : OUTER_STROKE}
                strokeOpacity={active && active !== 'kcal' ? 0.35 : 1}
                strokeLinecap={eatenShare < 1 ? 'round' : 'butt'}
                fill="none"
                strokeDasharray={`${eatenShare * outerC} ${outerC}`}
                transform={rotate}
              />
            ) : null}
          </>
        ) : null}

        <Circle cx={centre} cy={centre} r={innerR} stroke={colors.bg} strokeWidth={INNER_STROKE} fill="none" />
        {arcs.map((arc) => {
          const width = active === arc.key ? INNER_STROKE + 4 : INNER_STROKE;
          const opacity = active && active !== arc.key ? 0.35 : 1;
          const span = (length: number, strokeWidth: number, stroke: string) => (
            <Circle
              cx={centre}
              cy={centre}
              r={innerR}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              fill="none"
              strokeDasharray={`${length} ${innerC - length}`}
              strokeDashoffset={-arc.offset}
              transform={rotate}
            />
          );
          return (
            <G key={arc.key}>
              {/* Over target: a glowing red outline built from layers (soft halo, bright
                  edge, pale shine), then a dark hairline so it still reads against the
                  red fat slice. Layered strokes look the same on Android and web. */}
              {arc.over ? (
                <>
                  <Circle
                    cx={centre}
                    cy={centre}
                    r={innerR}
                    stroke={colors.overTarget}
                    strokeWidth={width + 14}
                    strokeOpacity={0.22 * opacity}
                    fill="none"
                    strokeDasharray={`${arc.drawn} ${innerC - arc.drawn}`}
                    strokeDashoffset={-arc.offset}
                    transform={rotate}
                  />
                  {span(arc.drawn, width + 8, colors.overTarget)}
                  {span(arc.drawn, width + 4, colors.overTargetShine)}
                  {span(arc.drawn, width + 2, colors.card)}
                </>
              ) : null}
              {/* The whole slice in grey, then the part of the target eaten in colour. */}
              {span(arc.drawn, width, colors.border)}
              {arc.fill > 0 ? span(arc.fill, width, arc.color) : null}
            </G>
          );
        })}
      </Svg>

      <View style={styles.centre} pointerEvents="none">
        {centreLabel ? <Text style={[styles.label, { color: centreColor }]}>{centreLabel}</Text> : null}
        <Text style={styles.value}>{centreValue}</Text>
        <Text style={styles.caption}>{centreCaption}</Text>
      </View>

      {/* Invisible layer that works out which ring or slice is being pointed at. */}
      <View
        style={styles.hitLayer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={touch}
        onResponderMove={touch}
        onResponderTerminationRequest={() => true}
        {...hover}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  hitLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  label: { fontSize: 11, fontWeight: '700' },
  value: { color: colors.text, fontSize: 22, fontWeight: '700' },
  caption: { color: colors.textDim, fontSize: 11, marginTop: -2 },
});
