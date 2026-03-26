import { useMemo } from 'react';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';
import { VibesExperience } from '@/components/vibes/VibesExperience';
import { useAppStore } from '@/store/useAppStore';
import { filterVisibleTrips } from '@/utils/tripVisibility';

export default function VibeTabScreen() {
  const router = useRouter();
  const { data, activeTripId, setActiveTrip } = useAppStore();
  const visibleTrips = useMemo(() => filterVisibleTrips(data.trips), [data.trips]);
  const trip = useMemo(() => {
    if (activeTripId && visibleTrips.some((item) => item.id === activeTripId)) {
      return visibleTrips.find((item) => item.id === activeTripId) ?? null;
    }

    return [...visibleTrips].sort((left, right) => left.startDate.localeCompare(right.startDate))[0] ?? null;
  }, [activeTripId, visibleTrips]);

  if (!trip) {
    return (
      <AppScreen title="Vibe" subtitle="Save a trip first to unlock live destination inspiration.">
        <AppCard>
          <VibesEmptyState
            icon="travel-explore"
            title="No trip yet"
            description="Create a trip first, then Pineapple can pull live Tripadvisor suggestions into the swipe deck."
          />
          <AppButton label="Create a trip" onPress={() => router.push('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Vibe"
      subtitle={`Swipe through live places around ${trip.destination}, then save the best ones into Mood.`}
      footer={
        <AppButton
          label="Open current trip"
          tone="secondary"
          onPress={() => {
            setActiveTrip(trip.id);
            router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id } });
          }}
        />
      }
    >
      <VibesExperience tripId={trip.id} />
    </AppScreen>
  );
}
