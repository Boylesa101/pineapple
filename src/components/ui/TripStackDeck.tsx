import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

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

const CARD_HEIGHT = 228;
const STACK_OFFSETS = [0, 54, 102, 146];
const STACK_SCALES = [1, 0.989, 0.978, 0.966];
const SWIPE_DISTANCE_TRIGGER = 56;
const SWIPE_VELOCITY_TRIGGER = 0.55;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TripStackDeck({ items, onOpenTrip, onOpenFlights, onOpenHotel, onOpenTransfers }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentIndex > Math.max(items.length - 1, 0)) {
      setCurrentIndex(Math.max(items.length - 1, 0));
    }
  }, [currentIndex, items.length]);

  function animateToIndex(nextIndex: number) {
    LayoutAnimation.configureNext({
      duration: 340,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        springDamping: 0.9,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setCurrentIndex(nextIndex);
  }

  function completeSwipe(direction: 'next' | 'previous') {
    const canAdvance = direction === 'next' ? currentIndex < items.length - 1 : currentIndex > 0;
    if (!canAdvance) {
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 130,
        mass: 0.9,
      }).start();
      return;
    }

    const toValue = direction === 'next' ? -CARD_HEIGHT * 0.62 : CARD_HEIGHT * 0.62;
    Animated.spring(dragY, {
      toValue,
      useNativeDriver: true,
      damping: 19,
      stiffness: 140,
      mass: 0.88,
    }).start(() => {
      dragY.setValue(0);
      animateToIndex(direction === 'next' ? currentIndex + 1 : currentIndex - 1);
    });
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          dragY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const clamped = Math.max(-CARD_HEIGHT * 0.7, Math.min(CARD_HEIGHT * 0.7, gesture.dy));
          dragY.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy <= -SWIPE_DISTANCE_TRIGGER || gesture.vy <= -SWIPE_VELOCITY_TRIGGER) {
            completeSwipe('next');
            return;
          }
          if (gesture.dy >= SWIPE_DISTANCE_TRIGGER || gesture.vy >= SWIPE_VELOCITY_TRIGGER) {
            completeSwipe('previous');
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 128,
            mass: 0.92,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 128,
            mass: 0.92,
          }).start();
        },
      }),
    [currentIndex, dragY, items.length]
  );

  const visibleItems = items.slice(currentIndex, currentIndex + 4);
  const stackHeight = CARD_HEIGHT + Math.max(0, Math.min(items.length - currentIndex - 1, 3)) * 48;

  return (
    <View style={[styles.stackWrap, { height: stackHeight }]}>
      {visibleItems
        .map((item, visibleIndex) => ({ item, visibleIndex, absoluteIndex: currentIndex + visibleIndex }))
        .reverse()
        .map(({ item, visibleIndex, absoluteIndex }) => {
          const offset = STACK_OFFSETS[visibleIndex] ?? STACK_OFFSETS[STACK_OFFSETS.length - 1];
          const scale = STACK_SCALES[visibleIndex] ?? STACK_SCALES[STACK_SCALES.length - 1];
          const isCurrent = visibleIndex === 0;

          return (
            <Animated.View
              key={item.trip.id}
              style={[
                styles.stackCard,
                {
                  top: offset,
                  zIndex: 20 - visibleIndex,
                  transform: isCurrent
                    ? [
                        { scale },
                        { translateY: dragY },
                        {
                          rotate: dragY.interpolate({
                            inputRange: [-180, 0, 180],
                            outputRange: ['-0.75deg', '0deg', '0.75deg'],
                          }),
                        },
                      ]
                    : [{ scale }],
                },
              ]}
              {...(isCurrent ? panResponder.panHandlers : {})}
            >
              {!isCurrent ? (
                <Pressable
                  onPress={() => animateToIndex(absoluteIndex)}
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
        })}
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
    top: 88,
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
