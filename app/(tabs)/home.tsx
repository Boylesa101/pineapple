import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TripStackDeck } from '@/components/ui/TripStackDeck';
import { colors, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { tripDateRange } from '@/utils/format';
import { getDashboardAlerts, getDocumentExpiryOverview, getTripBundle } from '@/utils/selectors';
import { getPrimaryTransportType } from '@/utils/transport';
import { filterVisibleTrips } from '@/utils/tripVisibility';

export default function HomeScreen() {
  const router = useRouter();
  const { data, setActiveTrip } = useAppStore();
  const { t } = useTranslation();
  const greetingName = data.appPreferences.profileName.trim() || 'traveller';
  const sortedTrips = useMemo(
    () => filterVisibleTrips([...data.trips]).sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [data.trips]
  );
  const alerts = useMemo(() => getDashboardAlerts(data, sortedTrips[0]?.id), [data, sortedTrips]);
  const alertCount = alerts.length;
  const tripCards = useMemo(
    () =>
      sortedTrips.map((trip) => {
        const bundle = getTripBundle(data, trip.id);
        const expiryOverview = getDocumentExpiryOverview(data, trip.id);
        return {
          trip,
          subtitle: tripDateRange(trip.startDate, trip.endDate),
          transportType: getPrimaryTransportType(bundle.travelSegments),
          meta: `${bundle.travellers.length} traveller${bundle.travellers.length === 1 ? '' : 's'} · ${
            bundle.hotelStays.length ? 'hotel saved' : 'no hotel yet'
          }${bundle.travelSegments.length ? ' · travel saved' : ''}`,
          badgeLabel:
            expiryOverview.expiringCount || expiryOverview.expiredCount
              ? `${expiryOverview.expiredCount + expiryOverview.expiringCount} docs need attention`
              : 'All key docs',
        };
      }),
    [data, sortedTrips]
  );

  function goToTrips() {
    router.push('/trips');
  }

  function openTripById(tripId?: string) {
    if (!tripId) {
      goToTrips();
      return;
    }
    setActiveTrip(tripId);
    router.push({ pathname: '/trip/[tripId]', params: { tripId } });
  }

  return (
    <AppScreen
      scroll
      contentStyle={styles.screen}
      footer={
        <View style={styles.fabWrap}>
          <AppButton
            label={t('home.newTrip')}
            size="large"
            onPress={goToTrips}
            icon={<MaterialIcons name="add" size={20} color={colors.white} />}
            style={styles.fabButton}
          />
        </View>
      }
    >
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={styles.topGreeting}>{t('home.greeting', { name: greetingName })}</Text>
          <Text style={styles.topSubcopy}>
            {tripCards.length
              ? 'Your next trip, vault, and travel foundations are ready below.'
              : 'Start with one trip and Pineapple will keep the rest of your travel foundation ready locally.'}
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

      <View style={styles.quickGrid}>
        <Pressable onPress={() => router.push('/vault')} style={styles.quickCard}>
          <MaterialIcons name="folder-copy" size={22} color={colors.primaryBlue} />
          <Text style={styles.quickTitle}>Vault</Text>
          <Text style={styles.quickBody}>Personal and trip-linked documents, stored locally on your device.</Text>
        </Pressable>
        <Pressable onPress={goToTrips} style={styles.quickCard}>
          <MaterialIcons name="luggage" size={22} color={colors.primaryBlue} />
          <Text style={styles.quickTitle}>Trips</Text>
          <Text style={styles.quickBody}>Create, edit, and open trip skeletons with transport, stay, and SOS hooks.</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={tripCards.length ? t('home.currentTrip') : 'Upcoming trips'}
          right={
            <Pressable onPress={goToTrips}>
              <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
            </Pressable>
          }
        />
        {tripCards.length ? (
          <TripStackDeck
            items={tripCards}
            onOpenTrip={(trip) => openTripById(trip.id)}
            onOpenFlights={(trip) => {
              setActiveTrip(trip.id);
              router.push({ pathname: '/trip/[tripId]/flights', params: { tripId: trip.id } });
            }}
            onOpenHotel={(trip) => {
              setActiveTrip(trip.id);
              router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id, focus: 'hotel' } });
            }}
            onOpenTransfers={(trip) => {
              setActiveTrip(trip.id);
              router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id, focus: 'transfer' } });
            }}
          />
        ) : (
          <AppCard>
            <EmptyState
              title={t('home.noTripYet')}
              description="Create your first trip to unlock trip detail placeholders, saved transport, accommodation slots, and SOS planning."
            />
            <AppButton label={t('home.createFirstTrip')} onPress={goToTrips} />
          </AppCard>
        )}
      </View>

      {alertCount ? (
        <View style={styles.section}>
          <SectionHeader title="Attention needed" right={`${alertCount} alert${alertCount === 1 ? '' : 's'}`} />
          <AppCard>
            {alerts.slice(0, 3).map((alert) => (
              <View key={`${alert.title}-${alert.subtitle}`} style={styles.alertRow}>
                <View
                  style={[
                    styles.alertDot,
                    alert.tone === 'danger'
                      ? styles.alertDanger
                      : alert.tone === 'coral'
                        ? styles.alertCoral
                        : styles.alertGold,
                  ]}
                />
                <View style={styles.alertCopy}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertBody}>{alert.subtitle}</Text>
                </View>
              </View>
            ))}
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
  },
  topGreeting: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  topSubcopy: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topIconButton: {
    width: 44,
    height: 44,
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
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  quickTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  quickBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  viewAll: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  alertDanger: {
    backgroundColor: colors.dangerRed,
  },
  alertCoral: {
    backgroundColor: colors.sunsetCoral,
  },
  alertGold: {
    backgroundColor: colors.pineappleGold,
  },
  alertCopy: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  alertBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  fabWrap: {
    alignItems: 'flex-end',
    marginBottom: -spacing.md,
  },
  fabButton: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
  },
});
