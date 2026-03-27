import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { VibeCategoryBadge } from '@/components/vibes/VibeCategoryBadge';
import { VibeRatingPill } from '@/components/vibes/VibeRatingPill';
import { VibeSocialLinksRow } from '@/components/vibes/VibeSocialLinksRow';
import type { VibeItem } from '@/services/tripadvisorVibesService';

type Props = {
  item: VibeItem;
  imageUri: string | null;
  onOpen: (url: string) => void;
};

export function VibeSwipeCard({ item, imageUri, onOpen }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.mediaShell}>
        {imageUri ? (
          <ManagedFileImage uri={imageUri} style={styles.image} />
        ) : (
          <>
            <LinearGradient colors={['#0D6EFD', '#2BA6CB', '#F4B400']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.imageFallbackBadge}>
              <MaterialIcons name="photo-camera" size={20} color="rgba(255,255,255,0.92)" />
              <Text style={styles.imageFallbackLabel}>Venue photo loading</Text>
            </View>
          </>
        )}
        <LinearGradient
          colors={['rgba(10, 18, 30, 0.06)', 'rgba(12, 27, 45, 0.16)', 'rgba(12, 27, 45, 0.84)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.topRow}>
          <View style={styles.topCopy}>
            <Text numberOfLines={2} style={styles.name}>
              {item.name}
            </Text>
            <Text numberOfLines={2} style={styles.address}>
              {item.address}
            </Text>
          </View>
          <VibeCategoryBadge category={item.category} label={item.displayCategory} />
        </View>

        <View style={styles.bottomRow}>
          <VibeRatingPill rating={item.rating} ranking={item.ranking} inverted />
          <View style={styles.actions}>
            <VibeSocialLinksRow
              tripadvisorUrl={item.tripadvisorUrl}
              websiteUrl={item.websiteUrl}
              onOpen={onOpen}
              inverted
            />
            {(item.websiteUrl || item.tripadvisorUrl) ? (
              <Pressable onPress={() => onOpen(item.websiteUrl ?? item.tripadvisorUrl ?? '')} style={styles.detailButton}>
                <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.hero,
  },
  mediaShell: {
    flex: 1,
    backgroundColor: colors.primaryBlueSurface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageFallbackBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 18, 30, 0.18)',
  },
  imageFallbackLabel: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  topRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  topCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  name: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  address: {
    color: 'rgba(255,255,255,0.84)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  bottomRow: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
