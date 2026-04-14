import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '@/constants/theme';
import type { PineappleFlightRecord } from '@/services/flights';
import { formatDateTime, formatShortDate } from '@/utils/date';

import { AirlineBrandBand } from './AirlineBrandBand';

type Props = {
  record: PineappleFlightRecord;
  onPress?: () => void;
};

export function FlightStackCardCompact({ record, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <View style={styles.card}>
        <View style={styles.body}>
          <Text style={styles.routeTitle}>{record.routeLabel}</Text>
          <Text style={styles.routeCodes}>
            {record.departureAirportCode} ✈ {record.arrivalAirportCode}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatShortDate(record.departureDatetime)}</Text>
            <Text style={styles.meta}>{formatDateTime(record.departureDatetime)}</Text>
          </View>
        </View>
        <AirlineBrandBand record={record} position="bottom" height={62} />
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
    minHeight: 156,
    borderRadius: 22,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.card,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  routeTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  routeCodes: {
    color: '#111111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
