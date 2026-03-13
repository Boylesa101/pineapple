import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AvatarBadge } from '@/components/AvatarBadge';
import {
  DashboardActionTile,
  DashboardAlertCard,
  DashboardHeader,
  DashboardSectionHeader,
  DashboardSummaryTile,
} from '@/components/DashboardElements';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { countdownLabel, daysUntil, formatDateTime, formatShortDate } from '@/utils/date';
import { tripDateRange } from '@/utils/format';
import {
  getDashboardAlerts,
  getDashboardTrip,
  getNextEvent,
  getNextFlight,
  getNextHotel,
  getPackingProgress,
  getTripBundle,
} from '@/utils/selectors';

function formatCountdown(startDate: string, status: string) {
  const days = daysUntil(startDate);
  if (status === 'active') return 'In progress';
  if (days < 0) return 'Completed';
  if (days === 0) return 'Starts today';
  if (days === 1) return '1 day to go';
  return `${days} days to go`;
}

function formatFlightSummary(value: ReturnType<typeof getNextFlight>) {
  if (!value) return 'No upcoming travel saved';
  return `${value.airline} ${value.flightNumber} ${countdownLabel(value.departureTime)} ${formatDateTime(value.departureTime).split(', ')[1]}`;
}

function formatHotelSummary(value: ReturnType<typeof getNextHotel>) {
  if (!value) return 'No hotel added';
  return `${value.hotelName} from ${formatShortDate(value.checkIn)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, setActiveTrip } = useAppStore();
  const dashboardTrip = useMemo(() => getDashboardTrip(data), [data]);
  const bundle = useMemo(() => getTripBundle(data, dashboardTrip?.id), [data, dashboardTrip?.id]);
  const alerts = useMemo(() => getDashboardAlerts(data, dashboardTrip?.id), [data, dashboardTrip?.id]);
  const nextFlight = getNextFlight(data, dashboardTrip?.id);
  const nextHotel = getNextHotel(data, dashboardTrip?.id);
  const nextEvent = getNextEvent(data, dashboardTrip?.id);
  const packing = getPackingProgress(data, dashboardTrip?.id);
  const itineraryPreview = useMemo(
    () => [...bundle.itineraryEvents].sort((left, right) => left.dateTime.localeCompare(right.dateTime)).slice(0, 3),
    [bundle.itineraryEvents]
  );

  function goToTrips() {
    router.push('/trips');
  }

  function openTripScoped(path: '/vault' | '/packing' | '/itinerary') {
    if (!dashboardTrip) {
      goToTrips();
      return;
    }
    setActiveTrip(dashboardTrip.id);
    router.push(path);
  }

  function openTripDetail() {
    if (!dashboardTrip) {
      goToTrips();
      return;
    }
    setActiveTrip(dashboardTrip.id);
    router.push({ pathname: '/trip/[tripId]', params: { tripId: dashboardTrip.id } });
  }

  function openTravelMode() {
    if (!dashboardTrip) {
      goToTrips();
      return;
    }
    setActiveTrip(dashboardTrip.id);
    router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId: dashboardTrip.id } });
  }

  const statusTone = dashboardTrip?.status === 'active' ? 'blue' : dashboardTrip?.status === 'completed' ? 'default' : 'gold';

  return (
    <AppScreen scroll title={undefined} subtitle={undefined}>
      <DashboardHeader title="Your next trip" onSettings={() => router.push('/settings')} />

      {!dashboardTrip ? (
        <AppCard>
          <EmptyState
            title="No trip ready yet"
            description="Create your first trip and Pineapple will turn it into a calm dashboard for travel details, documents, packing, and alerts."
          />
          <AppButton label="Create your first trip" onPress={goToTrips} />
        </AppCard>
      ) : (
        <AppCard>
          {dashboardTrip.coverImageUri ? (
            <Image source={dashboardTrip.coverImageUri} style={styles.coverImage} contentFit="cover" />
          ) : null}
          <View style={styles.primaryHeader}>
            <View style={styles.primaryCopy}>
              <Text style={styles.eyebrow}>Primary trip</Text>
              <Text style={styles.destination}>{dashboardTrip.destination}</Text>
              <Text style={styles.tripDates}>{tripDateRange(dashboardTrip.startDate, dashboardTrip.endDate)}</Text>
            </View>
            <InfoChip label={dashboardTrip.status} tone={statusTone} />
          </View>
          <View style={styles.chipRow}>
            <InfoChip label={formatCountdown(dashboardTrip.startDate, dashboardTrip.status)} tone="blue" />
            <InfoChip label={`${bundle.travellers.length} traveller(s)`} tone="default" />
          </View>
          <AppButton label="Open trip" onPress={openTripDetail} />
        </AppCard>
      )}

      <View style={styles.section}>
        <DashboardSectionHeader title="Quick actions" />
        <View style={styles.actionsGrid}>
          <DashboardActionTile icon="document-scanner" label="Scan Document" onPress={() => openTripScoped('/vault')} />
          <DashboardActionTile icon="bolt" label="Travel Mode" onPress={openTravelMode} />
          <DashboardActionTile icon="checkroom" label="Add Packing Item" onPress={() => openTripScoped('/packing')} />
          <DashboardActionTile icon="event-note" label="Add Itinerary Event" onPress={() => openTripScoped('/itinerary')} />
          <DashboardActionTile icon="luggage" label="Add Trip" onPress={goToTrips} />
          <DashboardActionTile icon="lock" label="Open Document Vault" onPress={() => openTripScoped('/vault')} />
        </View>
      </View>

      {dashboardTrip ? (
        <>
          <View style={styles.section}>
            <DashboardSectionHeader title="Progress summary" />
            <View style={styles.summaryGrid}>
              <DashboardSummaryTile
                title="Packing progress"
                value={
                  packing.total
                    ? `Packing ${packing.packed} of ${packing.total} items complete`
                    : 'No packing items yet'
                }
                icon="checkroom"
                tone="gold"
              />
              <DashboardSummaryTile
                title="Next flight"
                value={formatFlightSummary(nextFlight)}
                icon="flight-takeoff"
                tone="blue"
              />
              <DashboardSummaryTile
                title="Hotel status"
                value={formatHotelSummary(nextHotel)}
                icon="hotel"
                tone="default"
              />
              <DashboardSummaryTile
                title="Documents"
                value={`${bundle.documents.length} document(s) saved`}
                icon="lock"
                tone="coral"
              />
              <DashboardSummaryTile
                title="Next itinerary"
                value={nextEvent ? `${nextEvent.title} — ${formatDateTime(nextEvent.dateTime)}` : 'No itinerary items yet'}
                icon="event"
                tone="default"
              />
            </View>
          </View>

          {alerts.length ? (
            <View style={styles.section}>
              <DashboardSectionHeader title="Alerts and warnings" />
              <View style={styles.alertList}>
                {alerts.map((alert) => (
                  <DashboardAlertCard
                    key={`${alert.title}-${alert.subtitle}`}
                    title={alert.title}
                    subtitle={alert.subtitle}
                    tone={alert.tone}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable onPress={openTravelMode} style={styles.travelModeCard}>
            <View style={styles.travelModeCopy}>
              <Text style={styles.travelModeTitle}>Travel Mode</Text>
              <Text style={styles.travelModeSubtitle}>
                Travel Mode — quick access to passport numbers, bookings and hotel details.
              </Text>
            </View>
            <View style={styles.travelModeBadge}>
              <Text style={styles.travelModeBadgeText}>Open</Text>
            </View>
          </Pressable>

          <View style={styles.section}>
            <DashboardSectionHeader
              title="Itinerary preview"
              right={<AppButton label="Open" tone="secondary" onPress={() => openTripScoped('/itinerary')} />}
            />
            {itineraryPreview.length ? (
              <AppCard>
                {itineraryPreview.map((item) => (
                  <View key={item.id} style={styles.previewRow}>
                    <View style={styles.previewDot} />
                    <View style={styles.previewCopy}>
                      <Text style={styles.previewTitle}>{item.title}</Text>
                      <Text style={styles.previewMeta}>
                        {formatDateTime(item.dateTime)}
                        {item.location ? ` • ${item.location}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </AppCard>
            ) : (
              <AppCard>
                <EmptyState
                  title="No itinerary yet"
                  description="Add flights, excursions, meals, and reminders so the next few events show up here automatically."
                />
                <AppButton label="Add an event" onPress={() => openTripScoped('/itinerary')} />
              </AppCard>
            )}
          </View>

          <View style={styles.section}>
            <DashboardSectionHeader title="Traveller summary" />
            <AppCard>
              {bundle.travellers.length ? (
                <>
                  <Text style={styles.summaryLead}>{bundle.travellers.length} traveller(s) on this trip</Text>
                  <View style={styles.travellerRow}>
                    {bundle.travellers.map((traveller) => (
                      <AvatarBadge
                        key={traveller.id}
                        label={traveller.fullName}
                        color={traveller.avatarColor}
                        size={40}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.summaryLead}>No travellers added yet</Text>
                  <Text style={styles.summaryMeta}>
                    Add travellers to organise documents, packing assignments, and Travel Mode summaries.
                  </Text>
                  <AppButton label="Add travellers" onPress={openTripDetail} />
                </>
              )}
            </AppCard>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  coverImage: {
    width: '100%',
    height: 170,
    borderRadius: radii.md,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  primaryCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  destination: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 34,
  },
  tripDates: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertList: {
    gap: spacing.xs,
  },
  travelModeCard: {
    backgroundColor: colors.nightNavy,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  travelModeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  travelModeTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
  travelModeSubtitle: {
    color: '#D2DFEA',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  travelModeBadge: {
    backgroundColor: '#FFF1C6',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  travelModeBadgeText: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  previewDot: {
    marginTop: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.pineappleGold,
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  previewMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryLead: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  summaryMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  travellerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
