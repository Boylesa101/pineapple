import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing } from '@/constants/theme';

const iconMap = {
  home: 'home',
  account: 'person',
  vault: 'folder',
  trips: 'luggage',
  sos: 'sos',
  packing: 'checkroom',
  itinerary: 'event-note',
} satisfies Record<string, keyof typeof MaterialIcons.glyphMap>;

export function SafeAreaAwareBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  const visibleRoutes = state.routes.filter((route) => (descriptors[route.key]?.options as { href?: unknown } | undefined)?.href !== null);

  return (
    <View style={[styles.outer, { paddingBottom: bottomInset, paddingHorizontal: 12 }]}>
      <View style={styles.inner}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((candidate) => candidate.key === route.key);
          const isFocused = state.index === routeIndex;
          const options = descriptors[route.key]?.options ?? {};
          const label = typeof options.title === 'string' ? options.title : route.name;
          const iconName = iconMap[route.name as keyof typeof iconMap] ?? 'circle';
          const isSos = route.name === 'sos';
          const tint = isFocused ? (isSos ? colors.dangerRed : colors.primaryBlue) : '#6F8396';

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <MaterialIcons name={iconName} size={22} color={tint} />
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
    paddingTop: spacing.xs,
  },
  inner: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0EBF6',
    paddingHorizontal: 6,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.nav,
  },
  item: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textAlign: 'center',
  },
});
