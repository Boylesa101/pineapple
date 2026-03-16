import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  footer?: ReactNode;
  backgroundColor?: string;
  hideBackgroundDecor?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({
  title,
  subtitle,
  scroll = true,
  children,
  footer,
  backgroundColor,
  hideBackgroundDecor = false,
  contentStyle,
}: Props) {
  const content = (
    <View style={[styles.content, !scroll ? styles.contentFill : null, contentStyle]}>
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
    <SafeAreaView style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]} edges={['top', 'bottom']}>
      {!hideBackgroundDecor ? (
        <LinearGradient
          colors={[colors.primaryBlueTint, colors.white, colors.white]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {!hideBackgroundDecor ? <View style={styles.topWash} /> : null}
      {scroll ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryBlueTint,
  },
  scroll: {
    paddingBottom: 152,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  contentFill: {
    flex: 1,
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
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#EDF6FF',
  },
});
