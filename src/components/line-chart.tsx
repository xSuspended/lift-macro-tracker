import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { CHART_FONT, niceScale } from '@/lib/chart';
import { formatNumber } from '@/lib/format';
import { colors } from '@/lib/theme';

export type ChartPoint = { label: string; value: number };

type Props = {
  points: ChartPoint[];
  height?: number;
  color?: string;
};

const PAD = { top: 10, right: 10, bottom: 22, left: 40 };

/** A single-series line chart that fills the width of its container. */
export function LineChart({ points, height = 180, color = colors.accent }: Props) {
  const [width, setWidth] = useState(0);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(...values), Math.max(...values));

  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - scale.min) / (scale.max - scale.min)) * plotH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)} ${PAD.top + plotH} L${x(0)} ${PAD.top + plotH} Z`;

  const lastIndex = points.length - 1;
  const xLabelIndexes = points.length >= 5 ? [0, Math.round(lastIndex / 2), lastIndex] : [0, lastIndex];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {scale.ticks.map((v) => (
            <Line
              key={`grid-${v}`}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {scale.ticks.map((v) => (
            <SvgText
              key={`label-${v}`}
              x={PAD.left - 8}
              y={y(v) + 4}
              fontSize={11}
              fontFamily={CHART_FONT}
              fill={colors.textDim}
              textAnchor="end">
              {formatNumber(v)}
            </SvgText>
          ))}

          {points.length > 1 ? (
            <>
              <Path d={area} fill="url(#fade)" />
              <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : null}

          {points.map((p, i) =>
            i === lastIndex ? null : <Circle key={`dot-${i}`} cx={x(i)} cy={y(p.value)} r={3} fill={color} />,
          )}
          <Circle cx={x(lastIndex)} cy={y(points[lastIndex].value)} r={5.5} fill={color} stroke={colors.card} strokeWidth={2.5} />

          {(points.length === 1 ? [0] : xLabelIndexes).map((i) => (
            <SvgText
              key={`x-${i}`}
              x={x(i)}
              y={height - 5}
              fontSize={11}
              fontFamily={CHART_FONT}
              fill={colors.textDim}
              textAnchor={points.length === 1 ? 'middle' : i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle'}>
              {points[i].label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
