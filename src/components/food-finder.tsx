import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { lookupBarcode, saveFoundFood, searchFoodsOnline, SOURCE_LABELS, type FoodCandidate } from '@/lib/food-search';
import { searchFoodTables } from '@/lib/food-tables';
import { errorMessage } from '@/lib/format';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';
import type { Food } from '@/lib/types';

type Props = {
  foods: Food[] | null;
  mealLabel: string;
  /** A food to log, from your list or freshly saved from search or a scan. */
  onPick: (food: Food) => void;
  onNewFood: (name: string) => void;
  onEditFood: (food: Food) => void;
  /** Called after an online food has been saved, so the list can refresh. */
  onFoodSaved: () => void;
};

type Online = {
  query: string;
  loading: boolean;
  results: FoodCandidate[];
  errors: string[];
};

// Barcode scanning is phone-only; web browsers don't get the scan button.
const CAN_SCAN = Platform.OS !== 'web';

/** Search your own foods, search Open Food Facts and USDA, or scan a barcode. */
export function FoodFinder({ foods, mealLabel, onPick, onNewFood, onEditFood, onFoodSaved }: Props) {
  const [search, setSearch] = useState('');
  const [online, setOnline] = useState<Online | null>(null);
  const [savingRef, setSavingRef] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tables, setTables] = useState<{ query: string; results: FoodCandidate[] } | null>(null);

  const query = search.trim();
  const lower = query.toLowerCase();
  const matches = (foods ?? []).filter(
    (f) => f.name.toLowerCase().includes(lower) || (f.brand ?? '').toLowerCase().includes(lower),
  );

  // The bundled food tables are searched as you type, after a short pause.
  useEffect(() => {
    if (query.length < 2) {
      setTables(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchFoodTables(query).then((results) => {
        if (!cancelled) setTables({ query, results });
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function runOnlineSearch() {
    if (query.length < 2) return;
    setError(null);
    setOnline({ query, loading: true, results: [], errors: [] });
    try {
      const { results, errors } = await searchFoodsOnline(query);
      setOnline({ query, loading: false, results, errors });
    } catch (e) {
      setOnline({ query, loading: false, results: [], errors: [errorMessage(e)] });
    }
  }

  async function pickCandidate(candidate: FoodCandidate) {
    setError(null);
    setSavingRef(candidate.source + candidate.source_ref);
    try {
      const food = await saveFoundFood(candidate);
      onFoodSaved();
      onPick(food);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingRef(null);
    }
  }

  async function handleBarcode(barcode: string) {
    setScanning(false);
    setError(null);
    setOnline({ query: `barcode ${barcode}`, loading: true, results: [], errors: [] });
    try {
      const found = await lookupBarcode(barcode);
      if (!found) {
        setOnline({ query: `barcode ${barcode}`, loading: false, results: [], errors: ['That barcode isn’t in Open Food Facts yet. Search by name or add it by hand with +.'] });
        return;
      }
      setOnline(null);
      await pickCandidate(found);
    } catch (e) {
      setOnline({ query: `barcode ${barcode}`, loading: false, results: [], errors: [errorMessage(e)] });
    }
  }

  const candidateRow = (candidate: FoodCandidate) => (
    <FoodRow
      key={candidate.source + candidate.source_ref}
      name={candidate.name}
      brand={candidate.brand}
      kcalPer100g={candidate.kcal_per_100g}
      servingName={candidate.serving_name}
      servingGrams={candidate.serving_grams}
      sourceLabel={SOURCE_LABELS[candidate.source]}
      busy={savingRef === candidate.source + candidate.source_ref}
      onPress={() => pickCandidate(candidate)}
    />
  );

  const onlineFooter = (
    <View style={styles.online}>
      {tables && tables.query === query && tables.results.length ? (
        <>
          <Text style={styles.sectionLabel}>Food tables · works offline</Text>
          {tables.results.map(candidateRow)}
        </>
      ) : null}

      {query.length >= 2 && online?.query !== query ? (
        <Button label={`Search online for “${query}”`} onPress={runOnlineSearch} variant="secondary" />
      ) : null}

      {online ? (
        <>
          <Text style={styles.sectionLabel}>Online · {online.query}</Text>
          {online.loading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
          {online.errors.map((message) => (
            <Text key={message} style={styles.warning}>
              {message}
            </Text>
          ))}
          {!online.loading && online.results.length === 0 && online.errors.length === 0 ? (
            <Text style={styles.dim}>No results. Try a simpler name, like “oats” rather than “Tesco rolled oats 1kg”.</Text>
          ) : null}
          {online.results.map(candidateRow)}
          {online.results.length ? (
            <Text style={styles.dim}>Online values come from community and government databases. Check the label if something looks off.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.textDim} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={runOnlineSearch}
            returnKeyType="search"
            placeholder="Search foods"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
          />
        </View>
        {CAN_SCAN ? (
          <Pressable
            accessibilityLabel="Scan barcode"
            onPress={() => setScanning(true)}
            style={({ pressed }) => [styles.square, styles.scan, pressed && styles.pressed]}>
            <Ionicons name="barcode-outline" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="New food"
          onPress={() => onNewFood(query)}
          style={({ pressed }) => [styles.square, styles.add, pressed && styles.pressed]}>
          <Ionicons name="add" size={26} color={colors.onAccent} />
        </Pressable>
      </View>

      {error ? <Text style={[styles.warning, styles.padded]}>{error}</Text> : null}

      {foods === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(f) => f.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.dim}>
              {matches.length
                ? `Tap a food to add it to ${mealLabel}.`
                : foods.length === 0
                  ? 'No foods of your own yet. Search online, scan a barcode, or tap + to enter a label.'
                  : 'None of your foods match.'}
            </Text>
          }
          ListFooterComponent={onlineFooter}
          renderItem={({ item }) => (
            <FoodRow
              name={item.name}
              brand={item.brand}
              kcalPer100g={item.kcal_per_100g}
              servingName={item.serving_name}
              servingGrams={item.serving_grams}
              onPress={() => onPick(item)}
              onEdit={item.user_id ? () => onEditFood(item) : undefined}
            />
          )}
        />
      )}

      {CAN_SCAN ? <BarcodeScanner visible={scanning} onScanned={handleBarcode} onClose={() => setScanning(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: TAP_TARGET,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, minHeight: TAP_TARGET, color: colors.text, fontSize: 17 },
  square: { width: TAP_TARGET, height: TAP_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  scan: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  add: { backgroundColor: colors.accent },
  pressed: { opacity: 0.75 },
  list: { padding: spacing.lg, gap: spacing.sm },
  online: { gap: spacing.sm, marginTop: spacing.md },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  loading: { marginVertical: spacing.xl },
  dim: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  warning: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
