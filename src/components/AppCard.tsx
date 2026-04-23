import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  variant?: 'standard' | 'compact';
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ title, subtitle, right, children, variant = 'standard', style }: Props) {
  return (
    <View style={[styles.card, variant === 'compact' ? styles.compactCard : styles.standardCard, style]}>
      {(title || subtitle || right) && (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    gap: 14,
    ...shadows.card,
  },
  // Pineapple secondary-card standard:
  // - standard: full width, min height 112, radius 20, 16/18 padding
  // - compact launcher: full width, min height 88, radius 20, 16 padding
  standardCard: {
    minHeight: 112,
    paddingVertical: spacing.md,
    paddingHorizontal: 18,
  },
  compactCard: {
    minHeight: 88,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
