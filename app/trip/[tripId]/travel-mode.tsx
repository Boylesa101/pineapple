import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/date';
import { maskSensitive, tripDateRange } from '@/utils/format';
import { getNextFlight, getTripBundle } from '@/utils/selectors';

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
  const hotel = bundle.hotelStays[0];
  const insuranceDocument = bundle.documents.find((document) => document.documentType === 'insurance');
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

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

  const travellerValues = useMemo(
    () =>
      bundle.travellers.flatMap((traveller) => [
        { label: `${traveller.fullName} passport`, value: traveller.passportNumber, sensitive: true },
        { label: `${traveller.fullName} GHIC / EHIC`, value: traveller.ghicNumber, sensitive: true },
      ]),
    [bundle.travellers]
  );

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
    <AppScreen title="Travel Mode" subtitle="High-contrast, one-hand access for airports, hotels, taxis, and emergencies.">
      <AppCard>
        <Text style={styles.tripName}>{bundle.trip.name}</Text>
        <Text style={styles.subline}>{bundle.trip.destination}</Text>
        <Text style={styles.subline}>{tripDateRange(bundle.trip.startDate, bundle.trip.endDate)}</Text>
        <View style={styles.buttonRow}>
          <AppButton label={revealed ? 'Hide sensitive values' : 'Reveal sensitive values'} onPress={() => { setRevealed((current) => !current); setSecondsLeft(0); }} />
          <AppButton label={secondsLeft ? `Visible for ${secondsLeft}s` : 'Show for 30 sec'} tone="secondary" onPress={() => { setRevealed(true); setSecondsLeft(30); }} />
        </View>
      </AppCard>

      <AppCard title="Travellers">
        {bundle.travellers.map((traveller) => (
          <Text key={traveller.id} style={styles.subline}>{traveller.fullName}</Text>
        ))}
      </AppCard>

      {travellerValues.map((item) => (
        <ValueCard key={item.label} label={item.label} value={item.value} sensitive={item.sensitive} revealed={revealed} />
      ))}

      <ValueCard label="Insurance policy" value={insuranceDocument?.documentNumber || ''} sensitive revealed={revealed} />
      <ValueCard label="Insurer emergency" value={bundle.emergencyInfo?.insurerEmergencyNumber || ''} revealed />
      <ValueCard label="Emergency contacts" value={bundle.emergencyInfo?.emergencyContacts || ''} revealed />

      <AppCard title="Next flight">
        <Text style={styles.subline}>{nextFlight ? `${nextFlight.airline} ${nextFlight.flightNumber}` : 'No upcoming flight saved'}</Text>
        {nextFlight ? (
          <>
            <Text style={styles.subline}>{nextFlight.departureAirport} → {nextFlight.arrivalAirport}</Text>
            <Text style={styles.subline}>{formatDateTime(nextFlight.departureTime)}</Text>
            <ValueCard label="Booking ref" value={nextFlight.bookingRef} sensitive={false} revealed />
            <ValueCard label="Terminal / gate" value={`${nextFlight.terminal || 'TBC'} / ${nextFlight.gate || 'TBC'}`} revealed />
          </>
        ) : null}
      </AppCard>

      <AppCard title="Hotel">
        <Text style={styles.subline}>{hotel?.hotelName || 'No hotel saved'}</Text>
        {hotel ? (
          <>
            <ValueCard label="Address" value={hotel.address} revealed />
            <ValueCard label="Phone" value={hotel.phone} revealed />
            <ValueCard label="Booking ref" value={hotel.bookingRef} revealed />
          </>
        ) : null}
      </AppCard>

      <AppCard title="Emergency notes">
        <Text style={styles.subline}>{bundle.emergencyInfo?.localEmergencyNote || 'No local emergency note saved.'}</Text>
        <Text style={styles.subline}>{bundle.emergencyInfo?.embassyConsulateNote || 'No embassy / consulate note saved.'}</Text>
        <Text style={styles.subline}>{bundle.emergencyInfo?.travellerMedicalNote || 'No traveller medical note saved.'}</Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tripName: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
  },
  subline: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  buttonRow: {
    gap: spacing.sm,
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
