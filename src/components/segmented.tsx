import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/lib/theme';

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of mutually exclusive buttons, like tabs. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
          style={[styles.option, o.key === value && styles.on]}>
          <Text style={[styles.text, o.key === value && styles.textOn]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  option: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 4 },
  on: { backgroundColor: colors.accent },
  text: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  textOn: { color: colors.onAccent },
});
