import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AvatarBadge } from '@/components/AvatarBadge';
import { EmptyState } from '@/components/EmptyState';
import { HeroCard } from '@/components/ui/HeroCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TripHeroCard } from '@/components/ui/TripHeroCard';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { countdownLabel, formatDateTime, formatShortDate } from '@/utils/date';
import { tripDateRange } from '@/utils/format';
import {
  getDashboardAlerts,
  getDashboardTrip,
  getDocumentExpiryOverview,
  getNextEvent,
  getTripBundle,
} from '@/utils/selectors';

function firstNameFromBundle(bundle: ReturnType<typeof getTripBundle>) {
  const name = bundle.travellers[0]?.fullName || '';
  return name.split(' ')[0] || 'Traveller';
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, setActiveTrip } = useAppStore();
  const dashboardTrip = useMemo(() => getDashboardTrip(data), [data]);
  const bundle = useMemo(() => getTripBundle(data, dashboardTrip?.id), [data, dashboardTrip?.id]);
  const alerts = useMemo(() => getDashboardAlerts(data, dashboardTrip?.id), [data, dashboardTrip?.id]);
  const expiryOverview = getDocumentExpiryOverview(data, dashboardTrip?.id);
  const nextEvent = getNextEvent(data, dashboardTrip?.id);
  const greetingName = dashboardTrip ? firstNameFromBundle(bundle) : 'there';
  const alertCount = alerts.length;

  function goToTrips() {
    router.push('/trips');
  }

  function openTrip() {
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

  function openVault() {
    if (dashboardTrip) {
      setActiveTrip(dashboardTrip.id);
    }
    router.push('/vault');
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={styles.topGreeting}>{dashboardTrip ? `Hello ${greetingName}` : 'Ready when you are'}</Text>
          <Text style={styles.topSubtitle}>
            {dashboardTrip
              ? 'Keep your next trip, key documents, and travellers tidy in one place.'
              : 'Start a trip, add your travel documents, and keep everything local to this device.'}
          </Text>
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/account')} style={styles.topIconButton} accessibilityLabel="Open account">
            <MaterialIcons name="person-outline" size={25} color={colors.primaryBlue} />
          </Pressable>
          <Pressable onPress={() => router.push('/warnings')} style={styles.topIconButton} accessibilityLabel="Open alerts">
            <MaterialIcons name="notifications-none" size={25} color={colors.primaryBlue} />
            {alertCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      <HeroCard
        title={`Hello ${greetingName}`}
        description="Your next trip is ready to manage. Keep documents, plans, bookings, travellers, and emergency travel tools in one place."
        actions={
          <>
            <AppButton label="Start new trip" tone="secondary" onPress={goToTrips} />
            <AppButton label="Add document" tone="outline" onPress={openVault} />
          </>
        }
      />

      <View style={styles.section}>
        <SectionHeader title="Current trip" right="View all" />
        {dashboardTrip ? (
          <TripHeroCard
            trip={dashboardTrip}
            subtitle={tripDateRange(dashboardTrip.startDate, dashboardTrip.endDate)}
            meta={`${bundle.travellers.length} traveller${bundle.travellers.length === 1 ? '' : 's'} · ${bundle.hotelStays.length ? 'hotel saved' : 'no hotel yet'}${bundle.travelSegments.length ? ' · flights ready' : ''}`}
            badgeLabel={
              expiryOverview.expiringCount || expiryOverview.expiredCount
                ? `${expiryOverview.expiredCount + expiryOverview.expiringCount} docs need attention`
                : 'All key docs look current'
            }
            onPress={openTrip}
            onOpenFlights={() => {
              setActiveTrip(dashboardTrip.id);
              router.push({ pathname: '/trip/[tripId]', params: { tripId: dashboardTrip.id, focus: 'travel' } });
            }}
            onOpenHotel={() => {
              setActiveTrip(dashboardTrip.id);
              router.push({ pathname: '/trip/[tripId]', params: { tripId: dashboardTrip.id, focus: 'hotel' } });
            }}
            onOpenTransfers={() => {
              setActiveTrip(dashboardTrip.id);
              router.push({ pathname: '/trip/[tripId]', params: { tripId: dashboardTrip.id, focus: 'transfer' } });
            }}
          />
        ) : (
          <AppCard>
            <EmptyState
              title="No trip yet"
              description="Create your first trip to unlock the live dashboard, document vault, and emergency travel tools."
            />
            <AppButton label="Create your first trip" onPress={goToTrips} />
          </AppCard>
        )}
      </View>

      {dashboardTrip ? (
        <View style={styles.section}>
          <SectionHeader title="Traveller summary" />
          <AppCard>
            <View style={styles.travellerRow}>
              <View style={styles.avatarRow}>
                {bundle.travellers.map((traveller) => (
                  <AvatarBadge key={traveller.id} label={traveller.fullName} color={traveller.avatarColor} size={38} />
                ))}
              </View>
              <View style={styles.travellerCopy}>
                <Text style={styles.rowTitle}>{bundle.travellers.length} traveller profiles ready</Text>
                <Text style={styles.rowDescription}>
                  {nextEvent ? `Next event: ${nextEvent.title} · ${formatDateTime(nextEvent.dateTime)}` : 'Add itinerary events to keep your trip timeline live.'}
                </Text>
                <Text style={styles.rowDescription}>
                  {bundle.documents.length
                    ? `${bundle.documents.length} document records stored · ${countdownLabel(dashboardTrip.startDate)}`
                    : `No document records saved yet · ${formatShortDate(dashboardTrip.startDate)} departure`}
                </Text>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <AppButton label="Open trip" tone="outline" onPress={openTrip} />
              <AppButton label="Travel Mode" tone="secondary" onPress={openTravelMode} />
            </View>
          </AppCard>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  topCopy: {
    flex: 1,
    gap: 4,
  },
  topGreeting: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  topSubtitle: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dangerRed,
    borderWidth: 2,
    borderColor: colors.white,
  },
  section: {
    gap: spacing.sm,
  },
  travellerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  travellerCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  rowDescription: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
