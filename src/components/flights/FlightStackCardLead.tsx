import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows, spacing } from '@/constants/theme';
import type { PineappleFlightRecord } from '@/services/flights';
import { formatDateTime } from '@/utils/date';

import { AirlineBrandBand } from './AirlineBrandBand';

type Props = {
  record: PineappleFlightRecord;
  onPress?: () => void;
};

export function FlightStackCardLead({ record, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <View style={styles.card}>
        <AirlineBrandBand record={record} position="top" height={82} />
        <View style={styles.body}>
          <Text style={styles.routeLabel}>{record.routeLabel}</Text>
          <Text style={styles.routeCodeLine}>
            {record.departureAirportCode} <Text style={styles.routeArrow}>✈</Text> {record.arrivalAirportCode}
          </Text>
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Departure</Text>
              <Text style={styles.timeValue}>{formatDateTime(record.departureDatetime)}</Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Arrival</Text>
              <Text style={styles.timeValue}>{formatDateTime(record.arrivalDatetime)}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.992 }],
  },
  card: {
    minHeight: 212,
    borderRadius: 22,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.card,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  routeLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  routeCodeLine: {
    color: '#12161B',
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    letterSpacing: 1.1,
  },
  routeArrow: {
    color: colors.textMuted,
    fontSize: 24,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeBlock: {
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timeValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
});
