import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { Trip } from '@/types/models';

type Props = {
  trip: Trip;
  subtitle: string;
  meta: string;
  badgeLabel?: string | null;
  onPress?: () => void;
  onOpenFlights?: () => void;
  onOpenHotel?: () => void;
  onOpenTransfers?: () => void;
};

function fallbackGradient(type: Trip['destinationType']): readonly [string, string] {
  if (type === 'country') {
    return [colors.primaryBlueDark, colors.primaryBlue];
  }
  if (type === 'place') {
    return ['#174A78', '#3F8CFF'];
  }
  return [colors.primaryBlueDark, '#4A80C8'];
}

function statusLabel(trip: Trip) {
  if (trip.heroImageStatus === 'loading') {
    return 'Finding destination view';
  }
  if (trip.heroImageStatus === 'failed') {
    return 'Destination image unavailable';
  }
  return null;
}

export function TripHeroCard({
  trip,
  subtitle,
  meta,
  badgeLabel,
  onPress,
  onOpenFlights,
  onOpenHotel,
  onOpenTransfers,
}: Props) {
  const fallbackLabel = statusLabel(trip);

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.pressable}>
      <View style={styles.card}>
        {trip.coverImageUri ? <ManagedFileImage uri={trip.coverImageUri} style={styles.image} /> : null}
        <LinearGradient colors={fallbackGradient(trip.destinationType)} style={styles.fallback} />
        <LinearGradient colors={['rgba(10, 28, 44, 0.18)', 'rgba(10, 28, 44, 0.82)']} style={styles.overlay} />

        <View style={styles.content}>
          <View style={styles.copy}>
            <Text style={styles.destination}>{trip.destination.toUpperCase()}</Text>
            <Text style={styles.title}>{trip.name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.meta}>{meta}</Text>
            {badgeLabel ? <Text style={styles.badge}>{badgeLabel}</Text> : null}
            {fallbackLabel ? <Text style={styles.helper}>{fallbackLabel}</Text> : null}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onOpenFlights} disabled={!onOpenFlights} style={styles.iconButton}>
              <MaterialIcons name="flight" size={20} color={colors.white} />
            </Pressable>
            <Pressable onPress={onOpenHotel} disabled={!onOpenHotel} style={styles.iconButton}>
              <MaterialIcons name="hotel" size={20} color={colors.white} />
            </Pressable>
            <Pressable onPress={onOpenTransfers} disabled={!onOpenTransfers} style={styles.iconButton}>
              <MaterialIcons name="swap-horiz" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  card: {
    minHeight: 228,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    ...shadows.hero,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    minHeight: 228,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  destination: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    letterSpacing: 1.6,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.96)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  helper: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
