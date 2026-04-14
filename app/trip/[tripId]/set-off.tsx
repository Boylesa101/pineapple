import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
import { getAirportSetOffInfo } from '@/services/tripInsightsService';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

export default function TripSetOffScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const trip = bundle.trip;

  if (!trip) {
    return (
      <AppScreen title="Set-off time">
        <EmptyState title="Trip unavailable" description="Return to the trip page and try again." />
      </AppScreen>
    );
  }

  const setOffInfo = getAirportSetOffInfo(bundle.travelSegments, trip.airportTravelDurationMinutes);

  return (
    <AppScreen title="Set-off time" subtitle={trip.destination}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={18} color={colors.primaryBlueDark} />
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      <AppCard subtitle="Timing guidance based on outbound travel and your airport buffer.">
        <Text style={styles.headline}>{setOffInfo.timeLabel}</Text>
        <Text style={styles.meta}>
          {setOffInfo.status === 'available' ? setOffInfo.departureLabel : 'Add outbound travel details to calculate a departure time.'}
        </Text>
        <Text style={styles.body}>{setOffInfo.helperLabel}</Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  backLabel: {
    color: colors.primaryBlueDark,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  headline: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 25,
    lineHeight: 30,
  },
  meta: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  body: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
