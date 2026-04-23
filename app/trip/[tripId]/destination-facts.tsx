import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
import {
  getDestinationLocalTimeInfo,
  getDestinationQuickFacts,
  type DestinationLocalTimeInfo,
  type DestinationQuickFacts,
} from '@/services/tripInsightsService';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

function factValue(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export default function TripDestinationFactsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data } = useAppStore();
  const trip = getTripBundle(data, tripId).trip;
  const [facts, setFacts] = useState<DestinationQuickFacts | null>(null);
  const [timeInfo, setTimeInfo] = useState<DestinationLocalTimeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const destination = trip?.destination.trim() ?? '';

    if (!destination) {
      setFacts(null);
      setTimeInfo(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void Promise.all([getDestinationQuickFacts(destination), getDestinationLocalTimeInfo(destination)])
      .then(([nextFacts, nextTimeInfo]) => {
        if (!cancelled) {
          setFacts(nextFacts);
          setTimeInfo(nextTimeInfo);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trip?.destination]);

  if (!trip) {
    return (
      <AppScreen title="Quick info">
        <EmptyState title="Trip unavailable" description="Return to the trip page and try again." />
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Quick info" subtitle={trip.destination}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={18} color={colors.primaryBlueDark} />
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      <AppCard subtitle={loading ? 'Checking destination essentials…' : 'Travel essentials for this destination.'}>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>Currency</Text>
            <Text style={styles.value}>{factValue(facts?.currencyLabel, 'Unavailable')}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Language</Text>
            <Text style={styles.value}>{factValue(facts?.languageLabel, 'Unavailable')}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Plug</Text>
            <Text style={styles.value}>{factValue(facts?.plugLabel, 'Unavailable')}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Timezone</Text>
            <Text style={styles.value}>{timeInfo?.offsetLabel ?? 'Unavailable'}</Text>
          </View>
        </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 16,
  },
  cell: {
    width: '47%',
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  value: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
});
