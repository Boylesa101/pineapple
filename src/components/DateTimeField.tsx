import { useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';
import { coerceDate, formatDateTime, formatShortDate } from '@/utils/date';

type Props = {
  label: string;
  mode: 'date' | 'datetime';
  value: string | null;
  onChange: (value: string) => void;
  iconName?: ComponentProps<typeof MaterialIcons>['name'];
};

function mergeDateAndTime(datePart: Date, timePart: Date) {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

export function DateTimeField({ label, mode, value, onChange, iconName }: Props) {
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

  function openAndroidDateTimePicker() {
    const currentValue = coerceDate(value);

    if (mode === 'date') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'dismissed' || !selected) {
            return;
          }
          onChange(selected.toISOString());
        },
      });
      return;
    }

    DateTimePickerAndroid.open({
      value: currentValue,
      mode: 'date',
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type === 'dismissed' || !selectedDate) {
          return;
        }

        const timeSeed = new Date(selectedDate);
        timeSeed.setHours(currentValue.getHours(), currentValue.getMinutes(), 0, 0);

        DateTimePickerAndroid.open({
          value: timeSeed,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type === 'dismissed' || !selectedTime) {
              return;
            }

            onChange(mergeDateAndTime(selectedDate, selectedTime).toISOString());
          },
        });
      },
    });
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker();
      return;
    }

    setShow(true);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        {iconName ? <MaterialIcons name={iconName} size={16} color={colors.primaryBlueDark} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Pressable onPress={openPicker} style={styles.input}>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
