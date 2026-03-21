import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { Trip } from '@/types/models';

type TripPickerOption = {
  id: string;
  label: string;
};

type Props = {
  trips: Trip[];
  value: string | null;
  onChange: (tripId: string) => void;
  extraOptions?: TripPickerOption[];
};

export function TripPicker({ trips, value, onChange, extraOptions = [] }: Props) {
  if (!trips.length && !extraOptions.length) {
    return null;
  }

  const options: TripPickerOption[] = [
    ...extraOptions,
    ...trips.map((trip) => ({
      id: trip.id,
      label: trip.destination,
    })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable key={option.id} onPress={() => onChange(option.id)} style={[styles.chip, active ? styles.chipActive : null]}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{option.label}</Text>
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
