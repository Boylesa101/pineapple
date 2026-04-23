import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function FlightTicketsScreen() {
  const router = useRouter();
  const { activeTripId, data } = useAppStore();
  const selectedTrip = data.trips.find((trip) => trip.id === activeTripId) ?? data.trips[0] ?? null;

  return (
    <AppScreen title="Flight tickets" subtitle="Quick access for travel tickets and stored flight references.">
      <AppCard>
        <View style={styles.heroRow}>
          <MaterialIcons name="flight-takeoff" size={28} color={colors.primaryBlue} />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Airline cards now open inside Pineapple</Text>
            <Text style={styles.meta}>
              Pineapple now opens a branded flight-card stack and full-screen boarding pass for the active trip. Wallet deep-linking still is not part of this release.
            </Text>
          </View>
        </View>
        {selectedTrip ? (
          <AppButton
            label={`Open ${selectedTrip.destination} flight cards`}
            onPress={() =>
              router.push({ pathname: '/trip/[tripId]/flights', params: { tripId: selectedTrip.id } })
            }
          />
        ) : (
          <Text style={styles.meta}>Create a trip first to open flight and transfer details here.</Text>
        )}
      </AppCard>

      <AppCard title="What belongs here">
        <Pressable style={styles.row}>
          <MaterialIcons name="confirmation-number" size={20} color={colors.primaryBlue} />
          <Text style={styles.rowText}>Airline-branded flight cards and the saved boarding-pass view for the active trip</Text>
        </Pressable>
        <Pressable style={styles.row}>
          <MaterialIcons name="luggage" size={20} color={colors.primaryBlue} />
          <Text style={styles.rowText}>Live-status flight context where available, with passenger and barcode details still coming from local import data</Text>
        </Pressable>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 19,
  },
});
