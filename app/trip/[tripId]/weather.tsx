import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, radii, spacing } from '@/constants/theme';
import {
  getDestinationWeatherDetail,
  getDestinationWeatherForecast,
  type DestinationWeatherDetail,
  type DestinationWeatherForecast,
} from '@/services/tripInsightsService';
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

function ScenicTree({ style, color, width, height }: { style: object; color: string; width: number; height: number }) {
  return (
    <View style={style}>
      <Svg width={width} height={height} viewBox="0 0 64 64">
        <Path
          d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function ScenicReflection({ style }: { style: object }) {
  return <View style={[styles.reflection, style]} />;
}

export default function TripWeatherScreen() {
  const router = useRouter();
  const { tripId, date } = useLocalSearchParams<{ tripId: string; date?: string }>();
  const { data } = useAppStore();
  const bundle = getTripBundle(data, tripId);
  const trip = bundle.trip;
  const [weatherDetail, setWeatherDetail] = useState<DestinationWeatherDetail | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<DestinationWeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedDate = typeof date === 'string' ? date : '';

  useEffect(() => {
    let cancelled = false;
    const destination = trip?.destination.trim() ?? '';

    if (!destination || !selectedDate) {
      setWeatherDetail(null);
      setWeatherForecast(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void Promise.all([getDestinationWeatherDetail(destination, selectedDate), getDestinationWeatherForecast(destination)])
      .then(([detail, forecast]) => {
        if (!cancelled) {
          setWeatherDetail(detail);
          setWeatherForecast(forecast);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('weather detail lookup failed', error);
        }
        if (!cancelled) {
          setWeatherDetail(null);
          setWeatherForecast(null);
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
    <AppScreen backgroundColor="#FFF4ED" hideBackgroundDecor>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={colors.nightNavy} />
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      {weatherDetail ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.scenicCard}>
            <View style={styles.landscapeSection}>
              <LinearGradient
                colors={['#E96594', '#F7E157']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.sky}
              />
              <View style={styles.sunHaloFar} />
              <View style={styles.sunHaloNear} />
              <View style={styles.sunCore} />

              <View style={styles.hillOne} />
              <View style={styles.hillTwo} />

              <View style={styles.ocean}>
                <LinearGradient colors={['#F7DA96', '#F1C07D']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFillObject} />
                <ScenicReflection style={styles.reflectionOne} />
                <ScenicReflection style={styles.reflectionTwo} />
                <ScenicReflection style={styles.reflectionThree} />
                <ScenicReflection style={styles.reflectionFour} />
                <ScenicReflection style={styles.reflectionFive} />
                <View style={styles.shadowHillOne} />
                <View style={styles.shadowHillTwo} />
              </View>

              <View style={styles.hillThree} />
              <View style={styles.hillFour} />
              <ScenicTree style={styles.treeOne} color="#B77873" width={50} height={70} />
              <ScenicTree style={styles.treeTwo} color="#B77873" width={50} height={70} />
              <ScenicTree style={styles.treeThree} color="#A16773" width={65} height={80} />

              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,1)']}
                locations={[0, 0.44, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.landscapeFilter}
              />

              <View style={styles.weatherInfo}>
                <View style={styles.weatherInfoLeft}>
                  <View style={styles.weatherIconWrap}>
                    <MaterialIcons name={weatherIconName(weatherDetail.weatherCode) as any} size={28} color={colors.white} />
                  </View>
                  <Text style={styles.weatherInfoLabel} numberOfLines={2}>
                    {weatherDetail.conditionLabel}
                  </Text>
                </View>
                <View style={styles.weatherInfoRight}>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={14} color={colors.white} />
                    <Text style={styles.locationLabel} numberOfLines={1}>
                      {locationLabel}
                    </Text>
                  </View>
                  <Text style={styles.weatherDateLabel}>{weatherDetail.dateLabel}</Text>
                  <Text style={styles.weatherTemperature}>{formatTemperature(weatherDetail.temperatureMaxC)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.contentSection}>
              <View style={styles.contentMetaRow}>
                <Text style={styles.contentMetaText}>Sunrise {weatherDetail.sunriseLabel ?? '--:--'}</Text>
                <Text style={styles.contentMetaDot}>•</Text>
                <Text style={styles.contentMetaText}>Sunset {weatherDetail.sunsetLabel ?? '--:--'}</Text>
              </View>

              <View style={styles.hourlyList}>
                {weatherDetail.hours.map((hour, index) => (
                  <View key={hour.time}>
                    <View style={styles.hourlyRow}>
                      <Text style={styles.hourlyTime}>{hour.timeLabel}</Text>
                      <View style={styles.hourlyValue}>
                        <MaterialIcons name={weatherIconName(hour.weatherCode) as any} size={18} color={colors.textMuted} />
                        <Text style={styles.hourlyCondition}>{hour.conditionLabel}</Text>
                      </View>
                      <Text style={styles.hourlyTemp}>{formatTemperature(hour.temperatureC)}</Text>
                    </View>
                    {index < weatherDetail.hours.length - 1 ? <View style={styles.separator} /> : null}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <AppCard title="7-day forecast" subtitle={weatherForecast?.resolvedLabel ?? locationLabel}>
            <View style={styles.dayList}>
              {(weatherForecast?.days ?? []).map((day, index) => (
                <View key={day.date} style={[styles.dayRow, index < (weatherForecast?.days.length ?? 0) - 1 ? styles.dayRowBorder : null]}>
                  <View style={styles.dayRowLeft}>
                    <MaterialIcons name={weatherIconName(day.weatherCode) as any} size={18} color={colors.primaryBlue} />
                    <View style={styles.dayRowCopy}>
                      <Text style={styles.dayRowTitle}>{day.dayLabel}</Text>
                      <Text style={styles.dayRowMeta}>{day.conditionLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.dayRowTemp}>{formatRange(day.temperatureMinC, day.temperatureMaxC)}</Text>
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
  scenicCard: {
    height: 392,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 12, height: 12 },
    elevation: 8,
  },
  landscapeSection: {
    height: '70%',
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
  },
  sunHaloFar: {
    position: 'absolute',
    bottom: '38.5%',
    left: '21.4%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sunHaloNear: {
    position: 'absolute',
    bottom: '39.7%',
    left: '20.7%',
    width: 53,
    height: 53,
    borderRadius: 26.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  sunCore: {
    position: 'absolute',
    bottom: '40.4%',
    left: '22.7%',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: colors.white,
  },
  ocean: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '28%',
    overflow: 'hidden',
  },
  reflection: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.54)',
  },
  reflectionOne: {
    width: 40,
    height: 10,
    top: '5%',
    left: '32%',
    transform: [{ skewX: '-30deg' }, { scaleY: 0.8 }],
  },
  reflectionTwo: {
    width: 80,
    height: 15,
    top: '15%',
    left: '39%',
    transform: [{ skewX: '-20deg' }, { scaleY: 0.78 }],
  },
  reflectionThree: {
    width: 60,
    height: 2,
    top: '28%',
    right: '15%',
    borderRadius: 999,
  },
  reflectionFour: {
    width: 70,
    height: 2,
    top: '38%',
    right: '28%',
    borderRadius: 999,
  },
  reflectionFive: {
    width: 70,
    height: 3,
    top: '47%',
    right: '8%',
    borderRadius: 999,
  },
  hillOne: {
    position: 'absolute',
    right: '-25%',
    bottom: '20%',
    width: 150,
    height: 40,
    borderRadius: 75,
    backgroundColor: '#E6B29D',
  },
  shadowHillOne: {
    position: 'absolute',
    right: '-25%',
    top: '-30%',
    width: 150,
    height: 40,
    borderRadius: 75,
    backgroundColor: '#F1C7A0',
  },
  hillTwo: {
    position: 'absolute',
    right: '-36%',
    bottom: '10%',
    width: 150,
    height: 80,
    borderRadius: 75,
    backgroundColor: '#C29182',
  },
  shadowHillTwo: {
    position: 'absolute',
    right: '-36%',
    top: '-64%',
    width: 150,
    height: 80,
    borderRadius: 75,
    backgroundColor: '#E5BB96',
  },
  hillThree: {
    position: 'absolute',
    left: '-100%',
    bottom: '-28%',
    width: 350,
    height: 150,
    borderRadius: 175,
    backgroundColor: '#B77873',
  },
  hillFour: {
    position: 'absolute',
    right: '-100%',
    bottom: '-40%',
    width: 350,
    height: 150,
    borderRadius: 175,
    backgroundColor: '#A16773',
  },
  treeOne: {
    position: 'absolute',
    bottom: '20%',
    left: '3%',
  },
  treeTwo: {
    position: 'absolute',
    bottom: '14%',
    left: '25%',
  },
  treeThree: {
    position: 'absolute',
    bottom: '10%',
    right: '1%',
  },
  landscapeFilter: {
    ...StyleSheet.absoluteFillObject,
  },
  weatherInfo: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: spacing.md,
    zIndex: 2,
  },
  weatherInfoLeft: {
    width: '22%',
    gap: 4,
  },
  weatherIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherInfoLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 18,
  },
  weatherInfoRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  locationLabel: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  weatherDateLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  weatherTemperature: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 36,
  },
  contentSection: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  contentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contentMetaText: {
    color: '#6F7A88',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  contentMetaDot: {
    color: '#B8C2CD',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  forecastPreview: {
    gap: 10,
  },
  forecastPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  forecastPreviewLabel: {
    color: '#708090',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  forecastPreviewValue: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  forecastSeparator: {
    height: 2,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#E9E9E9',
  },
  selectedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedDayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCopy: {
    flex: 1,
    gap: 2,
  },
  selectedDayTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  selectedDayMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  selectedDayTemp: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
  },
  dayList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  dayRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayRowCopy: {
    flex: 1,
    gap: 1,
  },
  dayRowTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  dayRowMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  dayRowTemp: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  hourlyList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hourlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hourlyTime: {
    width: 58,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  hourlyValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hourlyCondition: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  hourlyTemp: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginHorizontal: spacing.md,
    backgroundColor: '#EEF3F8',
  },
});
