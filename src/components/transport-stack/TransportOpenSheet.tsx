import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';

import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { TransportItem } from '@/services/transport';
import { formatDateTime, formatShortDate } from '@/utils/date';

import { TransportOperatorLogo } from './TransportOperatorLogo';
import { TransportStatusPill } from './TransportStatusPill';

type Props = {
  item: TransportItem;
  onBack: () => void;
};

function field(label: string, value: string | null | undefined) {
  return {
    label,
    value: value?.trim() || 'Not set',
  };
}

function groupedFields(item: TransportItem) {
  if (item.type === 'airline') {
    return [
      field('Passenger', item.passengerName),
      field('Booking reference', item.bookingReference),
      field('Flight number', item.flightNumber || item.serviceNumber),
      field('Date', item.departureTime ? formatShortDate(item.departureTime) : ''),
      field('Route', item.routeLabel),
      field('Departure', item.departureTime ? formatDateTime(item.departureTime) : ''),
      field('Arrival', item.arrivalTime ? formatDateTime(item.arrivalTime) : ''),
      field('Terminal', item.terminal),
      field('Gate', item.gate),
      field('Seat', item.seat),
      field('Class', item.cabinClass),
      field('Boarding', item.boardingInfo),
    ];
  }
  if (item.type === 'rail') {
    return [
      field('Passenger', item.passengerName),
      field('Ticket reference', item.ticketReference || item.bookingReference),
      field('Operator', item.operatorName),
      field('Route', item.routeLabel),
      field('Departure', item.departureTime ? formatDateTime(item.departureTime) : ''),
      field('Arrival', item.arrivalTime ? formatDateTime(item.arrivalTime) : ''),
      field('Platform', item.platform),
      field('Coach', item.coach),
      field('Seat', item.seat),
      field('Status', item.status),
    ];
  }
  if (item.type === 'bus') {
    return [
      field('Route / service', item.lineName || item.serviceNumber),
      field('Operator', item.operatorName),
      field('Origin stop', item.stopName || item.originName),
      field('Destination', item.destinationName),
      field('Departure', item.departureTime ? formatDateTime(item.departureTime) : ''),
      field('Status', item.status),
      field('Ticket info', item.ticketReference || item.bookingReference),
    ];
  }
  if (item.type === 'taxi') {
    return [
      field('Provider', item.operatorName),
      field('Pickup', item.originName),
      field('Drop-off', item.destinationName),
      field('Departure', item.departureTime ? formatDateTime(item.departureTime) : ''),
      field('Booking', item.bookingReference),
    ];
  }
  return [
    field('Hotel', item.operatorName),
    field('Address', item.stopName),
    field('Check-in', item.departureTime ? formatDateTime(item.departureTime) : ''),
    field('Check-out', item.arrivalTime ? formatDateTime(item.arrivalTime) : ''),
    field('Booking', item.bookingReference),
  ];
}

function BarcodeBlock({ item }: { item: TransportItem }) {
  if (item.qrOrBarcodeValue && item.barcodeFormat === 'qr') {
    return (
      <View style={styles.barcodeWrap}>
        <QRCodeImage value={item.qrOrBarcodeValue} size={220} />
        <Text style={styles.barcodeCaption}>Stored QR payload</Text>
      </View>
    );
  }

  if (item.qrOrBarcodeValue) {
    return (
      <View style={styles.barcodeFallback}>
        <Text style={styles.barcodeFormat}>{item.barcodeFormat ? item.barcodeFormat.toUpperCase() : 'Saved barcode'}</Text>
        <Text style={styles.barcodeText}>{item.qrOrBarcodeValue}</Text>
      </View>
    );
  }

  return (
    <View style={styles.confirmationBlock}>
      <Text style={styles.confirmationTitle}>
        {item.type === 'bus' ? 'Trip confirmation' : item.type === 'hotel' ? 'Booking confirmation' : 'Saved travel details'}
      </Text>
      <Text style={styles.confirmationCopy}>
        {item.type === 'bus'
          ? 'No ticket QR is saved for this service yet. Pineapple is showing the trip confirmation details instead.'
          : 'No scannable code is stored for this card yet.'}
      </Text>
    </View>
  );
}

export function TransportOpenSheet({ item, onBack }: Props) {
  const fields = groupedFields(item);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.topBarButton}>
          <MaterialIcons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable
            onPress={() => {
              const payload = item.qrOrBarcodeValue || item.bookingReference || item.ticketReference;
              if (!payload) {
                Alert.alert('Nothing to copy', 'No ticket code or booking reference is saved for this card yet.');
                return;
              }
              void Clipboard.setStringAsync(payload);
              Alert.alert('Copied', 'Pineapple copied the saved transport code or reference.');
            }}
            style={styles.topBarButton}
          >
            <MaterialIcons name="ios-share" size={20} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Live provider',
                item.isLive && item.lastUpdatedAt
                  ? `Live data refreshed at ${formatDateTime(item.lastUpdatedAt)}.`
                  : item.fallbackSource || 'This card is using saved trip details only.'
              )
            }
            style={styles.topBarButton}
          >
            <MaterialIcons name="more-horiz" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.passShell}>
          <View style={[styles.passHeader, { backgroundColor: item.operatorBrandColor }]}>
            <View style={styles.passHeaderCopy}>
              <TransportOperatorLogo item={item} size={46} />
              <View style={styles.passHeaderText}>
                <Text style={[styles.passOperator, { color: item.operatorTextColor }]} numberOfLines={1}>
                  {item.operatorName}
                </Text>
                <Text style={[styles.passService, { color: item.operatorTextColor }]} numberOfLines={1}>
                  {item.flightNumber || item.trainNumber || item.serviceNumber || item.lineName || item.routeLabel}
                </Text>
              </View>
            </View>
            <TransportStatusPill status={item.liveStatus} label={item.status} />
          </View>

          <View style={styles.passBody}>
            <Text style={styles.passRouteSummary}>{item.routeLabel}</Text>
            <Text style={styles.passRouteCodes}>
              {(item.originCode || item.originName) || 'Origin'} \u2192 {(item.destinationCode || item.destinationName) || 'Destination'}
            </Text>

            <View style={styles.fieldGrid}>
              {fields.map((entry) => (
                <View key={entry.label} style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>{entry.label}</Text>
                  <Text style={styles.fieldValue}>{entry.value}</Text>
                </View>
              ))}
            </View>

            {item.lastUpdatedAt ? (
              <Text style={styles.lastUpdated}>Last updated {formatDateTime(item.lastUpdatedAt)}</Text>
            ) : null}

            <BarcodeBlock item={item} />
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
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  passShell: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadows.card,
  },
  passHeader: {
    minHeight: 104,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  passHeaderCopy: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  passHeaderText: {
    flex: 1,
    gap: 4,
  },
  passOperator: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  passService: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  passBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  passRouteSummary: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  passRouteCodes: {
    color: '#111111',
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 34,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    columnGap: spacing.md,
  },
  fieldCell: {
    width: '47%',
    gap: 4,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  lastUpdated: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  barcodeWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcodeCaption: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  barcodeFallback: {
    minHeight: 220,
    borderRadius: radii.lg,
    backgroundColor: '#F4F7FB',
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcodeFormat: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  barcodeText: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  confirmationBlock: {
    minHeight: 180,
    borderRadius: radii.lg,
    backgroundColor: '#F4F7FB',
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  confirmationTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  confirmationCopy: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
