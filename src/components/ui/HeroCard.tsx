import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: 'blue' | 'red';
  badge?: ReactNode;
}>;

export function HeroCard({ title, description, actions, tone = 'blue', badge, children }: Props) {
  const palette =
    tone === 'red'
      ? ([colors.dangerRed, colors.dangerRedSoft] as const)
      : ([colors.primaryBlue, colors.primaryBlueSoft] as const);

  return (
    <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {badge}
      </View>
      {children}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.hero,
  },
  header: {
    gap: spacing.sm,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  description: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
