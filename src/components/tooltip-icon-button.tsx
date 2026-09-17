import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, TAP_TARGET } from '@/lib/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Shown as a tooltip on hover (web) and read out by screen readers. */
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
};

/** A square icon button whose label floats above it in a glassy bubble when hovered. */
export function TooltipIconButton({ icon, label, color, onPress, loading, style }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [hovered, setHovered] = useState(false);

  function fade(to: 0 | 1) {
    if (to === 1) setHovered(true);
    Animated.timing(opacity, { toValue: to, duration: 140, useNativeDriver: false }).start(() => {
      if (to === 0) setHovered(false);
    });
  }

  return (
    <View style={[styles.wrap, style]}>
      {hovered ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltip,
            glass,
            {
              opacity,
              transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
            },
          ]}>
          <View style={styles.shine} />
          <Text style={styles.tooltipText} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={loading}
        onPress={onPress}
        onHoverIn={() => fade(1)}
        onHoverOut={() => fade(0)}
        style={({ pressed }) => [
          styles.button,
          { borderColor: color },
          (pressed || hovered) && styles.active,
        ]}>
        {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={22} color={color} />}
      </Pressable>
    </View>
  );
}

// Frosted-glass look. Backdrop blur only exists in browsers; phones never show
// the tooltip anyway because there is no hover.
const glass = Platform.select({
  web: { backdropFilter: 'blur(10px) saturate(160%)', WebkitBackdropFilter: 'blur(10px) saturate(160%)' },
  default: {},
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  button: {
    height: TAP_TARGET,
    minWidth: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  active: { backgroundColor: 'rgba(248, 113, 113, 0.18)' },
  tooltip: {
    position: 'absolute',
    bottom: TAP_TARGET + 10,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(30, 38, 50, 0.62)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  // A soft highlight across the top half, like light catching glass.
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tooltipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
