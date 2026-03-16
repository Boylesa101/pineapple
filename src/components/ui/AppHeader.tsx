import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  badgeLabel: string;
  title: string;
  subtitle: string;
  actionIcon?: keyof typeof MaterialIcons.glyphMap;
  onActionPress?: () => void;
  badgeTone?: 'blue' | 'red';
  leftVisual?: ReactNode;
};

export function AppHeader({
  badgeLabel,
  title,
  subtitle,
  actionIcon = 'menu',
  onActionPress,
  badgeTone = 'blue',
  leftVisual,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        {leftVisual ?? (
          <View style={[styles.logo, badgeTone === 'red' ? styles.logoRed : null]}>
            <Text style={styles.logoText}>{badgeLabel}</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.iconButton}>
          <MaterialIcons name={actionIcon} size={22} color={colors.primaryBlue} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRed: {
    backgroundColor: colors.dangerRed,
  },
  logoText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  copy: {
    gap: 2,
    flex: 1,
  },
  title: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },
  subtitle: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E7FF',
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
