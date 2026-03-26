import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
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
    <AppScreen backgroundColor="#FFF4ED" hideBackgroundDecor>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={colors.nightNavy} />
        <Text style={styles.backLabel}>Back to trip</Text>
      </Pressable>

      {weatherDetail ? (
        <View style={styles.card}>
          <View style={styles.landscapeSection}>
            <LinearGradient colors={['#E96594', '#F7E157']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.sky} />
            <View style={styles.sunGlowOuter} />
            <View style={styles.sunGlowInner} />
            <View style={styles.sun} />

            <View style={styles.hillOne} />
            <View style={styles.hillTwo} />

            <LinearGradient colors={['#F7DA96', '#F1C07D']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.ocean}>
              <View style={[styles.reflection, styles.reflectionOne]} />
              <View style={[styles.reflection, styles.reflectionTwo]} />
              <View style={[styles.reflection, styles.reflectionThree]} />
              <View style={[styles.reflection, styles.reflectionFour]} />
              <View style={[styles.reflection, styles.reflectionFive]} />
              <View style={styles.shadowHillOne} />
              <View style={styles.shadowHillTwo} />
            </LinearGradient>

            <View style={styles.hillThree} />
            <View style={styles.hillFour} />

            <View style={[styles.tree, styles.treeOne]}>
              <Svg width={34} height={46} viewBox="0 0 64 64">
                <Path
                  fill="#B77873"
                  d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z"
                />
              </Svg>
            </View>
            <View style={[styles.tree, styles.treeTwo]}>
              <Svg width={34} height={46} viewBox="0 0 64 64">
                <Path
                  fill="#B77873"
                  d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z"
                />
              </Svg>
            </View>
            <View style={[styles.tree, styles.treeThree]}>
              <Svg width={40} height={52} viewBox="0 0 64 64">
                <Path
                  fill="#A16773"
                  d="M32,0C18.148,0,12,23.188,12,32c0,9.656,6.883,17.734,16,19.594V60c0,2.211,1.789,4,4,4s4-1.789,4-4v-8.406 C45.117,49.734,52,41.656,52,32C52,22.891,46.051,0,32,0z"
                />
              </Svg>
            </View>

            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.filter} />

            <View style={styles.weatherInfo}>
              <View style={styles.weatherInfoLeft}>
                <MaterialIcons name={weatherIconName(weatherDetail.weatherCode) as any} size={40} color={colors.white} />
                <Text style={styles.conditionLabel} numberOfLines={1} ellipsizeMode="tail">
                  {weatherDetail.conditionLabel}
                </Text>
              </View>

              <View style={styles.weatherInfoRight}>
                <View style={styles.locationRow}>
                  <MaterialIcons name="place" size={14} color={colors.white} />
                  <Text style={styles.locationText}>{locationLabel.toUpperCase()}</Text>
                </View>
                <Text style={styles.dateText}>{weatherDetail.dateLabel}</Text>
                <Text style={styles.temperatureText}>{formatTemperature(weatherDetail.temperatureMaxC)}</Text>
                <Text style={styles.rangeText}>{formatRange(weatherDetail.temperatureMinC, weatherDetail.temperatureMaxC)}</Text>
              </View>
            </View>

            <View style={styles.sunCycleRow}>
              <View style={styles.sunCycleItem}>
                <MaterialIcons name="light-mode" size={18} color={colors.white} />
                <Text style={styles.sunCycleLabel}>Sunrise</Text>
                <Text style={styles.sunCycleTime}>{weatherDetail.sunriseLabel ?? '--:--'}</Text>
              </View>
              <View style={styles.sunCycleItem}>
                <MaterialIcons name="dark-mode" size={18} color={colors.white} />
                <Text style={styles.sunCycleLabel}>Sunset</Text>
                <Text style={styles.sunCycleTime}>{weatherDetail.sunsetLabel ?? '--:--'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.hourlyList}>
              {weatherDetail.hours.map((hour, index) => (
                <View key={hour.time}>
                  <View style={styles.hourlyRow}>
                    <Text style={styles.hourlyTime}>{hour.timeLabel}</Text>
                    <View style={styles.hourlyValue}>
                      <MaterialIcons name={weatherIconName(hour.weatherCode) as any} size={18} color={colors.textMuted} />
                      <Text style={styles.hourlyTemp}>{formatTemperature(hour.temperatureC)}</Text>
                    </View>
                  </View>
                  {index < weatherDetail.hours.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.fallbackCard}>
          <EmptyState
            title={loading ? 'Loading weather detail' : 'Weather detail unavailable'}
            description={
              loading
                ? 'Fetching the selected day and hourly weather.'
                : 'We could not load detailed weather for that day right now.'
            }
          />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  backLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOpacity: 1,
    shadowOffset: { width: 12, height: 12 },
    shadowRadius: 18,
    elevation: 6,
  },
  landscapeSection: {
    position: 'relative',
    height: 310,
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
  },
  sunGlowOuter: {
    position: 'absolute',
    bottom: '39%',
    left: '21%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  sunGlowInner: {
    position: 'absolute',
    bottom: '40%',
    left: '22%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  sun: {
    position: 'absolute',
    bottom: '41%',
    left: '23%',
    width: 45,
    height: 45,
    borderRadius: 23,
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
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 999,
  },
  reflectionOne: {
    width: 40,
    height: 8,
    top: '8%',
    left: '32%',
  },
  reflectionTwo: {
    width: 72,
    height: 10,
    top: '18%',
    left: '39%',
  },
  reflectionThree: {
    width: 58,
    height: 3,
    top: '31%',
    right: '15%',
  },
  reflectionFour: {
    width: 68,
    height: 3,
    top: '42%',
    right: '28%',
  },
  reflectionFive: {
    width: 68,
    height: 4,
    top: '52%',
    right: '8%',
  },
  hillOne: {
    position: 'absolute',
    right: '-25%',
    bottom: '20%',
    width: 150,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#E6B29D',
  },
  shadowHillOne: {
    position: 'absolute',
    right: '-25%',
    top: '-30%',
    width: 150,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#F1C7A0',
  },
  hillTwo: {
    position: 'absolute',
    right: '-36%',
    bottom: '10%',
    width: 150,
    height: 80,
    borderRadius: 999,
    backgroundColor: '#C29182',
  },
  shadowHillTwo: {
    position: 'absolute',
    right: '-36%',
    top: '-65%',
    width: 150,
    height: 80,
    borderRadius: 999,
    backgroundColor: '#E5BB96',
  },
  hillThree: {
    position: 'absolute',
    left: '-100%',
    bottom: '-28%',
    width: 350,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#B77873',
    zIndex: 3,
  },
  hillFour: {
    position: 'absolute',
    right: '-100%',
    bottom: '-40%',
    width: 350,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#A16773',
    zIndex: 3,
  },
  tree: {
    position: 'absolute',
    zIndex: 4,
    alignItems: 'center',
  },
  treeOne: {
    bottom: '20%',
    left: '3%',
  },
  treeTwo: {
    bottom: '14%',
    left: '25%',
  },
  treeThree: {
    bottom: '10%',
    right: '3%',
  },
  filter: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  weatherInfo: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    zIndex: 10,
  },
  weatherInfoLeft: {
    width: '34%',
    alignItems: 'center',
    gap: 6,
  },
  conditionLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  weatherInfoRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '60%',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  dateText: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'right',
  },
  temperatureText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    lineHeight: 36,
  },
  rangeText: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  sunCycleRow: {
    position: 'absolute',
    right: 16,
    left: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  sunCycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sunCycleLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  sunCycleTime: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  contentSection: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  hourlyList: {
    gap: 10,
  },
  hourlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hourlyTime: {
    color: 'lightslategray',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  hourlyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hourlyTemp: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  separator: {
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgb(233, 233, 233)',
  },
  fallbackCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
});
