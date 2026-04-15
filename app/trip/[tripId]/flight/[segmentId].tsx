import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';

export default function FlightBoardingPassRoute() {
  const { tripId, segmentId } = useLocalSearchParams<{ tripId: string; segmentId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!tripId || !segmentId) {
      return;
    }

    router.replace({
      pathname: '/trip/[tripId]/transport/[itemId]',
      params: { tripId, itemId: `airline-${segmentId}` },
    });
  }, [router, segmentId, tripId]);

  return (
    <AppScreen title="Boarding pass">
      <AppCard>
        <EmptyState title="Opening boarding pass" description="Pineapple is loading the shared transport detail view." />
      </AppCard>
    </AppScreen>
  );
}
