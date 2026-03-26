import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';
import { VibesExperience } from '@/components/vibes/VibesExperience';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

export default function TripVibesScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data, setActiveTrip } = useAppStore();
  const bundle = useMemo(() => getTripBundle(data, tripId), [data, tripId]);
  const trip = bundle.trip;

  if (!trip) {
    return (
      <AppScreen title="Vibes">
        <AppCard>
          <VibesEmptyState icon="map" title="Trip not found" description="Go back to the trip and try again." />
          <AppButton label="Back to trips" onPress={() => router.replace('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Vibes"
      subtitle={`Live swipe deck and saved Mood for ${trip.destination}.`}
      footer={
        <AppButton
          label="Back to trip"
          tone="secondary"
          onPress={() => {
            setActiveTrip(tripId);
            router.push({ pathname: '/trip/[tripId]', params: { tripId } });
          }}
        />
      }
    >
      <VibesExperience tripId={trip.id} />
    </AppScreen>
  );
}
