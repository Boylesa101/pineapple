import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TransportOpenSheet } from '@/components/transport-stack';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { getTransportItemById, type TransportItem } from '@/services/transport';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

export default function TransportItemRoute() {
  const { tripId, itemId } = useLocalSearchParams<{ tripId: string; itemId: string }>();
  const router = useRouter();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const [item, setItem] = useState<TransportItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getTransportItemById(
      {
        travelSegments: bundle.travelSegments,
        hotelStays: bundle.hotelStays,
        documents: bundle.documents,
        travellers: bundle.travellers,
      },
      itemId
    ).then((nextItem) => {
      if (!cancelled) {
        setItem(nextItem);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bundle.documents, bundle.hotelStays, bundle.travelSegments, bundle.travellers, itemId]);

  if (!bundle.trip) {
    return (
      <AppScreen title="Transport">
        <AppCard>
          <EmptyState title="Trip not found" description="This trip is no longer available." />
        </AppCard>
      </AppScreen>
    );
  }

  if (!item) {
    return (
      <AppScreen title="Transport">
        <AppCard>
          <EmptyState title="Loading transport card" description="Pineapple is preparing the saved transport details." />
        </AppCard>
      </AppScreen>
    );
  }

  return <TransportOpenSheet item={item} onBack={() => router.back()} />;
}
