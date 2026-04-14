import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FlightStackCardCompact } from '@/components/flights/FlightStackCardCompact';
import { FlightStackCardLead } from '@/components/flights/FlightStackCardLead';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
import { getFlightRecords, type PineappleFlightRecord } from '@/services/flights';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

export default function TripFlightsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const [records, setRecords] = useState<PineappleFlightRecord[]>([]);

  const orderedSegments = useMemo(
    () =>
      [...bundle.travelSegments]
        .filter((segment) => segment.transportType === 'flight' || segment.transportType === 'private_flight')
        .sort((left, right) => Date.parse(left.departureTime) - Date.parse(right.departureTime)),
    [bundle.travelSegments]
  );

  useEffect(() => {
    let cancelled = false;

    void getFlightRecords(orderedSegments, bundle.documents).then((nextRecords) => {
      if (!cancelled) {
        setRecords(nextRecords);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bundle.documents, orderedSegments]);

  if (!bundle.trip) {
    return (
      <AppScreen title="Flights">
        <AppCard>
          <EmptyState title="Trip not found" description="This trip is no longer available." />
        </AppCard>
      </AppScreen>
    );
  }

  const leadRecord = records[0] ?? null;
  const compactRecords = leadRecord ? records.slice(1) : [];

  return (
    <AppScreen title="Flights" subtitle="Airline-branded cards and boarding passes for this trip.">
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      {leadRecord ? (
        <View style={styles.stack}>
          <FlightStackCardLead
            record={leadRecord}
            onPress={() =>
              router.push({ pathname: '/trip/[tripId]/flight/[segmentId]', params: { tripId, segmentId: leadRecord.travelSegment.id } })
            }
          />
          {compactRecords.map((record) => (
            <FlightStackCardCompact
              key={record.travelSegment.id}
              record={record}
              onPress={() =>
                router.push({ pathname: '/trip/[tripId]/flight/[segmentId]', params: { tripId, segmentId: record.travelSegment.id } })
              }
            />
          ))}
        </View>
      ) : (
        <AppCard>
          <EmptyState title="No flights saved" description="Add a flight segment to this trip to open the airline card stack." />
        </AppCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  stack: {
    gap: 16,
    paddingBottom: spacing.lg,
  },
});
