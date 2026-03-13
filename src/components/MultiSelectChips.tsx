import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Option = {
  label: string;
  value: string;
};

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
};

export function MultiSelectChips({ value, onChange, options }: Props) {
  function toggle(nextValue: string) {
    if (value.includes(nextValue)) {
      onChange(value.filter((item) => item !== nextValue));
      return;
    }

    onChange([...value, nextValue]);
  }

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <Pressable key={option.value} onPress={() => toggle(option.value)} style={[styles.chip, active ? styles.activeChip : null]}>
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{option.label}</Text>
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
    borderRadius: radii.pill,
    backgroundColor: '#F8F5EE',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activeChip: {
    backgroundColor: colors.nightNavy,
    borderColor: colors.nightNavy,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  activeLabel: {
    color: colors.white,
  },
});
