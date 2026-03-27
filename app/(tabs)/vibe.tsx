import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';
import { VibesExperience } from '@/components/vibes/VibesExperience';
import { useAppStore } from '@/store/useAppStore';
import { filterVisibleTrips } from '@/utils/tripVisibility';

export default function VibeTabScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { data, activeTripId } = useAppStore();
  const visibleTrips = useMemo(() => filterVisibleTrips(data.trips), [data.trips]);
  const trip = useMemo(() => {
    if (activeTripId && visibleTrips.some((item) => item.id === activeTripId)) {
      return visibleTrips.find((item) => item.id === activeTripId) ?? null;
    }

    return [...visibleTrips].sort((left, right) => left.startDate.localeCompare(right.startDate))[0] ?? null;
  }, [activeTripId, visibleTrips]);

  if (!trip) {
    return (
      <AppScreen title="Vibe">
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
    <AppScreen title="Vibe">
      <VibesExperience tripId={trip.id} mode={mode === 'mood' ? 'mood' : 'vibe'} />
    </AppScreen>
  );
}
