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
  interleaveVibeItems,
  parseTripVibes,
  serializeTripVibes,
  type TripVibesResult,
  type VibeItem,
} from '@/services/tripadvisorVibesService';
import { cacheVibeImage, cacheVibeItemsImages } from '@/services/vibeImageCache';
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

const CATEGORY_SUMMARY: Array<{ key: 'eat' | 'drink' | 'visit' | 'do'; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'eat', label: 'Eat', icon: 'restaurant' as const },
  { key: 'drink', label: 'Drink', icon: 'local-bar' as const },
  { key: 'visit', label: 'See', icon: 'photo-camera' as const },
  { key: 'do', label: 'Do', icon: 'explore' as const },
];

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

async function hydrateTripVibesImages(input: TripVibesResult): Promise<TripVibesResult> {
  const [eat, drink, visit, doItems] = await Promise.all([
    cacheVibeItemsImages(input.eat),
    cacheVibeItemsImages(input.drink),
    cacheVibeItemsImages(input.visit),
    cacheVibeItemsImages(input.do),
  ]);

  return {
    ...input,
    eat,
    drink,
    visit,
    do: doItems,
    items: interleaveVibeItems({ eat, drink, visit, do: doItems }),
  };
}

export function VibesExperience({ tripId }: Props) {
  const { data, saveAppPreferences, saveItineraryEvent, saveSavedVibe, saveVibeCacheEntry, deleteRecord } = useAppStore();
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
  const [introDismissed, setIntroDismissed] = useState(false);

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
  const shouldShowIntro = Boolean(trip && !data.appPreferences.vibesIntroSeenAt && !introDismissed);

  useEffect(() => {
    let cancelled = false;

    const itemsNeedingLocalImages = savedMoodItems.filter((item) => item.imageUrl?.startsWith('http'));
    if (!itemsNeedingLocalImages.length) {
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      itemsNeedingLocalImages.map(async (item) => {
        const cachedImageUrl = await cacheVibeImage(item.imageUrl);
        if (!cachedImageUrl || cachedImageUrl === item.imageUrl || cancelled) {
          return;
        }

        await saveSavedVibe({
          ...item,
          imageUrl: cachedImageUrl,
          savedAt: item.savedAt,
        });
      })
    );

    return () => {
      cancelled = true;
    };
  }, [saveSavedVibe, savedMoodItems]);

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
          ? `Saved picks ready${formatFetchedAt(cachedResult.fetchedAt) ? ` · updated ${formatFetchedAt(cachedResult.fetchedAt)}` : ''}`
          : `Showing saved picks${formatFetchedAt(cachedResult.fetchedAt) ? ` · last refresh ${formatFetchedAt(cachedResult.fetchedAt)}` : ''}`
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

        const hydratedResult = await hydrateTripVibesImages(liveResult);
        if (cancelled) {
          return;
        }

        setResult(hydratedResult);
        setDeckResetKey(`${cacheKey}:${hydratedResult.fetchedAt}`);
        setStatusMessage(`Live now${formatFetchedAt(hydratedResult.fetchedAt) ? ` · refreshed ${formatFetchedAt(hydratedResult.fetchedAt)}` : ''}`);

        await saveVibeCacheEntry({
          tripId: trip.id,
          queryKey: cacheKey,
          areaLabel: hydratedResult.area,
          source: 'tripadvisor',
          payloadJson: serializeTripVibes({
            area: hydratedResult.area,
            fetchedAt: hydratedResult.fetchedAt,
            source: hydratedResult.source,
            eat: hydratedResult.eat,
            drink: hydratedResult.drink,
            visit: hydratedResult.visit,
            do: hydratedResult.do,
          }),
          fetchedAt: hydratedResult.fetchedAt,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        });
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }

        if (cachedResult) {
          setStatusMessage('Showing saved picks while live suggestions are unavailable.');
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

  async function dismissIntro() {
    setIntroDismissed(true);
    if (data.appPreferences.vibesIntroSeenAt) {
      return;
    }

    await saveAppPreferences({
      vibesIntroSeenAt: new Date().toISOString(),
    });
  }

  function refreshLivePicks() {
    setStatusMessage('Refreshing live picks...');
    setRefreshNonce((value) => value + 1);
  }

  const deckItems = (result?.items ?? []).map((item) => ({
    ...item,
    imageUri: item.imageUrl ?? null,
  }));

  return (
    <View style={styles.wrap}>
      <AppCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Vibe</Text>
            <Text style={styles.heroTitle}>Build the feel of {trip?.destination ?? 'your trip'}</Text>
            <Text style={styles.heroText}>
              Find popular places, see what people are doing, and save the best ideas into Mood for later.
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Swipe right to save. Swipe left to keep moving.</Text>
          {statusMessage ? <Text style={styles.metaText}>{statusMessage}</Text> : null}
        </View>
      </AppCard>

      {shouldShowIntro ? (
        <AppCard style={styles.introCard}>
          <View style={styles.introHeader}>
            <View style={styles.introIcon}>
              <MaterialIcons name="travel-explore" size={24} color={colors.white} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>Start with a few swipes</Text>
              <Text style={styles.introText}>Vibe helps you explore the trip before you commit anything to the plan.</Text>
            </View>
          </View>
          <View style={styles.introPoints}>
            <View style={styles.introPoint}>
              <MaterialIcons name="restaurant" size={16} color={colors.primaryBlue} />
              <Text style={styles.introPointText}>Find popular places to eat, drink, see, and do.</Text>
            </View>
            <View style={styles.introPoint}>
              <MaterialIcons name="favorite" size={16} color={colors.primaryBlue} />
              <Text style={styles.introPointText}>Right-swipe anything worth saving into Mood.</Text>
            </View>
            <View style={styles.introPoint}>
              <MaterialIcons name="event-available" size={16} color={colors.primaryBlue} />
              <Text style={styles.introPointText}>Add saved places to the itinerary when you are ready.</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Start using Vibe" onPress={() => void dismissIntro()} style={styles.introButton}>
            <Text style={styles.introButtonLabel}>Start swiping</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>
        </AppCard>
      ) : null}

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
                <View style={styles.deckHeader}>
                  <View>
                    <Text style={styles.deckTitle}>Swipe right to save, left to pass</Text>
                    <Text style={styles.deckSubtitle}>Live picks for {result.area}</Text>
                  </View>
                  <View style={styles.deckCountPill}>
                    <Text style={styles.deckCountLabel}>{result.items.length} places</Text>
                  </View>
                </View>
                <View style={styles.laneGrid}>
                  {CATEGORY_SUMMARY.map((lane) => (
                    <View key={lane.key} style={styles.lanePill}>
                      <MaterialIcons name={lane.icon} size={18} color={colors.primaryBlue} />
                      <Text style={styles.laneCount}>{result[lane.key].length}</Text>
                      <Text style={styles.laneLabel}>{lane.label}</Text>
                    </View>
                  ))}
                </View>
                <VibeSwipeDeck
                  items={deckItems}
                  resetKey={deckResetKey}
                  onSkip={() => undefined}
                  onSave={(item) => void saveToMood(item)}
                  onOpen={(url) => void openUrl(url)}
                  onRefresh={refreshLivePicks}
                />
              </AppCard>
              </>
            ) : (
              <AppCard>
                <VibesEmptyState
                  icon="travel-explore"
                  title="No live picks found"
                  description={`We could not find enough clean eat, drink, see, or do picks for ${result.area} right now.`}
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
  heroEyebrow: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
  introCard: {
    gap: spacing.md,
    backgroundColor: '#F7FBFF',
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
    gap: 4,
  },
  introTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  introText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  introPoints: {
    gap: spacing.sm,
  },
  introPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  introPointText: {
    flex: 1,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  introButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  introButtonLabel: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
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
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  deckCountPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deckCountLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  laneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  lanePill: {
    width: '23%',
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
