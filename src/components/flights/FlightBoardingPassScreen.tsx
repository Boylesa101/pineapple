import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { BarcodeDisplay } from '@/components/flights/BarcodeDisplay';
import { AirlineBrandBand } from '@/components/flights/AirlineBrandBand';
import { colors, radii, spacing } from '@/constants/theme';
import type { PineappleFlightRecord } from '@/services/flights';
import { formatDateTime } from '@/utils/date';

type Props = {
  record: PineappleFlightRecord;
  onBack: () => void;
  onShare?: () => void;
  onMore?: () => void;
};

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function FlightBoardingPassScreen({ record, onBack, onShare, onMore }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.iconButton} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable onPress={onShare} style={styles.iconButton} accessibilityLabel="Share boarding pass">
            <MaterialIcons name="share" size={20} color={colors.white} />
          </Pressable>
          <Pressable onPress={onMore} style={styles.iconButton} accessibilityLabel="More flight options">
            <MaterialIcons name="more-vert" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.passCard}>
          <AirlineBrandBand record={record} position="header" height={96} />
          <View style={styles.passBody}>
            <Text style={styles.routeSummary}>{record.routeLabel}</Text>
            <Text style={styles.routeCodes}>
              {record.departureAirportCode} ✈ {record.arrivalAirportCode}
            </Text>

            <View style={styles.sectionGrid}>
              <DetailCell label="Departure" value={formatDateTime(record.departureDatetime)} />
              <DetailCell label="Arrival" value={formatDateTime(record.arrivalDatetime)} />
              <DetailCell label="Passenger" value={record.passengerName} />
              <DetailCell label="Seat" value={record.seat} />
              <DetailCell label="Sequence" value={record.sequence} />
              <DetailCell label="Boarding" value={record.boardingInfo} />
              <DetailCell label="Gate closes" value={record.gateCloseTime || 'Not set'} />
              <DetailCell label="Provider" value={record.providerSource.toUpperCase()} />
            </View>

            <View style={styles.fareStrip}>
              <Text style={styles.fareStripText}>{record.fareLabel}</Text>
              <Text style={styles.fareStripText}>{record.baggageSummary}</Text>
            </View>

            <View style={styles.barcodeSection}>
              <BarcodeDisplay record={record} />
            </View>

            <View style={styles.bookingLine}>
              <Text style={styles.bookingLabel}>Booking</Text>
              <Text style={styles.bookingValue}>{record.bookingReference}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primaryBlueDark,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  passCard: {
    borderRadius: 28,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  passBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  routeSummary: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  routeCodes: {
    color: '#12161B',
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    letterSpacing: 1.2,
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailCell: {
    minWidth: '46%',
    flexGrow: 1,
    borderRadius: radii.md,
    backgroundColor: '#F7F9FC',
    padding: spacing.md,
    gap: 4,
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  fareStrip: {
    borderRadius: radii.md,
    backgroundColor: '#F3F6FA',
    padding: spacing.md,
    gap: spacing.xs,
  },
  fareStripText: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  barcodeSection: {
    alignItems: 'center',
  },
  bookingLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D7E0EA',
  },
  bookingLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  bookingValue: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
});
