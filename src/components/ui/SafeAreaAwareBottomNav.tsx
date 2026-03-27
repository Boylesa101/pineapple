import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/theme';

const iconMap = {
  home: 'home',
  vault: 'folder',
  vibe: 'travel-explore',
  sos: 'sos',
} satisfies Record<string, keyof typeof MaterialIcons.glyphMap>;

export function SafeAreaAwareBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const currentRoute = state.routes[state.index];
  const isVibeRoute = currentRoute?.name === 'vibe';
  const currentParams = (currentRoute?.params ?? {}) as { mode?: string };
  const vibeMode = currentParams.mode === 'mood' ? 'mood' : 'vibe';

  const visibleRoutes = state.routes;
  const isCompact = visibleRoutes.length <= 4;

  if (isVibeRoute) {
    return (
      <View style={[styles.outer, { paddingBottom: bottomInset, paddingHorizontal: 12 }]}>
        <Pressable
          onPress={() => navigation.navigate('vibe', { mode: 'vibe' })}
          style={[styles.modeItem, vibeMode === 'vibe' ? styles.modeItemActive : null]}
          accessibilityRole="button"
          accessibilityState={vibeMode === 'vibe' ? { selected: true } : {}}
        >
          <Text style={[styles.modeLabel, vibeMode === 'vibe' ? styles.modeLabelActive : null]}>Vibe</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('vibe', { mode: 'mood' })}
          style={[styles.modeItem, vibeMode === 'mood' ? styles.modeItemActive : null]}
          accessibilityRole="button"
          accessibilityState={vibeMode === 'mood' ? { selected: true } : {}}
        >
          <Text style={[styles.modeLabel, vibeMode === 'mood' ? styles.modeLabelActive : null]}>Mood</Text>
        </Pressable>
      </View>
    );
  }

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
            style={[styles.item, isCompact ? styles.itemCompact : null, itemStyle]}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <MaterialIcons name={iconName} size={isCompact ? 30 : 26} color={tint} style={{ opacity: labelOpacity }} />
            <Text style={[styles.label, isCompact ? styles.labelCompact : null, { color: tint, opacity: labelOpacity }]}>{label}</Text>
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
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.md,
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  itemCompact: {
    minHeight: 76,
    gap: 6,
  },
  modeItem: {
    flex: 1,
    minHeight: 68,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 12,
  },
  modeLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  modeLabelActive: {
    color: colors.white,
  },
});
