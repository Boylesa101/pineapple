import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { Trip } from '@/types/models';

type Props = {
  trips: Trip[];
  value: string | null;
  onChange: (tripId: string) => void;
};

export function TripPicker({ trips, value, onChange }: Props) {
  if (!trips.length) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {trips.map((trip) => {
        const active = trip.id === value;
        return (
          <Pressable key={trip.id} onPress={() => onChange(trip.id)} style={[styles.chip, active ? styles.chipActive : null]}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{trip.destination}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.nightNavy,
    borderColor: colors.nightNavy,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  labelActive: {
    color: colors.white,
  },
});
