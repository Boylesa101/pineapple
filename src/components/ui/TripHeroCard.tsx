import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppButton } from '@/components/AppButton';
import { AppModal } from '@/components/AppModal';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { Trip } from '@/types/models';
import { daysUntil } from '@/utils/date';

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
    return ['rgba(13, 59, 102, 0.18)', 'rgba(13, 110, 253, 0.08)'];
  }
  if (type === 'place') {
    return ['rgba(23, 74, 120, 0.2)', 'rgba(63, 140, 255, 0.08)'];
  }
  return ['rgba(13, 59, 102, 0.18)', 'rgba(74, 128, 200, 0.08)'];
}

function statusLabel(trip: Trip) {
  if (trip.heroImageStatus === 'loading') {
    return 'Finding destination view';
  }
  if (trip.heroImageStatus === 'failed') {
    return 'Showing default Pineapple image';
  }
  return null;
}

function daysTillTripLabel(trip: Trip) {
  const days = daysUntil(trip.startDate);
  if (days < 0) {
    return 'Trip started';
  }
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return '1 day';
  }
  return `${days} days`;
}

function buildAttributionRows(trip: Trip) {
  const attribution = trip.attributionMeta;

  if (trip.destinationImageSource === 'pexels') {
    const photographer = attribution?.photographer || 'Unknown photographer';
    return {
      title: 'Photo attribution',
      rows: [`Photo by ${photographer} on Pexels`, `Source: ${attribution?.sourceLabel || 'Pexels'}`],
      linkLabel: attribution?.sourceUrl ? 'Open photo source' : attribution?.photographerUrl ? 'Open photographer profile' : null,
      linkUrl: attribution?.sourceUrl ?? attribution?.photographerUrl ?? null,
    };
  }

  if (trip.destinationImageSource === 'wikimedia') {
    const rows = [
      attribution?.title ? `Title: ${attribution.title}` : null,
      attribution?.author ? `Author: ${attribution.author}` : null,
      attribution?.license ? `License: ${attribution.license}` : null,
      `Source: ${attribution?.sourceLabel || 'Wikimedia Commons'}`,
    ].filter(Boolean) as string[];

    return {
      title: 'Image attribution',
      rows,
      linkLabel: attribution?.sourceUrl ? 'Open source page' : null,
      linkUrl: attribution?.sourceUrl ?? null,
    };
  }

  if (trip.destinationImageSource === 'curated') {
    return {
      title: 'Image attribution',
      rows: [trip.attributionText || 'Curated destination image'],
      linkLabel: null,
      linkUrl: null,
    };
  }

  return {
    title: 'Image attribution',
    rows: ['Default Pineapple image'],
    linkLabel: null,
    linkUrl: null,
  };
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
  const [attributionVisible, setAttributionVisible] = useState(false);
  const attributionContent = useMemo(() => buildAttributionRows(trip), [trip]);
  const imageUri = trip.destinationImageLocalPath ?? trip.coverImageUri;

  return (
    <>
      <Pressable onPress={onPress} disabled={!onPress} style={styles.pressable}>
        <View style={styles.card}>
          {imageUri ? <ManagedFileImage uri={imageUri} style={styles.image} /> : null}
          <LinearGradient colors={fallbackGradient(trip.destinationType)} style={styles.fallback} />
          <LinearGradient colors={['rgba(10, 28, 44, 0.14)', 'rgba(10, 28, 44, 0.74)']} style={styles.overlay} />

          <View style={styles.content}>
            <View style={styles.copy}>
              <Text style={styles.destination}>{trip.destination.toUpperCase()}</Text>
              <Text style={styles.title}>{trip.name}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <Text style={styles.meta}>{meta}</Text>
              <View style={styles.badgeRow}>
                {badgeLabel ? <Text style={styles.badge}>{badgeLabel}</Text> : null}
                <Text style={styles.daysLabel}>{daysTillTripLabel(trip)}</Text>
              </View>
              {fallbackLabel ? <Text style={styles.helper}>{fallbackLabel}</Text> : null}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onOpenFlights} disabled={!onOpenFlights} style={styles.iconButton}>
                <MaterialIcons name="flight" size={24} color={colors.white} />
              </Pressable>
              <Pressable onPress={onOpenHotel} disabled={!onOpenHotel} style={styles.iconButton}>
                <MaterialIcons name="hotel" size={24} color={colors.white} />
              </Pressable>
              <Pressable onPress={onOpenTransfers} disabled={!onOpenTransfers} style={styles.iconButton}>
                <MaterialIcons name="swap-horiz" size={24} color={colors.white} />
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              setAttributionVisible(true);
            }}
            style={styles.infoButton}
            accessibilityLabel="Open image attribution"
            hitSlop={10}
          >
            <MaterialIcons name="info-outline" size={16} color="rgba(255,255,255,0.92)" />
          </Pressable>
        </View>
      </Pressable>

      <AppModal visible={attributionVisible} title={attributionContent.title} onClose={() => setAttributionVisible(false)}>
        <Text style={styles.modalLead}>{trip.attributionText || 'Default Pineapple image'}</Text>
        <View style={styles.modalRows}>
          {attributionContent.rows.map((row) => (
            <Text key={row} style={styles.modalRow}>
              {row}
            </Text>
          ))}
        </View>
        {attributionContent.linkUrl && attributionContent.linkLabel ? (
          <AppButton
            label={attributionContent.linkLabel}
            tone="outline"
            onPress={() => {
              void Linking.openURL(attributionContent.linkUrl as string).catch(() => undefined);
            }}
          />
        ) : null}
      </AppModal>
    </>
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
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 1.8,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  daysLabel: {
    alignSelf: 'center',
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    opacity: 0.96,
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
    paddingBottom: spacing.xl,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLead: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  modalRows: {
    gap: spacing.xs,
  },
  modalRow: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
