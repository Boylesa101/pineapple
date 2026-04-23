import { useEffect, useState } from 'react';

import { TransportStackSection } from '@/components/transport-stack';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { getTransportItems, type TransportItem } from '@/services/transport';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';
import { useLocalSearchParams } from 'expo-router';

export default function TripFlightsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const [items, setItems] = useState<TransportItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void getTransportItems({
      travelSegments: bundle.travelSegments,
      hotelStays: bundle.hotelStays,
      documents: bundle.documents,
      travellers: bundle.travellers,
    }).then((nextItems) => {
      if (!cancelled) {
        setItems(nextItems.filter((item) => item.type === 'airline'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bundle.documents, bundle.hotelStays, bundle.travelSegments, bundle.travellers]);

  if (!bundle.trip) {
    return (
      <AppScreen title="Flights">
        <AppCard>
          <EmptyState title="Trip not found" description="This trip is no longer available." />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Flights" subtitle="Airline cards in the shared transport stack system.">
      {items.length ? (
        <TransportStackSection tripId={tripId} items={items} />
      ) : (
        <AppCard>
          <EmptyState title="No flights saved" description="Add a flight segment to open the airline transport stack for this trip." />
        </AppCard>
      )}
    </AppScreen>
  );
}
