import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows, spacing } from '@/constants/theme';
import type { TransportCardState, TransportItem } from '@/services/transport';
import { formatDateTime, formatShortDate } from '@/utils/date';

import { TransportOperatorLogo } from './TransportOperatorLogo';
import { TransportStatusPill } from './TransportStatusPill';

type Props = {
  item: TransportItem;
  state: TransportCardState;
  onPress?: () => void;
  onOpen?: () => void;
};

function valueOrFallback(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function serviceLabel(item: TransportItem) {
  return item.flightNumber || item.trainNumber || item.serviceNumber || item.lineName || 'Saved service';
}

function bodyRoute(item: TransportItem) {
  if (item.originCode && item.destinationCode) {
    return `${item.originCode} \u2192 ${item.destinationCode}`;
  }
  if (item.originName && item.destinationName) {
    return `${item.originName} \u2192 ${item.destinationName}`;
  }
  return item.routeLabel;
}

function clickedSummaryLines(item: TransportItem) {
  if (item.type === 'airline') {
    return [
      { label: 'Passenger', value: valueOrFallback(item.passengerName, 'Passenger not set') },
      { label: 'Booking', value: valueOrFallback(item.bookingReference, 'Not set') },
      { label: 'Seat', value: valueOrFallback(item.seat, 'Not set') },
      { label: 'Boarding', value: valueOrFallback(item.boardingInfo, 'Check saved pass') },
    ];
  }
  if (item.type === 'rail') {
    return [
      { label: 'Passenger', value: valueOrFallback(item.passengerName, 'Passenger not set') },
      { label: 'Ticket', value: valueOrFallback(item.ticketReference || item.bookingReference, 'Not set') },
      { label: 'Coach', value: valueOrFallback(item.coach, 'Not set') },
      { label: 'Seat / platform', value: valueOrFallback([item.seat, item.platform].filter(Boolean).join(' • '), 'Not set') },
    ];
  }
  if (item.type === 'bus') {
    return [
      { label: 'Route', value: valueOrFallback(item.lineName || item.serviceNumber, 'Saved route') },
      { label: 'Operator', value: valueOrFallback(item.operatorName, 'Operator not set') },
      { label: 'Stop', value: valueOrFallback(item.stopName || item.originName, 'Stop not set') },
      { label: 'Departure', value: item.departureTime ? formatDateTime(item.departureTime) : 'Time unavailable' },
    ];
  }
  if (item.type === 'taxi') {
    return [
      { label: 'Provider', value: valueOrFallback(item.operatorName, 'Saved ride') },
      { label: 'Pickup', value: valueOrFallback(item.originName, 'Pickup not set') },
      { label: 'Drop-off', value: valueOrFallback(item.destinationName, 'Drop-off not set') },
      { label: 'Booking', value: valueOrFallback(item.bookingReference, 'Not set') },
    ];
  }
  return [
    { label: 'Booking', value: valueOrFallback(item.bookingReference, 'Not set') },
    { label: 'Check-in', value: item.departureTime ? formatDateTime(item.departureTime) : 'Unavailable' },
    { label: 'Stay', value: valueOrFallback(item.routeLabel, 'Saved hotel') },
    { label: 'Address', value: valueOrFallback(item.stopName, 'Unavailable') },
  ];
}

function InStackCard({ item }: { item: TransportItem }) {
  return (
    <View style={[styles.cardShell, styles.stackCard, { backgroundColor: item.operatorBrandColor }]}>
      <View style={styles.stackSummary}>
        <Text style={[styles.stackRouteTitle, { color: item.operatorTextColor }]} numberOfLines={1}>
          {valueOrFallback(item.routeLabel, item.operatorName)}
        </Text>
        <Text style={[styles.stackMeta, { color: item.operatorTextColor }]} numberOfLines={1}>
          {item.departureTime ? `${formatShortDate(item.departureTime)} • ${formatDateTime(item.departureTime)}` : valueOrFallback(item.stopName, 'Saved locally')}
        </Text>
      </View>
      <View style={styles.stackBottomRow}>
        <TransportOperatorLogo item={item} size={36} />
        <MaterialIcons name={item.serviceIcon} size={24} color={item.operatorTextColor} />
      </View>
    </View>
  );
}

function TopCardBody({ item, clicked, onOpen }: { item: TransportItem; clicked: boolean; onOpen?: () => void }) {
  const summary = clickedSummaryLines(item);

  return (
    <View style={styles.topCardBody}>
      <View style={[styles.topHeaderBand, { backgroundColor: item.operatorBrandColor }]}>
        <View style={styles.topHeaderCopy}>
          <TransportOperatorLogo item={item} size={40} />
          <View style={styles.operatorCopy}>
            <Text style={[styles.operatorName, { color: item.operatorTextColor }]} numberOfLines={1}>
              {item.operatorName}
            </Text>
            <Text style={[styles.operatorService, { color: item.operatorTextColor }]} numberOfLines={1}>
              {serviceLabel(item)}
            </Text>
          </View>
        </View>
        <TransportStatusPill status={item.liveStatus} label={item.status} />
      </View>

      <View style={styles.whiteBody}>
        <Text style={styles.routeLabel} numberOfLines={1}>
          {item.routeLabel}
        </Text>
        <Text style={styles.routeCodeLine} numberOfLines={1}>
          {bodyRoute(item)}
        </Text>
        <View style={styles.primaryMetaRow}>
          <View style={styles.primaryMetaBlock}>
            <Text style={styles.primaryMetaLabel}>Date</Text>
            <Text style={styles.primaryMetaValue}>{item.departureTime ? formatShortDate(item.departureTime) : 'Date unavailable'}</Text>
          </View>
          <View style={styles.primaryMetaBlock}>
            <Text style={styles.primaryMetaLabel}>Departure</Text>
            <Text style={styles.primaryMetaValue}>{item.departureTime ? formatDateTime(item.departureTime) : 'Time unavailable'}</Text>
          </View>
        </View>

        {clicked ? (
          <View style={styles.clickedContainer}>
            <View style={styles.clickedGrid}>
              {summary.map((entry) => (
                <View key={entry.label} style={styles.clickedCell}>
                  <Text style={styles.clickedLabel}>{entry.label}</Text>
                  <Text style={styles.clickedValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.clickedFooter}>
              {item.liveNotice ? <Text style={styles.liveNotice}>{item.liveNotice}</Text> : <View />}
              {onOpen ? (
                <Pressable onPress={onOpen} style={({ pressed }) => [styles.openButton, pressed ? styles.openButtonPressed : null]}>
                  <Text style={styles.openButtonLabel}>Open details</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function TransportStackCard({ item, state, onPress, onOpen }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      {state === 'in_stack' ? <InStackCard item={item} /> : <TopCardBody item={item} clicked={state === 'clicked'} onOpen={onOpen} />}
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
  cardShell: {
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.card,
  },
  stackCard: {
    minHeight: 156,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  stackSummary: {
    gap: 8,
  },
  stackRouteTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  stackMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.92,
  },
  stackBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  topCardBody: {
    minHeight: 212,
    borderRadius: 22,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.card,
  },
  topHeaderBand: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.primaryBlueDark,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  operatorCopy: {
    flex: 1,
    gap: 4,
  },
  operatorName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  operatorService: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    opacity: 0.92,
  },
  whiteBody: {
    padding: 16,
    gap: 14,
  },
  routeLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  routeCodeLine: {
    color: '#131920',
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.8,
  },
  primaryMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryMetaBlock: {
    flex: 1,
    gap: 4,
  },
  primaryMetaLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  primaryMetaValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  clickedContainer: {
    gap: 14,
    paddingTop: 4,
  },
  clickedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  clickedCell: {
    minWidth: '47%',
    flexGrow: 1,
    gap: 4,
  },
  clickedLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  clickedValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  clickedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  liveNotice: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  openButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonPressed: {
    opacity: 0.9,
  },
  openButtonLabel: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
