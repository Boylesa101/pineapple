import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { countdownLabel, formatDateTime } from '@/utils/date';
import { percent, tripDateRange } from '@/utils/format';
import { getNextEvent, getNextFlight, getNextHotel, getPackingProgress, getUpcomingTrip } from '@/utils/selectors';
import { canUseBiometrics } from '@/utils/security';

function QuickCard({
  icon,
  title,
  value,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickIcon}>
        <MaterialIcons name={icon} size={20} color={colors.nightNavy} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickValue}>{value}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, security, updateSecurityPreferences, resetWithDemoData, setActiveTrip } = useAppStore();
  const [checkingBiometrics, setCheckingBiometrics] = useState(false);
  const upcomingTrip = useMemo(() => getUpcomingTrip(data), [data]);
  const nextFlight = getNextFlight(data, upcomingTrip?.id);
  const nextHotel = getNextHotel(data, upcomingTrip?.id);
  const nextEvent = getNextEvent(data, upcomingTrip?.id);
  const packing = getPackingProgress(data, upcomingTrip?.id);

  const quickCards = upcomingTrip
    ? ([
        {
          icon: 'lock',
          title: 'Documents',
          value: `${data.documents.filter((item) => item.tripId === upcomingTrip.id).length} saved`,
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/vault');
          },
        },
        {
          icon: 'checkroom',
          title: 'Packing',
          value: `${percent(packing.packed, packing.total)}% ready`,
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/packing');
          },
        },
        {
          icon: 'flight-takeoff',
          title: 'Next flight / hotel',
          value: nextFlight ? `${nextFlight.airline} ${nextFlight.flightNumber}` : nextHotel ? nextHotel.hotelName : 'Add travel details',
          onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } }),
        },
        {
          icon: 'celebration',
          title: 'Upcoming excursion',
          value: nextEvent ? nextEvent.title : 'Plan something memorable',
          onPress: () => {
            setActiveTrip(upcomingTrip.id);
            router.push('/itinerary');
          },
        },
        {
          icon: 'local-hospital',
          title: 'Emergency info',
          value: data.emergencyInfos.find((item) => item.tripId === upcomingTrip.id)?.insurerEmergencyNumber || 'Add trip contacts',
          onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } }),
        },
        {
          icon: 'bolt',
          title: 'Travel Mode',
          value: 'Fast access screen',
          onPress: () => router.push({ pathname: '/trip/[tripId]/travel-mode', params: { tripId: upcomingTrip.id } }),
        },
      ] satisfies Array<{
        icon: ComponentProps<typeof MaterialIcons>['name'];
        title: string;
        value: string;
        onPress: () => void;
      }>)
    : [];

  return (
    <AppScreen title="Home" subtitle="One calm place for your next holiday.">
      <AppCard>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.brandTitle}>Pineapple</Text>
            <Text style={styles.brandSubtitle}>Local-first planner, secure vault, travel mode, and offline emergency access.</Text>
          </View>
          <PineappleMark size={72} />
        </View>
      </AppCard>

      {!upcomingTrip ? (
        <AppCard>
          <EmptyState
            title="Start your first trip"
            description="Create a holiday, add travellers, and keep everything on-device from day one."
          />
          <AppButton label="Create your first trip" onPress={() => router.push('/trips')} />
        </AppCard>
      ) : (
        <>
          <AppCard title={upcomingTrip.name} subtitle={tripDateRange(upcomingTrip.startDate, upcomingTrip.endDate)}>
            <Text style={styles.destination}>{upcomingTrip.destination}</Text>
            <Text style={styles.countdown}>{countdownLabel(upcomingTrip.startDate)} until departure</Text>
            {nextFlight ? <Text style={styles.meta}>Next flight: {nextFlight.airline} {nextFlight.flightNumber} on {formatDateTime(nextFlight.departureTime)}</Text> : null}
            {nextHotel ? <Text style={styles.meta}>Hotel: {nextHotel.hotelName}</Text> : null}
            <AppButton label="Open trip" onPress={() => router.push({ pathname: '/trip/[tripId]', params: { tripId: upcomingTrip.id } })} />
          </AppCard>

          <View style={styles.quickGrid}>
            {quickCards.map((card) => (
              <QuickCard key={card.title} {...card} />
            ))}
          </View>
        </>
      )}

      <AppCard title="Security">
        <Text style={styles.securityLabel}>Auto-lock</Text>
        <ChoiceChips
          value={String(security.autoLockSeconds) as '30' | '90' | '300'}
          onChange={(value) => updateSecurityPreferences({ autoLockSeconds: Number(value) })}
          options={[
            { label: '30 sec', value: '30' },
            { label: '90 sec', value: '90' },
            { label: '5 min', value: '300' },
          ]}
        />
        <AppButton
          label={security.biometricEnabled ? 'Disable biometrics' : 'Enable biometrics'}
          tone="secondary"
          onPress={async () => {
            if (security.biometricEnabled) {
              await updateSecurityPreferences({ biometricEnabled: false });
              return;
            }

            setCheckingBiometrics(true);
            const supported = await canUseBiometrics();
            setCheckingBiometrics(false);
            if (!supported) {
              Alert.alert('Biometrics unavailable', 'No enrolled biometric unlock method was detected on this device.');
              return;
            }

            await updateSecurityPreferences({ biometricEnabled: true });
          }}
          loading={checkingBiometrics}
        />
      </AppCard>

      {upcomingTrip ? (
        <AppCard title="Packing progress">
          <Text style={styles.meta}>{packing.packed} of {packing.total} items packed</Text>
          <ProgressBar progress={percent(packing.packed, packing.total)} />
        </AppCard>
      ) : null}

      {__DEV__ ? (
        <AppCard title="Development">
          <Text style={styles.meta}>Reset the local database with demo content for QA and layout checks.</Text>
          <AppButton label="Load demo data" tone="ghost" onPress={resetWithDemoData} />
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  brandTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  destination: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
  },
  countdown: {
    color: colors.oceanBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  quickValue: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  securityLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
