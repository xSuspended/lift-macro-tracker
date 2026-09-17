import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

type ScrubberProps = {
  /** Where the plotted area starts and how wide it is, in px from the chart's left edge. */
  plotLeft: number;
  plotWidth: number;
  count: number;
  onIndex: (index: number | null) => void;
};

/**
 * An invisible layer over a chart that reports which data point is nearest the
 * pointer: mouse hover on web, and tap or drag with a finger on a phone.
 */
export function ChartScrubber({ plotLeft, plotWidth, count, onIndex }: ScrubberProps) {
  function pick(x: number) {
    if (count === 0 || plotWidth <= 0) return;
    const raw = count === 1 ? 0 : Math.round(((x - plotLeft) / plotWidth) * (count - 1));
    onIndex(Math.max(0, Math.min(count - 1, raw)));
  }

  const touch = (e: GestureResponderEvent) => pick(e.nativeEvent.locationX);

  // Mouse hover only exists on web; phones rely on the touch handlers below.
  const hover =
    Platform.OS === 'web'
      ? {
          onPointerMove: (e: { nativeEvent: { offsetX: number } }) => pick(e.nativeEvent.offsetX),
          onPointerLeave: () => onIndex(null),
        }
      : {};

  return (
    <View
      style={styles.layer}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={touch}
      onResponderMove={touch}
      // Let a vertical swipe still scroll the page.
      onResponderTerminationRequest={() => true}
      {...hover}
    />
  );
}

type TooltipProps = {
  /** Horizontal centre of the highlighted point, in px from the chart's left edge. */
  x: number;
  chartWidth: number;
  width: number;
  children: ReactNode;
};

const OFFSET = 12;

/**
 * A small card beside the highlighted point: to its right on the left half of the
 * chart and to its left on the right half, so it never covers the dots being read.
 */
export function ChartTooltip({ x, chartWidth, width, children }: TooltipProps) {
  const preferred = x < chartWidth / 2 ? x + OFFSET : x - OFFSET - width;
  const left = Math.max(0, Math.min(chartWidth - width, preferred));
  return (
    <View pointerEvents="none" style={[styles.tooltip, { left, width }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  tooltip: {
    position: 'absolute',
    top: 0,
    zIndex: 5,
    gap: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(11, 15, 20, 0.94)',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
  },
});
