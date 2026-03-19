import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AvatarBadge } from '@/components/AvatarBadge';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { HeroCard } from '@/components/ui/HeroCard';
import { MiniActionCard } from '@/components/ui/MiniActionCard';
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
        <Pressable onPress={() => router.push('/warnings')} style={styles.bellButton} accessibilityLabel="Open alerts">
          <MaterialIcons name="notifications-none" size={24} color={colors.primaryBlue} />
          {alertCount > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
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

      <View style={styles.section}>
        <SectionHeader title="Travel status" right={alertCount ? `${alertCount} alert${alertCount === 1 ? '' : 's'}` : 'All clear'} />
        <View style={styles.travelStatusGrid}>
          <View style={styles.actionCell}>
            <MiniActionCard
              style={styles.equalActionCard}
              icon={<MaterialIcons name="travel-explore" size={26} color={colors.primaryBlue} />}
              title="Travel Status"
              description={
                nextEvent
                  ? `Next event live · ${countdownLabel(dashboardTrip?.startDate ?? new Date().toISOString())}`
                  : `${expiryOverview.expiredCount + expiryOverview.expiringCount} doc alerts to review`
              }
              onPress={() => router.push('/warnings')}
            />
          </View>
          <View style={styles.actionCell}>
            <MiniActionCard
              style={styles.equalActionCard}
              icon={<MaterialIcons name="folder" size={26} color={colors.primaryBlue} />}
              title="Document Vault"
              description={`${bundle.documents.length || 0} document records ready for travel.`}
              onPress={openVault}
            />
          </View>
          <View style={styles.actionCell}>
            <MiniActionCard
              style={styles.equalActionCard}
              icon={<MaterialIcons name="sos" size={26} color={colors.dangerRed} />}
              title="SOS"
              description="Open emergency tools, embassy notes, and support info."
              onPress={() => router.push('/sos')}
            />
          </View>
        </View>
        <View style={styles.chipRow}>
          <InfoChip label={`${expiryOverview.expiredCount} expired`} tone={expiryOverview.expiredCount ? 'coral' : 'blue'} />
          <InfoChip label={`${expiryOverview.expiringCount} expiring soon`} tone={expiryOverview.expiringCount ? 'gold' : 'blue'} />
          <InfoChip label={nextEvent ? 'Itinerary live' : 'No next event'} tone="blue" />
        </View>
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
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E7FF',
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
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
  travelStatusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  actionCell: {
    flex: 1,
  },
  equalActionCard: {
    minHeight: 142,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
