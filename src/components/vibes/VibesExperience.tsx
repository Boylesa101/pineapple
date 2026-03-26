import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { VibeSwipeDeck } from '@/components/vibes/VibeSwipeDeck';
import { MoodSavedCard } from '@/components/vibes/MoodSavedCard';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';
import { colors, radii, spacing } from '@/constants/theme';
import {
  buildVibeQueryKey,
  fetchTripVibes,
  getVibesBaseUrl,
  parseTripVibes,
  serializeTripVibes,
  type TripVibesResult,
  type VibeItem,
} from '@/services/tripadvisorVibesService';
import { buildVibeItineraryDraft } from '@/services/vibesPlanner';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';
import { createId } from '@/utils/ids';
import { toUserMessage } from '@/utils/userErrors';
import type { SavedVibe, Trip } from '@/types/models';

type Props = {
  tripId: string | null | undefined;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function formatFetchedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function toSavedVibeDraft(trip: Trip, item: VibeItem) {
  const timestamp = new Date().toISOString();
  return {
    id: createId('mood'),
    tripId: trip.id,
    source: 'tripadvisor' as const,
    sourceItemId: item.id,
    name: item.name,
    category: item.category,
    displayCategory: item.displayCategory,
    address: item.address,
    rating: item.rating,
    ranking: item.ranking,
    tripadvisorUrl: item.tripadvisorUrl,
    websiteUrl: item.websiteUrl,
    imageUrl: item.imageUrl,
    savedAt: timestamp,
  };
}

function toVibeItem(saved: SavedVibe): VibeItem {
  return {
    id: saved.sourceItemId,
    name: saved.name,
    category: saved.category,
    displayCategory: saved.displayCategory,
    address: saved.address,
    rating: saved.rating,
    ranking: saved.ranking,
    tripadvisorUrl: saved.tripadvisorUrl,
    websiteUrl: saved.websiteUrl,
    imageUrl: saved.imageUrl,
  };
}

export function VibesExperience({ tripId }: Props) {
  const { data, saveItineraryEvent, saveSavedVibe, saveVibeCacheEntry, deleteRecord } = useAppStore();
  const bundle = useMemo(() => getTripBundle(data, tripId), [data, tripId]);
  const trip = bundle.trip;
  const primaryHotel = bundle.hotelStays[0] ?? null;
  const [mode, setMode] = useState<'vibe' | 'mood'>('vibe');
  const [loading, setLoading] = useState(Boolean(trip));
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TripVibesResult | null>(null);
  const [deckResetKey, setDeckResetKey] = useState('idle');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const fallbackImageUri = useMemo(
    () => trip?.destinationImageLocalPath ?? trip?.coverImageUri ?? trip?.destinationImageRemoteUrl ?? trip?.heroImageRemoteUrl ?? null,
    [trip]
  );

  const queryInput = useMemo(
    () =>
      trip
        ? {
            destination: trip.destination,
            hotelCity: primaryHotel?.city ?? null,
            hotelCountry: primaryHotel?.country ?? null,
          }
        : null,
    [primaryHotel?.city, primaryHotel?.country, trip]
  );

  const cacheKey = useMemo(
    () => (trip && queryInput ? buildVibeQueryKey({ tripId: trip.id, ...queryInput }) : null),
    [queryInput, trip]
  );
  const cachedEntry = useMemo(
    () => bundle.vibeCacheEntries.find((entry) => entry.queryKey === cacheKey) ?? null,
    [bundle.vibeCacheEntries, cacheKey]
  );
  const cachedResult = useMemo(
    () => (cachedEntry ? parseTripVibes(cachedEntry.payloadJson) : null),
    [cachedEntry]
  );
  const isCachedFresh = useMemo(
    () =>
      cachedEntry?.expiresAt && !Number.isNaN(new Date(cachedEntry.expiresAt).getTime())
        ? new Date(cachedEntry.expiresAt).getTime() > Date.now()
        : false,
    [cachedEntry]
  );

  const savedMoodItems = useMemo(
    () => [...bundle.savedVibes].sort((left, right) => right.savedAt.localeCompare(left.savedAt)),
    [bundle.savedVibes]
  );

  useEffect(() => {
    if (!trip || !queryInput || !cacheKey) {
      setLoading(false);
      setResult(null);
      setError(null);
      setStatusMessage(null);
      setDeckResetKey('idle');
      return;
    }

    let cancelled = false;
    setError(null);
    setLoading(true);

    if (cachedResult) {
      setResult(cachedResult);
      setDeckResetKey(`${cacheKey}:${cachedResult.fetchedAt}`);
      setStatusMessage(
        isCachedFresh
          ? `Ready from saved live picks${formatFetchedAt(cachedResult.fetchedAt) ? ` · ${formatFetchedAt(cachedResult.fetchedAt)}` : ''}`
          : `Showing an earlier live pass${formatFetchedAt(cachedResult.fetchedAt) ? ` · ${formatFetchedAt(cachedResult.fetchedAt)}` : ''}`
      );
    } else {
      setResult(null);
      setStatusMessage(null);
    }

    void fetchTripVibes(queryInput)
      .then(async (liveResult) => {
        if (cancelled) {
          return;
        }

        setResult(liveResult);
        setDeckResetKey(`${cacheKey}:${liveResult.fetchedAt}`);
        setStatusMessage(`Live now via Tripadvisor${formatFetchedAt(liveResult.fetchedAt) ? ` · ${formatFetchedAt(liveResult.fetchedAt)}` : ''}`);

        await saveVibeCacheEntry({
          tripId: trip.id,
          queryKey: cacheKey,
          areaLabel: liveResult.area,
          source: 'tripadvisor',
          payloadJson: serializeTripVibes({
            area: liveResult.area,
            fetchedAt: liveResult.fetchedAt,
            source: liveResult.source,
            eat: liveResult.eat,
            drink: liveResult.drink,
            visit: liveResult.visit,
            do: liveResult.do,
          }),
          fetchedAt: liveResult.fetchedAt,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        });
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }

        if (cachedResult) {
          setStatusMessage('Showing saved live picks while Pineapple cannot reach Tripadvisor right now.');
          setError(null);
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
  }, [
    cacheKey,
    queryInput?.destination,
    queryInput?.hotelCity,
    queryInput?.hotelCountry,
    refreshNonce,
    saveVibeCacheEntry,
    trip?.destination,
    trip?.id,
  ]);

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', 'Pineapple could not open that link on this device.');
    }
  }

  async function addMoodToItinerary(item: SavedVibe) {
    if (!trip) {
      return;
    }

    await saveItineraryEvent(buildVibeItineraryDraft(trip, toVibeItem(item)));
    Alert.alert('Added to itinerary', `${item.name} was added to your itinerary for this trip.`);
  }

  async function saveToMood(item: VibeItem) {
    if (!trip) {
      return;
    }

    await saveSavedVibe(toSavedVibeDraft(trip, item));
  }

  function refreshLivePicks() {
    setStatusMessage('Refreshing live picks...');
    setRefreshNonce((value) => value + 1);
  }

  const deckItems = (result?.items ?? []).map((item) => ({
    ...item,
    imageUri: item.imageUrl ?? fallbackImageUri,
  }));

  return (
    <View style={styles.wrap}>
      <AppCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Vibe for {trip?.destination ?? 'your trip'}</Text>
            <Text style={styles.heroText}>
              Swipe through live places to eat, drink, and explore. Right-swipes land in Mood so you can shortlist places and add them to the itinerary later.
            </Text>
          </View>
          <View style={styles.sourcePill}>
            <MaterialIcons name="cloud-done" size={16} color={colors.primaryBlue} />
            <Text style={styles.sourcePillLabel}>Cloudflare + Tripadvisor</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Source endpoint: {getVibesBaseUrl()}/api/vibes</Text>
          {statusMessage ? <Text style={styles.metaText}>{statusMessage}</Text> : null}
        </View>
      </AppCard>

      <View style={styles.segmentedWrap}>
        <Pressable onPress={() => setMode('vibe')} style={[styles.segmentButton, mode === 'vibe' ? styles.segmentButtonActive : null]}>
          <Text style={[styles.segmentLabel, mode === 'vibe' ? styles.segmentLabelActive : null]}>Vibe</Text>
        </Pressable>
        <Pressable onPress={() => setMode('mood')} style={[styles.segmentButton, mode === 'mood' ? styles.segmentButtonActive : null]}>
          <Text style={[styles.segmentLabel, mode === 'mood' ? styles.segmentLabelActive : null]}>Mood ({savedMoodItems.length})</Text>
        </Pressable>
      </View>

      {mode === 'vibe' ? (
        <View style={styles.sectionWrap}>
          {loading && !result ? (
            <AppCard>
              <VibesEmptyState icon="travel-explore" title="Loading live vibes" description="Pulling fresh Tripadvisor picks for this destination." />
            </AppCard>
          ) : null}

          {!loading && error ? (
            <AppCard>
              <VibesEmptyState icon="sentiment-dissatisfied" title="Vibe unavailable" description={error} />
            </AppCard>
          ) : null}

          {!error && result ? (
            result.items.length ? (
              <>
              <AppCard style={styles.deckCard}>
                <Text style={styles.deckTitle}>Swipe right to save, left to pass</Text>
                <Text style={styles.deckSubtitle}>Cards blend the live eat, drink, visit, and do lanes into one deck for {result.area}.</Text>
                <VibeSwipeDeck
                  items={deckItems}
                  resetKey={deckResetKey}
                  onSkip={() => undefined}
                  onSave={(item) => void saveToMood(item)}
                  onOpen={(url) => void openUrl(url)}
                  onRefresh={refreshLivePicks}
                />
              </AppCard>

              <AppCard title="Live lanes" subtitle="Pineapple keeps the source buckets visible behind the swipe deck.">
                <View style={styles.laneGrid}>
                  <View style={styles.lanePill}>
                    <Text style={styles.laneCount}>{result.eat.length}</Text>
                    <Text style={styles.laneLabel}>Eat</Text>
                  </View>
                  <View style={styles.lanePill}>
                    <Text style={styles.laneCount}>{result.drink.length}</Text>
                    <Text style={styles.laneLabel}>Drink</Text>
                  </View>
                  <View style={styles.lanePill}>
                    <Text style={styles.laneCount}>{result.visit.length}</Text>
                    <Text style={styles.laneLabel}>Visit</Text>
                  </View>
                  <View style={styles.lanePill}>
                    <Text style={styles.laneCount}>{result.do.length}</Text>
                    <Text style={styles.laneLabel}>Do</Text>
                  </View>
                </View>
              </AppCard>
              </>
            ) : (
              <AppCard>
                <VibesEmptyState
                  icon="travel-explore"
                  title="No live picks found"
                  description={`Tripadvisor did not return any clean eat, drink, visit, or do suggestions for ${result.area} right now.`}
                />
                <Pressable accessibilityLabel="Refresh live vibe picks" onPress={refreshLivePicks} style={styles.refreshInlineButton}>
                  <MaterialIcons name="refresh" size={18} color={colors.primaryBlue} />
                  <Text style={styles.refreshInlineLabel}>Try again</Text>
                </Pressable>
              </AppCard>
            )
          ) : null}
        </View>
      ) : (
        <View style={styles.sectionWrap}>
          {savedMoodItems.length ? (
            <ScrollView nestedScrollEnabled={false} scrollEnabled={false} contentContainerStyle={styles.moodList}>
              {savedMoodItems.map((item) => (
                <MoodSavedCard
                  key={item.id}
                  item={item}
                  fallbackImageUri={fallbackImageUri}
                  onOpen={(url) => void openUrl(url)}
                  onAddToItinerary={() => void addMoodToItinerary(item)}
                  onRemove={() => void deleteRecord('saved_vibes', item.id)}
                />
              ))}
            </ScrollView>
          ) : (
            <AppCard>
              <VibesEmptyState
                icon="favorite-border"
                title="Mood is empty"
                description="Save a place with a right-swipe and it will stay here for this trip, ready to review or add to the itinerary later."
              />
            </AppCard>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTop: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourcePillLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  metaRow: {
    gap: 4,
  },
  metaText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  segmentedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.white,
  },
  segmentLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  segmentLabelActive: {
    color: colors.primaryBlueText,
  },
  sectionWrap: {
    gap: spacing.md,
  },
  deckCard: {
    gap: spacing.md,
  },
  deckTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  deckSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  laneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  lanePill: {
    flex: 1,
    minWidth: '22%',
    borderRadius: radii.md,
    backgroundColor: colors.primaryBlueSurface,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  laneCount: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  laneLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  moodList: {
    gap: spacing.md,
  },
  refreshInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshInlineLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
