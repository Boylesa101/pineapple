import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import type { VibeItem } from '@/services/tripadvisorVibesService';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { VibeSwipeCard } from '@/components/vibes/VibeSwipeCard';
import { VibesEmptyState } from '@/components/vibes/VibesEmptyState';

type DeckItem = VibeItem & {
  imageUri: string | null;
};

type Props = {
  items: DeckItem[];
  resetKey: string;
  onSkip: (item: VibeItem) => void;
  onSave: (item: VibeItem) => void;
  onOpen: (url: string) => void;
  onRefresh?: () => void;
};

const STACK_DEPTH = 3;
const SWIPE_DISTANCE_TRIGGER = 118;
const SWIPE_VELOCITY_TRIGGER = 700;
const ROTATION_RANGE = 16;

type SwipeDirection = 'left' | 'right';
type DeckCardProps = {
  item: DeckItem;
  index: number;
  dragX: SharedValue<number>;
  isCurrent: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  onOpen: (url: string) => void;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function badgeOpacity(value: number, direction: SwipeDirection) {
  'worklet';
  return interpolate(direction === 'right' ? value : -value, [18, SWIPE_DISTANCE_TRIGGER], [0, 1], 'clamp');
}

function DeckCard({
  item,
  index,
  dragX,
  isCurrent,
  onSwipe,
  onOpen,
}: DeckCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = clamp(Math.abs(dragX.value) / SWIPE_DISTANCE_TRIGGER, 0, 1);

    if (!isCurrent) {
      const translateY = index === 1 ? 16 - progress * 8 : 30 - progress * 10;
      const scale = index === 1 ? 0.97 + progress * 0.02 : 0.94 + progress * 0.025;
      return {
        transform: [{ translateY }, { scale }],
        opacity: index > 2 ? 0 : 1,
      };
    }

    return {
      transform: [
        { translateX: dragX.value },
        { rotate: `${interpolate(dragX.value, [-220, 0, 220], [-ROTATION_RANGE, 0, ROTATION_RANGE])}deg` },
      ],
    };
  });

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isCurrent)
        .activeOffsetX([-8, 8])
        .failOffsetY([-18, 18])
        .onBegin(() => {
          cancelAnimation(dragX);
        })
        .onUpdate((event) => {
          dragX.value = clamp(event.translationX, -360, 360);
        })
        .onEnd((event) => {
          const shouldSave = event.translationX >= SWIPE_DISTANCE_TRIGGER || event.velocityX >= SWIPE_VELOCITY_TRIGGER;
          const shouldSkip = event.translationX <= -SWIPE_DISTANCE_TRIGGER || event.velocityX <= -SWIPE_VELOCITY_TRIGGER;

          if (shouldSave) {
            dragX.value = withTiming(420, { duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1) }, (finished) => {
              if (!finished) return;
              dragX.value = 0;
              runOnJS(onSwipe)('right');
            });
            return;
          }

          if (shouldSkip) {
            dragX.value = withTiming(-420, { duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1) }, (finished) => {
              if (!finished) return;
              dragX.value = 0;
              runOnJS(onSwipe)('left');
            });
            return;
          }

          dragX.value = withSpring(0, {
            damping: 18,
            stiffness: 180,
            mass: 0.84,
          });
        }),
    [dragX, isCurrent, onSwipe]
  );

  const saveBadgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity(dragX.value, 'right'),
    transform: [{ scale: interpolate(dragX.value, [0, SWIPE_DISTANCE_TRIGGER], [0.92, 1], 'clamp') }],
  }));

  const skipBadgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity(dragX.value, 'left'),
    transform: [{ scale: interpolate(-dragX.value, [0, SWIPE_DISTANCE_TRIGGER], [0.92, 1], 'clamp') }],
  }));

  const card = (
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.cardLayer,
        {
          zIndex: 20 - index,
        },
        animatedStyle,
      ]}
    >
      <VibeSwipeCard item={item} imageUri={item.imageUri} onOpen={onOpen} />
      {isCurrent ? (
        <>
          <Animated.View style={[styles.badge, styles.badgeSave, saveBadgeStyle]}>
            <Text style={styles.badgeLabel}>SAVE</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeSkip, skipBadgeStyle]}>
            <Text style={styles.badgeLabel}>SKIP</Text>
          </Animated.View>
        </>
      ) : null}
    </Animated.View>
  );

  return isCurrent ? <GestureDetector gesture={gesture}>{card}</GestureDetector> : card;
}

