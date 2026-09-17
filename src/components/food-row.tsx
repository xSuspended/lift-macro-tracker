import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';

type Props = {
  name: string;
  brand: string | null;
  kcalPer100g: number;
  servingName: string | null;
  servingGrams: number | null;
  /** Where an online result came from, e.g. "USDA". */
  sourceLabel?: string;
  onPress: () => void;
  onEdit?: () => void;
  busy?: boolean;
};

export function FoodRow({ name, brand, kcalPer100g, servingName, servingGrams, sourceLabel, onPress, onEdit, busy }: Props) {
  const energy =
    servingName && servingGrams
      ? `${formatNumber(Math.round((kcalPer100g * servingGrams) / 100))} kcal per ${servingName}`
      : `${formatNumber(Math.round(kcalPer100g))} kcal per 100 g`;

  return (
    <View style={styles.row}>
      <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[brand, energy].filter(Boolean).join(' · ')}
        </Text>
        {sourceLabel ? <Text style={styles.source}>{sourceLabel}</Text> : null}
      </Pressable>
      {busy ? (
        <View style={styles.icon}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : onEdit ? (
        <Pressable
          accessibilityLabel={`Edit ${name}`}
          onPress={onEdit}
          style={({ pressed }) => [styles.icon, styles.iconBorder, pressed && styles.pressed]}>
          <Ionicons name="create-outline" size={20} color={colors.textDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  main: { flex: 1, minHeight: TAP_TARGET + 4, justifyContent: 'center', gap: 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  pressed: { backgroundColor: colors.cardPressed },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13 },
  source: { color: colors.accent, fontSize: 11, fontWeight: '600', marginTop: 2 },
  icon: { width: TAP_TARGET, alignItems: 'center', justifyContent: 'center' },
  iconBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
});
