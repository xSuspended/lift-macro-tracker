import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';

export type Option = { id: string; label: string; meta?: string };

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
};

/** A full-screen list to choose one option from. */
export function SelectModal({ visible, title, options, selectedId, onPick, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>

        <FlatList
          data={options}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item.id)}
              style={({ pressed }) => [
                styles.item,
                item.id === selectedId && styles.selected,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.label}>{item.label}</Text>
              {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  close: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  item: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  selected: { borderColor: colors.accent, borderWidth: 2 },
  label: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13 },
  pressed: { backgroundColor: colors.cardPressed },
});
