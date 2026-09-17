import { Platform } from 'react-native';

// SVG text doesn't inherit the app's font on web and falls back to a serif.
export const CHART_FONT = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

/**
 * Round axis limits and a tidy step between gridlines (1, 2, 2.5, 5 × a power of ten),
 * so the axis reads 78 / 80 / 82 / 84 instead of 79.6 / 81.2 / 82.8.
 */
export function niceScale(min: number, max: number, targetLines = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rough = (max - min) / (targetLines - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { min: lo, max: hi, ticks };
}
