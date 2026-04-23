import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { colors, spacing } from '@/constants/theme';
import { getTripDocumentWarningSummary } from '@/services/documentWarnings';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/date';
import { formatAirportDisplay } from '@/utils/airports';
import { getDocumentExpiryRelativeLabel } from '@/utils/documentExpiry';
import { maskSensitive, tripDateRange } from '@/utils/format';
import { getNextEvent, getNextFlight, getTripBundle, getUpcomingTimeline } from '@/utils/selectors';

function ValueCard({
  label,
  value,
  sensitive,
  revealed,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
  revealed: boolean;
}) {
  const visibleValue = sensitive && !revealed ? maskSensitive(value) : value || 'Not set';

  return (
    <View style={styles.valueCard}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueValue}>{visibleValue}</Text>
      {value ? (
        <Pressable onPress={() => Clipboard.setStringAsync(value)} style={styles.copyButton}>
          <MaterialIcons name="content-copy" size={18} color={colors.white} />
          <Text style={styles.copyLabel}>Copy</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function TravelModeScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const nextFlight = getNextFlight(data, tripId);
  const nextEvent = getNextEvent(data, tripId);
  const timeline = getUpcomingTimeline(data, tripId);
  const hotel = bundle.hotelStays[0];
  const insuranceDocument = bundle.documents.find((document) => document.documentType === 'insurance');
  const documentSummary = useMemo(() => getTripDocumentWarningSummary(bundle.documents, bundle.travellers), [bundle.documents, bundle.travellers]);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const pageWidth = width - 32;

  const views = useMemo(
    () => [
      { key: 'family', label: 'Family' },
      ...bundle.travellers.map((traveller) => ({ key: traveller.id, label: traveller.fullName.split(' ')[0] })),
    ],
    [bundle.travellers]
  );
  const [activeView, setActiveView] = useState(views[0]?.key ?? 'family');
  const todaysTimeline = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return timeline.filter((item) => item.dateTime.slice(0, 10) === today);
  }, [timeline]);
  const nextAction = useMemo(() => {
    if (nextFlight) {
      return {
        title: `${nextFlight.airline} ${nextFlight.flightNumber || ''}`.trim(),
        subtitle: `${nextFlight.departureAirport} to ${nextFlight.arrivalAirport}`,
        detail: formatDateTime(nextFlight.departureTime),
      };
    }
    if (hotel) {
      return {
        title: hotel.hotelName,
        subtitle: 'Hotel check-in / stay',
        detail: `${hotel.address} • ${formatDateTime(hotel.checkIn)}`,
      };
    }
    if (nextEvent) {
      return {
        title: nextEvent.title,
        subtitle: nextEvent.location || nextEvent.type,
        detail: formatDateTime(nextEvent.dateTime),
      };
    }
    return null;
  }, [hotel, nextEvent, nextFlight]);

  useEffect(() => {
    if (!secondsLeft) return;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setRevealed(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  function scrollToView(key: string) {
    const index = views.findIndex((view) => view.key === key);
    if (index < 0) return;
    setActiveView(key);
    scrollRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  }

  if (!bundle.trip) {
    return (
      <AppScreen title="Travel Mode">
        <AppCard>
          <Text style={styles.empty}>This trip is no longer available.</Text>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Travel Mode" subtitle="Quick access for airports, hotels, taxis, and family emergencies.">
      <AppCard>
        <Text style={styles.tripName}>{bundle.trip.name}</Text>
        <Text style={styles.subline}>{bundle.trip.destination}</Text>
        <Text style={styles.subline}>{tripDateRange(bundle.trip.startDate, bundle.trip.endDate)}</Text>
        <View style={styles.buttonRow}>
          <AppButton
            label={revealed ? 'Hide sensitive values' : 'Reveal sensitive values'}
            onPress={() => {
              setRevealed((current) => !current);
              setSecondsLeft(0);
            }}
          />
          <AppButton
            label={secondsLeft ? `Visible for ${secondsLeft}s` : 'Show for 30 sec'}
            tone="secondary"
            onPress={() => {
              setRevealed(true);
              setSecondsLeft(30);
            }}
          />
        </View>
      </AppCard>

      {(documentSummary.expiredCount || documentSummary.expiringCount) ? (
        <AppCard title="Document warning" subtitle="Travel Mode never blocks access, but key travel documents need attention.">
          {documentSummary.warningItems.slice(0, 2).map((item) => (
            <Text key={item.document.id} style={styles.smallText}>
              {item.ownerLabel} • {getDocumentExpiryRelativeLabel(item.document.expiryDate)}
            </Text>
          ))}
        </AppCard>
      ) : null}

      {nextAction ? (
        <AppCard title="Next action" subtitle="Fastest thing to do next while you move.">
          <Text style={styles.tripNameSmall}>{nextAction.title}</Text>
          <Text style={styles.subline}>{nextAction.subtitle}</Text>
          <Text style={styles.smallText}>{nextAction.detail}</Text>
        </AppCard>
      ) : null}

      <AppCard title="Today's timeline" subtitle="Important moments for today only.">
        {todaysTimeline.length ? (
          todaysTimeline.map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.familyCopy}>
                <Text style={styles.subline}>{item.title}</Text>
                <Text style={styles.smallText}>{formatDateTime(item.dateTime)} • {item.subtitle}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.smallText}>No same-day timeline items yet. Upcoming events appear here automatically.</Text>
        )}
      </AppCard>

      <ChoiceChips<string>
        value={activeView}
        onChange={scrollToView}
        options={views.map((view) => ({ label: view.label, value: view.key }))}
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          setActiveView(views[index]?.key ?? 'family');
        }}
      >
        <View style={[styles.page, { width: pageWidth }]}>
          <AppCard title="Family overview">
            <View style={styles.familyList}>
              {bundle.travellers.map((traveller) => (
                <View key={traveller.id} style={styles.familyRow}>
                  <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} size={36} />
                  <View style={styles.familyCopy}>
                    <Text style={styles.subline}>{traveller.fullName}</Text>
                    <Text style={styles.smallText}>
                      Passport {revealed ? traveller.passportNumber || 'Not set' : maskSensitive(traveller.passportNumber)}
                    </Text>
                    <Text style={styles.smallText}>
                      GHIC / EHIC {revealed ? traveller.ghicNumber || 'Not set' : maskSensitive(traveller.ghicNumber)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </AppCard>
          <ValueCard label="Insurance policy" value={insuranceDocument?.documentNumber || ''} sensitive revealed={revealed} />
          <ValueCard label="Insurer emergency" value={bundle.emergencyInfo?.insurerEmergencyNumber || ''} revealed />
          <ValueCard label="Police" value={bundle.emergencyInfo?.policePhone || ''} revealed />
          <ValueCard label="Emergency contacts" value={bundle.emergencyInfo?.emergencyContacts || ''} revealed />
          <AppCard title="Shared travel refs">
            <Text style={styles.subline}>{nextFlight ? `${nextFlight.airline} ${nextFlight.flightNumber}` : 'No upcoming flight saved'}</Text>
            {nextFlight ? (
              <>
                <Text style={styles.smallText}>
                  {formatAirportDisplay(nextFlight.departureAirport, nextFlight.departureAirportCode)} →{' '}
                  {formatAirportDisplay(nextFlight.arrivalAirport, nextFlight.arrivalAirportCode)}
                </Text>
                <Text style={styles.smallText}>{formatDateTime(nextFlight.departureTime)}</Text>
                <ValueCard label="Booking ref" value={nextFlight.bookingRef} revealed />
              </>
            ) : null}
            {hotel ? (
              <>
                <Text style={styles.subline}>{hotel.hotelName}</Text>
                <Text style={styles.smallText}>{hotel.address}</Text>
                <ValueCard label="Hotel phone" value={hotel.phone} revealed />
              </>
            ) : null}
            {nextEvent ? <Text style={styles.smallText}>Next important event: {nextEvent.title} • {formatDateTime(nextEvent.dateTime)}</Text> : null}
          </AppCard>
          <AppCard title="Emergency notes">
            <Text style={styles.smallText}>{bundle.emergencyInfo?.localEmergencyNote || 'No local emergency note saved.'}</Text>
            <Text style={styles.smallText}>{bundle.emergencyInfo?.embassyConsulateNote || 'No embassy / consulate note saved.'}</Text>
            <Text style={styles.smallText}>{bundle.emergencyInfo?.hospitalContact || 'No hospital / clinic contact saved.'}</Text>
            <Text style={styles.smallText}>{bundle.emergencyInfo?.pharmacyContact || 'No pharmacy contact saved.'}</Text>
          </AppCard>
        </View>

        {bundle.travellers.map((traveller) => (
          <View key={traveller.id} style={[styles.page, { width: pageWidth }]}>
            <AppCard>
              <View style={styles.familyRow}>
                <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} size={48} />
                <View style={styles.familyCopy}>
                  <Text style={styles.tripName}>{traveller.fullName}</Text>
                  <Text style={styles.smallText}>{traveller.relationshipType}</Text>
                </View>
              </View>
            </AppCard>
            <ValueCard label="Passport number" value={traveller.passportNumber} sensitive revealed={revealed} />
            <ValueCard label="GHIC / EHIC number" value={traveller.ghicNumber} sensitive revealed={revealed} />
            <ValueCard label="Medical note" value={traveller.medicalNote} revealed />
            <AppCard title="Shared refs">
              <ValueCard label="Insurance policy" value={insuranceDocument?.documentNumber || ''} sensitive revealed={revealed} />
              <ValueCard label="Next flight ref" value={nextFlight?.bookingRef || ''} revealed />
              <ValueCard label="Hotel ref" value={hotel?.bookingRef || ''} revealed />
              {nextEvent ? <Text style={styles.smallText}>Next event: {nextEvent.title} • {formatDateTime(nextEvent.dateTime)}</Text> : null}
            </AppCard>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tripName: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  tripNameSmall: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
  subline: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  smallText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  page: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  familyList: {
    gap: spacing.sm,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineDot: {
    marginTop: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.pineappleGold,
  },
  familyCopy: {
    flex: 1,
    gap: 2,
  },
  valueCard: {
    backgroundColor: colors.nightNavy,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  valueLabel: {
    color: '#C9D8E5',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  valueValue: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  copyLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
