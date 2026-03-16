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
import { AppHeader } from '@/components/ui/AppHeader';
import { HeroCard } from '@/components/ui/HeroCard';
import { MiniActionCard } from '@/components/ui/MiniActionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/theme';
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
  const alerts = useMemo(() => getDashboardAlerts(data, dashboardTrip?.id).slice(0, 3), [data, dashboardTrip?.id]);
  const expiryOverview = getDocumentExpiryOverview(data, dashboardTrip?.id);
  const nextEvent = getNextEvent(data, dashboardTrip?.id);
  const greetingName = dashboardTrip ? firstNameFromBundle(bundle) : 'there';

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
      <AppHeader
        badgeLabel="P"
        title="Pineapple"
        subtitle="Travel organiser"
        actionIcon="menu"
        onActionPress={() => router.push('/settings')}
      />

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
          <Pressable onPress={openTrip}>
            <AppCard>
              <View style={styles.tripCard}>
                <View style={styles.tripMeta}>
                  <Text style={styles.tripTitle}>{dashboardTrip.name}</Text>
                  <Text style={styles.tripText}>{tripDateRange(dashboardTrip.startDate, dashboardTrip.endDate)}</Text>
                  <Text style={styles.tripText}>
                    {bundle.travellers.length} traveller{bundle.travellers.length === 1 ? '' : 's'} · {bundle.hotelStays.length ? 'hotel' : 'no hotel'}
                    {bundle.travelSegments.length ? ', flights' : ''}
                    {bundle.itineraryEvents.length ? ', itinerary saved' : ''}
                  </Text>
                  <InfoChip
                    label={
                      expiryOverview.expiringCount || expiryOverview.expiredCount
                        ? `${expiryOverview.expiredCount + expiryOverview.expiringCount} docs need attention`
                        : 'All key docs look current'
                    }
                    tone={expiryOverview.expiredCount ? 'coral' : expiryOverview.expiringCount ? 'gold' : 'blue'}
                  />
                </View>
                <MaterialIcons name="flight-takeoff" size={34} color={colors.primaryBlue} />
              </View>
            </AppCard>
          </Pressable>
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
        <SectionHeader title="Quick actions" />
        <View style={styles.grid}>
          <MiniActionCard
            icon={<MaterialIcons name="folder" size={28} color={colors.primaryBlue} />}
            title="Document Vault"
            description="Store passports, cards, tickets, and scans."
            onPress={openVault}
          />
          <MiniActionCard
            icon={<MaterialIcons name="checklist" size={28} color={colors.primaryBlue} />}
            title="Packing Lists"
            description="Create and reuse travel packing templates."
            onPress={() => router.push('/packing')}
          />
          <MiniActionCard
            icon={<MaterialIcons name="bed" size={28} color={colors.primaryBlue} />}
            title="Bookings"
            description="Keep hotels, flights, and travel segments together."
            onPress={openTrip}
          />
          <MiniActionCard
            icon={<MaterialIcons name="sos" size={28} color={colors.dangerRed} />}
            title="SOS"
            description="Emergency embassy, hospital, police, and pharmacy tools."
            onPress={() => router.push('/sos')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent alerts" />
        <AppCard>
          {alerts.length ? (
            alerts.map((alert, index) => (
              <View key={`${alert.title}-${index}`} style={[styles.listItem, index === alerts.length - 1 ? styles.listItemLast : null]}>
                <View style={styles.listLeft}>
                  <Text style={styles.listTitle}>{alert.title}</Text>
                  <Text style={styles.listText}>{alert.subtitle}</Text>
                </View>
                <Text style={styles.listAction}>{alert.tone === 'coral' ? 'Review' : 'Open'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAlertText}>No current alerts. Pineapple will show expiry, insurance, and emergency gaps here.</Text>
          )}
        </AppCard>
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
  section: {
    gap: spacing.sm,
  },
  tripCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  tripMeta: {
    flex: 1,
    gap: 6,
  },
  tripTitle: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  tripText: {
    color: '#5C738A',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listLeft: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  listText: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  listAction: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  noAlertText: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
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
