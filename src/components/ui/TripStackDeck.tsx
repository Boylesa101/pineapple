import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
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

import type { Trip } from '@/types/models';
import { radii, shadows, spacing } from '@/constants/theme';
import { TripHeroCard } from './TripHeroCard';

type TripStackItem = {
  trip: Trip;
  subtitle: string;
  meta: string;
  badgeLabel?: string | null;
};

type Props = {
  items: TripStackItem[];
  onOpenTrip: (trip: Trip) => void;
  onOpenFlights: (trip: Trip) => void;
  onOpenHotel: (trip: Trip) => void;
  onOpenTransfers: (trip: Trip) => void;
};

type StackCardProps = {
  item: TripStackItem;
  absoluteIndex: number;
  visibleIndex: number;
  currentIndex: number;
  dragY: SharedValue<number>;
  onBringForward: (absoluteIndex: number) => void;
  onAdvance: (direction: 'next' | 'previous') => void;
  onOpenTrip: (trip: Trip) => void;
  onOpenFlights: (trip: Trip) => void;
  onOpenHotel: (trip: Trip) => void;
  onOpenTransfers: (trip: Trip) => void;
};

const CARD_HEIGHT = 228;
const STACK_OFFSETS = [0, 66, 126, 178];
const STACK_SCALES = [1, 0.992, 0.982, 0.972];
const SWIPE_DISTANCE_TRIGGER = 48;
const SWIPE_VELOCITY_TRIGGER = 520;
const MAX_DRAG = CARD_HEIGHT * 0.72;
const SWIPE_OUT_TRANSLATION = CARD_HEIGHT * 0.7;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function StackCard({
  item,
  absoluteIndex,
  visibleIndex,
  currentIndex,
  dragY,
  onBringForward,
  onAdvance,
  onOpenTrip,
  onOpenFlights,
  onOpenHotel,
  onOpenTransfers,
}: StackCardProps) {
  const offset = STACK_OFFSETS[visibleIndex] ?? STACK_OFFSETS[STACK_OFFSETS.length - 1];
  const scale = STACK_SCALES[visibleIndex] ?? STACK_SCALES[STACK_SCALES.length - 1];
  const isCurrent = visibleIndex === 0;
  const canAdvanceNext = currentIndex < Infinity;

  const animatedStyle = useAnimatedStyle(() => {
    if (!isCurrent) {
      return {
        transform: [{ scale }],
      };
    }

    return {
      transform: [
        { scale },
        { translateY: dragY.value },
        {
          rotate: `${interpolate(dragY.value, [-MAX_DRAG, 0, MAX_DRAG], [-0.55, 0, 0.55])}deg`,
        },
      ],
    };
  }, [isCurrent, scale, dragY]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isCurrent)
        .activeOffsetY([-8, 8])
        .failOffsetX([-28, 28])
        .onBegin(() => {
          cancelAnimation(dragY);
        })
        .onUpdate((event) => {
          dragY.value = clamp(event.translationY, -MAX_DRAG, MAX_DRAG);
        })
        .onEnd((event) => {
          const shouldGoNext = event.translationY <= -SWIPE_DISTANCE_TRIGGER || event.velocityY <= -SWIPE_VELOCITY_TRIGGER;
          const shouldGoPrevious = event.translationY >= SWIPE_DISTANCE_TRIGGER || event.velocityY >= SWIPE_VELOCITY_TRIGGER;

          if (shouldGoNext) {
            dragY.value = withTiming(
              -SWIPE_OUT_TRANSLATION,
              {
                duration: 220,
                easing: Easing.bezier(0.22, 1, 0.36, 1),
              },
              (finished) => {
                if (!finished) return;
                dragY.value = 0;
                runOnJS(onAdvance)('next');
              }
            );
            return;
          }

          if (shouldGoPrevious) {
            dragY.value = withTiming(
              SWIPE_OUT_TRANSLATION,
              {
                duration: 220,
                easing: Easing.bezier(0.22, 1, 0.36, 1),
              },
              (finished) => {
                if (!finished) return;
                dragY.value = 0;
                runOnJS(onAdvance)('previous');
              }
            );
            return;
          }

          dragY.value = withSpring(0, {
            damping: 18,
            stiffness: 180,
            mass: 0.86,
            overshootClamping: false,
          });
        }),
    [dragY, isCurrent, onAdvance]
  );

  const card = (
    <Animated.View
      style={[
        styles.stackCard,
        {
          top: offset,
          zIndex: 20 - visibleIndex,
        },
        animatedStyle,
      ]}
    >
      {!isCurrent ? (
        <Pressable
          onPress={() => onBringForward(absoluteIndex)}
          style={styles.peekTapTarget}
          accessibilityLabel={`Bring ${item.trip.name} forward`}
        />
      ) : null}
      <TripHeroCard
        trip={item.trip}
        subtitle={item.subtitle}
        meta={item.meta}
        badgeLabel={item.badgeLabel}
        onPress={() => onOpenTrip(item.trip)}
        onOpenFlights={() => onOpenFlights(item.trip)}
        onOpenHotel={() => onOpenHotel(item.trip)}
        onOpenTransfers={() => onOpenTransfers(item.trip)}
      />
    </Animated.View>
  );

  if (!isCurrent) {
    return card;
  }

  return <GestureDetector gesture={gesture}>{card}</GestureDetector>;
}

export function TripStackDeck({ items, onOpenTrip, onOpenFlights, onOpenHotel, onOpenTransfers }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (currentIndex > Math.max(items.length - 1, 0)) {
      setCurrentIndex(Math.max(items.length - 1, 0));
    }
  }, [currentIndex, items.length]);

  const animateToIndex = useCallback((nextIndex: number) => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        springDamping: 0.88,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setCurrentIndex(nextIndex);
  }, []);

  const advance = useCallback(
    (direction: 'next' | 'previous') => {
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return;
      }
      animateToIndex(nextIndex);
    },
    [animateToIndex, currentIndex, items.length]
  );

  const visibleItems = items.slice(currentIndex, currentIndex + 4);
  const stackHeight = CARD_HEIGHT + Math.max(0, Math.min(items.length - currentIndex - 1, 3)) * 58;

  return (
    <View style={[styles.stackWrap, { height: stackHeight }]}>
      {visibleItems
        .map((item, visibleIndex) => ({ item, visibleIndex, absoluteIndex: currentIndex + visibleIndex }))
        .reverse()
        .map(({ item, visibleIndex, absoluteIndex }) => (
          <StackCard
            key={item.trip.id}
            item={item}
            absoluteIndex={absoluteIndex}
            visibleIndex={visibleIndex}
            currentIndex={currentIndex}
            dragY={dragY}
            onBringForward={animateToIndex}
            onAdvance={advance}
            onOpenTrip={onOpenTrip}
            onOpenFlights={onOpenFlights}
            onOpenHotel={onOpenHotel}
            onOpenTransfers={onOpenTransfers}
          />
        ))}
      {items.length > 1 ? <Text style={styles.hint}>Swipe up or down to move through trips</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stackWrap: {
    width: '100%',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  stackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radii.lg,
    ...shadows.hero,
  },
  peekTapTarget: {
    ...StyleSheet.absoluteFillObject,
    top: 76,
    zIndex: 1,
  },
  hint: {
    position: 'absolute',
    bottom: -spacing.sm,
    right: spacing.xs,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(13,59,102,0.62)',
  },
});
