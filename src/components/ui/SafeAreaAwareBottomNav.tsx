import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/theme';

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
      {visibleRoutes.map((route) => {
        const routeIndex = state.routes.findIndex((candidate) => candidate.key === route.key);
        const isFocused = state.index === routeIndex;
        const options = descriptors[route.key]?.options ?? {};
        const label = typeof options.title === 'string' ? options.title : route.name;
        const iconName = iconMap[route.name as keyof typeof iconMap] ?? 'circle';
        const itemStyle = isFocused ? styles.itemActive : null;
        const tint = colors.white;
        const labelOpacity = isFocused ? 1 : 0.74;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[styles.item, itemStyle]}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <MaterialIcons name={iconName} size={22} color={tint} style={{ opacity: labelOpacity }} />
            <Text style={[styles.label, { color: tint, opacity: labelOpacity }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.primaryBlue,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.md,
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textAlign: 'center',
  },
});
