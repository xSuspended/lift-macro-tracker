import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  loading?: boolean;
  disabled?: boolean;
  /** Less side padding, for buttons squeezed into a narrow slot. */
  compact?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, compact }: Props) {
  const inactive = disabled || loading;
  const textColor =
    variant === 'primary' ? colors.onAccent : variant === 'warning' ? colors.onWarning : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'warning' && styles.warning,
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP_TARGET,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: { paddingHorizontal: spacing.xs },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  warning: { backgroundColor: colors.warning },
  pressed: { opacity: 0.75 },
  inactive: { opacity: 0.5 },
  label: { fontSize: 17, fontWeight: '600' },
});
