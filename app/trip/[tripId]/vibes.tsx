import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
import { fetchTripVibes, hasTripadvisorKey, type VibeCategory, type VibeItem } from '@/services/tripadvisorVibesService';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';
import { toUserMessage } from '@/utils/userErrors';

const sectionTitles: Record<VibeCategory, { title: string; subtitle: string }> = {
  eat: { title: 'Top 5 places to eat', subtitle: 'Tripadvisor restaurant picks for this area.' },
  visit: { title: 'Top 5 places to visit', subtitle: 'Landmarks and standout places nearby.' },
  do: { title: 'Top 5 things to do', subtitle: 'Activities and popular local experiences.' },
};

export default function TripVibesScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data, setActiveTrip, saveItineraryEvent } = useAppStore();
  const bundle = useMemo(() => getTripBundle(data, tripId), [data, tripId]);
  const trip = bundle.trip;
  const primaryHotel = bundle.hotelStays[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vibes, setVibes] = useState<{ eat: VibeItem[]; visit: VibeItem[]; do: VibeItem[] } | null>(null);

  useEffect(() => {
    if (!trip) {
      setLoading(false);
      return;
    }

    if (!hasTripadvisorKey()) {
      setError('Add EXPO_PUBLIC_TRIPADVISOR_API_KEY to enable live Vibes suggestions from Tripadvisor.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchTripVibes({
      destination: trip.destination,
      hotelCity: primaryHotel?.city ?? null,
      hotelCountry: primaryHotel?.country ?? null,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setVibes({ eat: result.eat, visit: result.visit, do: result.do });
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }
        setError(toUserMessage(fetchError, 'Unable to load live area suggestions right now.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [primaryHotel?.city, primaryHotel?.country, trip]);

  if (!trip) {
    return (
      <AppScreen title="Vibes">
        <AppCard>
          <EmptyState title="Trip not found" description="Go back to the trip and try again." />
          <AppButton label="Back to trips" onPress={() => router.replace('/trips')} />
        </AppCard>
      </AppScreen>
    );
  }

  async function addToItinerary(item: VibeItem) {
    if (!trip) {
      return;
    }
    const slot = new Date(trip.startDate);
    if (Number.isNaN(slot.getTime())) {
      slot.setTime(Date.now());
    }
    slot.setHours(item.category === 'eat' ? 19 : 10, 0, 0, 0);

    await saveItineraryEvent({
      tripId,
      title: item.name,
      type: item.category === 'eat' ? 'meal' : 'excursion',
      dateTime: slot.toISOString(),
      location: item.address,
      confirmationNumber: '',
      notes: `Added from Vibes · Source: Tripadvisor${item.webUrl ? ` · ${item.webUrl}` : ''}`,
    });

    Alert.alert('Added to itinerary', `${item.name} was added to your itinerary for this trip.`);
  }

  return (
    <AppScreen
      title="Vibes"
      subtitle={`Top places to eat, visit, and do around ${trip.destination}.`}
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
      <AppCard>
        <Text style={styles.lead}>
          Live area picks powered by Tripadvisor. These suggestions are fetched live when the page opens and are not cached locally.
        </Text>
      </AppCard>

      {loading ? (
        <AppCard>
          <EmptyState title="Loading vibes" description="Finding the best nearby places to eat, visit, and do." />
        </AppCard>
      ) : null}

      {!loading && error ? (
        <AppCard>
          <EmptyState title="Vibes unavailable" description={error} />
        </AppCard>
      ) : null}

      {!loading && !error && vibes ? (
        (Object.keys(sectionTitles) as VibeCategory[]).map((category) => {
          const items = vibes[category];
          const section = sectionTitles[category];

          return (
            <AppCard key={category} title={section.title} subtitle={section.subtitle}>
              {items.length ? (
                items.map((item) => (
                  <View key={`${category}-${item.id}`} style={styles.vibeRow}>
                    <View style={styles.vibeCopy}>
                      <Text style={styles.vibeTitle}>{item.name}</Text>
                      <Text style={styles.vibeMeta}>{item.address}</Text>
                      {item.rating || item.ranking ? (
                        <Text style={styles.vibeMeta}>
                          {[item.rating ? `Rating ${item.rating}` : null, item.ranking].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.vibeActions}>
                      <AppButton label="Add to itinerary" tone="secondary" onPress={() => void addToItinerary(item)} />
                      {item.webUrl ? (
                        <Pressable
                          onPress={() => {
                            void Linking.openURL(item.webUrl as string).catch(() => undefined);
                          }}
                          style={styles.inlineLink}
                        >
                          <MaterialIcons name="open-in-new" size={16} color={colors.primaryBlue} />
                          <Text style={styles.inlineLinkLabel}>Open</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState title="No live picks found" description="Try again later or use the itinerary to add your own places." />
              )}
            </AppCard>
          );
        })
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  vibeRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primaryBlueBorder,
  },
  vibeCopy: {
    gap: 4,
  },
  vibeTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  vibeMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  vibeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  inlineLinkLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
