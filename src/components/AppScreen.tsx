import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  footer?: ReactNode;
}>;

export function AppScreen({ title, subtitle, scroll = true, children, footer }: Props) {
  const content = (
    <View style={styles.content}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.backgroundBlobOne} />
      <View style={styles.backgroundBlobTwo} />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmSand,
  },
  scroll: {
    paddingBottom: 120,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backgroundBlobOne: {
    position: 'absolute',
    top: -60,
    right: -50,
    height: 180,
    width: 180,
    borderRadius: 180,
    backgroundColor: '#FFE6BE',
  },
  backgroundBlobTwo: {
    position: 'absolute',
    top: 180,
    left: -70,
    height: 150,
    width: 150,
    borderRadius: 150,
    backgroundColor: '#DFF3F8',
    opacity: 0.7,
  },
});