export function VibeSwipeDeck({ items, resetKey, onSkip, onSave, onOpen, onRefresh }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragX = useSharedValue(0);
  const { width } = useWindowDimensions();

  useEffect(() => {
    setCurrentIndex(0);
    dragX.value = 0;
  }, [dragX, resetKey]);

  const currentItem = items[currentIndex] ?? null;
  const visibleItems = items.slice(currentIndex, currentIndex + STACK_DEPTH);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const item = items[currentIndex];
      if (!item) {
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (direction === 'right') {
        onSave(item);
      } else {
        onSkip(item);
      }
      setCurrentIndex((index) => index + 1);
    },
    [currentIndex, items, onSave, onSkip]
  );

  const triggerSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (!currentItem) {
        return;
      }

      dragX.value = withTiming(direction === 'right' ? 420 : -420, { duration: 210 }, (finished) => {
        if (!finished) return;
        dragX.value = 0;
        runOnJS(handleSwipe)(direction);
      });
    },
    [currentItem, dragX, handleSwipe]
  );

  const stackWidth = Math.min(width - spacing.lg * 2, 420);

  if (!currentItem) {
    return (
      <View style={styles.emptyWrap}>
        <VibesEmptyState
          icon="check-circle"
          title="Deck finished"
          description="You have worked through the current live vibe deck. Refresh for a new pass, or switch to Mood to review saved places."
        />
        {onRefresh ? (
          <Pressable accessibilityLabel="Refresh the live vibe deck" onPress={onRefresh} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={18} color={colors.primaryBlue} />
            <Text style={styles.refreshButtonLabel}>Refresh live picks</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.stackWrap, { width: stackWidth }]}>
        {visibleItems
          .map((item, index) => ({ item, index }))
          .reverse()
          .map(({ item, index }) => (
            <DeckCard
              key={`${item.category}-${item.id}`}
              item={item}
              index={index}
              dragX={dragX}
              isCurrent={index === 0}
              onSwipe={handleSwipe}
              onOpen={onOpen}
            />
          ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable accessibilityLabel="Skip this vibe" onPress={() => triggerSwipe('left')} style={[styles.actionButton, styles.skipButton]}>
          <MaterialIcons name="close" size={22} color={colors.primaryBlueText} />
        </Pressable>
        <View style={styles.counter}>
          <Text style={styles.counterLabel}>{items.length - currentIndex} left</Text>
        </View>
        <Pressable accessibilityLabel="Save this vibe to Mood" onPress={() => triggerSwipe('right')} style={[styles.actionButton, styles.saveButton]}>
          <MaterialIcons name="favorite" size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  stackWrap: {
    height: 520,
    alignSelf: 'center',
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.xl,
    ...shadows.hero,
  },
  badge: {
    position: 'absolute',
    top: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
  badgeSave: {
    left: spacing.lg,
    backgroundColor: 'rgba(47, 140, 98, 0.18)',
    borderColor: '#8EE5B7',
  },
  badgeSkip: {
    right: spacing.lg,
    backgroundColor: 'rgba(200, 81, 81, 0.18)',
    borderColor: '#FFC7C7',
  },
  badgeLabel: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  skipButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  saveButton: {
    backgroundColor: colors.sunsetCoral,
  },
  counter: {
    minWidth: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  emptyWrap: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.card,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshButtonLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
