import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { colors, radii, spacing } from '@/constants/theme';
import { getDestinationWeatherDetail, type DestinationWeatherDetail } from '@/services/tripInsightsService';
import { useAppStore } from '@/store/useAppStore';
import { getTripBundle } from '@/utils/selectors';

function weatherIconName(weatherCode: number | null) {
  if (weatherCode === null) return 'cloud-off';
  if (weatherCode === 0) return 'wb-sunny';
  if (weatherCode === 1 || weatherCode === 2 || weatherCode === 3) return 'cloud';
  if (weatherCode === 45 || weatherCode === 48) return 'blur-on';
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return 'umbrella';
  if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) return 'ac-unit';
  if (weatherCode >= 95) return 'bolt';
  return 'cloud';
}

function formatTemperature(value: number | null | undefined) {
  return value === null || value === undefined ? '--°' : `${Math.round(value)}°C`;
}

function formatRange(minTemp: number | null, maxTemp: number | null) {
  if (minTemp === null || maxTemp === null) {
    return 'Range unavailable';
  }

  return `${Math.round(maxTemp)}° / ${Math.round(minTemp)}°`;
}

function formatLocationLabel(value: string) {
  return value.split(',')[0]?.trim() || value;
}

export default function TripWeatherScreen() {
  const router = useRouter();
  const { tripId, date } = useLocalSearchParams<{ tripId: string; date?: string }>();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const trip = bundle.trip;
  const [weatherDetail, setWeatherDetail] = useState<DestinationWeatherDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedDate = typeof date === 'string' ? date : '';

  useEffect(() => {
    let cancelled = false;
    const destination = trip?.destination.trim() ?? '';

    if (!destination || !selectedDate) {
      setWeatherDetail(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void getDestinationWeatherDetail(destination, selectedDate)
      .then((detail) => {
        if (!cancelled) {
          setWeatherDetail(detail);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('weather detail lookup failed', error);
        }
        if (!cancelled) {
          setWeatherDetail(null);
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
  }, [selectedDate, trip?.destination]);

  const locationLabel = useMemo(
    () => formatLocationLabel(weatherDetail?.resolvedLabel ?? trip?.destination ?? 'Destination'),
    [trip?.destination, weatherDetail?.resolvedLabel]
  );

  if (!trip) {
    return (
      <AppScreen title="Weather">
        <EmptyState title="Trip unavailable" description="Return to the trip page and try again." />
      </AppScreen>
    );
  }

  return (
    <AppScreen backgroundColor="#F7FBFF" hideBackgroundDecor>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={colors.nightNavy} />
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      {weatherDetail ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Weather</Text>
                <Text style={styles.heroPlace}>{locationLabel}</Text>
                <Text style={styles.heroDate}>{weatherDetail.dateLabel}</Text>
              </View>
              <View style={styles.heroIcon}>
                <MaterialIcons name={weatherIconName(weatherDetail.weatherCode) as any} size={30} color={colors.primaryBlue} />
              </View>
            </View>

            <View style={styles.heroMainRow}>
              <Text style={styles.heroTemperature}>{formatTemperature(weatherDetail.temperatureMaxC)}</Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroCondition}>{weatherDetail.conditionLabel}</Text>
                <Text style={styles.heroRange}>{formatRange(weatherDetail.temperatureMinC, weatherDetail.temperatureMaxC)}</Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              <InfoChip label={`Sunrise ${weatherDetail.sunriseLabel ?? '--:--'}`} tone="blue" />
              <InfoChip label={`Sunset ${weatherDetail.sunsetLabel ?? '--:--'}`} tone="gold" />
            </View>
          </AppCard>

          <AppCard title="Hourly outlook" subtitle="Real forecast for the selected trip day.">
            <View style={styles.hourList}>
              {weatherDetail.hours.map((hour, index) => (
                <View key={hour.time} style={[styles.hourRow, index < weatherDetail.hours.length - 1 ? styles.hourRowBorder : null]}>
                  <Text style={styles.hourTime}>{hour.timeLabel}</Text>
                  <View style={styles.hourCondition}>
                    <MaterialIcons name={weatherIconName(hour.weatherCode) as any} size={18} color={colors.primaryBlue} />
                    <Text style={styles.hourConditionText}>{hour.conditionLabel}</Text>
                  </View>
                  <Text style={styles.hourTemp}>{formatTemperature(hour.temperatureC)}</Text>
                </View>
              ))}
            </View>
          </AppCard>
        </ScrollView>
      ) : (
        <AppCard>
          <EmptyState
            title={loading ? 'Loading weather detail' : 'Weather detail unavailable'}
            description={
              loading
                ? 'Fetching the selected day and hourly weather.'
                : 'We could not load detailed weather for that day right now.'
            }
          />
        </AppCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  backLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    gap: spacing.md,
    backgroundColor: '#F9FCFF',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  heroPlace: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  heroDate: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  heroTemperature: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 42,
    lineHeight: 46,
  },
  heroMeta: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.xs,
  },
  heroCondition: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  heroRange: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hourList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hourRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  hourTime: {
    width: 58,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  hourCondition: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hourConditionText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  hourTemp: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
});
