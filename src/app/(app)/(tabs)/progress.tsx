import { ScrollView, StyleSheet, Text } from 'react-native';

import { BodyWeightProgress } from '@/components/body-weight-progress';
import { LiftProgress } from '@/components/lift-progress';
import { NutritionProgress } from '@/components/nutrition-progress';
import { colors, spacing } from '@/lib/theme';

export default function ProgressTab() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Nutrition</Text>
      <NutritionProgress />

      <Text style={[styles.heading, styles.spaced]}>Body weight</Text>
      <BodyWeightProgress />

      <Text style={[styles.heading, styles.spaced]}>Lifts</Text>
      <LiftProgress />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { color: colors.text, fontSize: 20, fontWeight: '700' },
  spaced: { marginTop: spacing.xl },
});
