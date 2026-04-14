import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { FlightBoardingPassScreen } from '@/components/flights/FlightBoardingPassScreen';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { getFlightRecord, type PineappleFlightRecord } from '@/services/flights';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

export default function FlightBoardingPassRoute() {
  const { tripId, segmentId } = useLocalSearchParams<{ tripId: string; segmentId: string }>();
  const router = useRouter();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const segment = bundle.travelSegments.find((item) => item.id === segmentId) ?? null;
  const [record, setRecord] = useState<PineappleFlightRecord | null>(null);

  useEffect(() => {
    if (!segment) {
      setRecord(null);
      return;
    }

    let cancelled = false;
    void getFlightRecord(segment, bundle.documents).then((nextRecord) => {
      if (!cancelled) {
        setRecord(nextRecord);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bundle.documents, segment]);

  if (!segment) {
    return (
      <AppScreen title="Boarding pass">
        <AppCard>
          <EmptyState title="Flight not found" description="That flight segment is no longer available." />
        </AppCard>
      </AppScreen>
    );
  }

  if (!record) {
    return (
      <AppScreen title="Boarding pass">
        <AppCard>
          <EmptyState title="Loading flight" description="Pineapple is preparing the airline boarding-pass view." />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <FlightBoardingPassScreen
      record={record}
      onBack={() => router.back()}
      onShare={() => {
        const payload = record.barcodePayload || record.bookingReference;
        void Clipboard.setStringAsync(payload);
        Alert.alert('Copied', 'Pineapple copied the saved barcode payload or booking reference to the clipboard.');
      }}
      onMore={() =>
        Alert.alert(
          'Live flight data',
          record.providerSource === 'opensky'
            ? 'Live status is coming from OpenSky where available. Passenger-specific boarding details remain local import data.'
            : 'No live provider match was available for this pass, so Pineapple is showing your saved trip and boarding data only.'
        )
      }
    />
  );
}
