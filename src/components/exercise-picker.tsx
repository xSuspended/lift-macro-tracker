import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { createExercise, listExercises } from '@/lib/exercises';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { Exercise } from '@/lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
};

export function ExercisePicker({ visible, onClose, onPick }: Props) {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setError(null);
    listExercises()
      .then(setExercises)
      .catch((e) => setError(errorMessage(e)));
  }, [visible]);

  const query = search.trim().toLowerCase();
  const matches = (exercises ?? []).filter((e) => e.name.toLowerCase().includes(query));
  const exactMatch = (exercises ?? []).some((e) => e.name.toLowerCase() === query);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      onPick(await createExercise(search.trim()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Add exercise</Text>
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textDim} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search or type a new name"
            placeholderTextColor={colors.textDim}
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>

        {query && !exactMatch ? (
          <View style={styles.create}>
            <Button
              label={`Create "${search.trim()}"`}
              onPress={handleCreate}
              variant="secondary"
              loading={creating}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {exercises === null && !error ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.user_id ? 'Custom' : item.muscle_group}</Text>
              </Pressable>
            )}
          />
        )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: TAP_TARGET,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, minHeight: TAP_TARGET, color: colors.text, fontSize: 17 },
  create: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 15, marginHorizontal: spacing.lg, marginTop: spacing.md },
  loading: { marginTop: spacing.xxl },
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
  itemName: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  itemMeta: { color: colors.textDim, fontSize: 13 },
  pressed: { backgroundColor: colors.cardPressed },
});
