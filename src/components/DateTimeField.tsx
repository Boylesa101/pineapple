import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { colors, radii, spacing } from '@/constants/theme';
import { coerceDate, formatDateTime, formatShortDate } from '@/utils/date';

type Props = {
  label: string;
  mode: 'date' | 'datetime';
  value: string | null;
  onChange: (value: string) => void;
};

export function DateTimeField({ label, mode, value, onChange }: Props) {
  const [show, setShow] = useState(false);
  const date = coerceDate(value);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') {
      setShow(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    onChange(selected.toISOString());
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setShow(true)} style={styles.input}>
        <Text style={styles.value}>{mode === 'date' ? formatShortDate(value) : formatDateTime(value)}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          mode={mode === 'date' ? 'date' : 'datetime'}
          value={date}
          onChange={handleChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  value: {
    color: colors.nightNavy,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});
