import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Option<T extends string | number> = {
  label: string;
  value: T;
};

type Props<T extends string | number> = {
  values: T[];
  onChange: (values: T[]) => void;
  options: Array<Option<T>>;
};

export function MultiSelectChips<T extends string | number>({ values, onChange, options }: Props<T>) {
  function toggle(value: T) {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
      return;
    }

    onChange([...values, value]);
  }

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <Pressable key={String(option.value)} onPress={() => toggle(option.value)} style={[styles.chip, active ? styles.chipActive : null]}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    backgroundColor: '#FFF0CC',
    borderColor: '#F1CF74',
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  labelActive: {
    color: '#A26B00',
  },
});
