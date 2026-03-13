import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { PineappleMark } from '@/brand/PineappleMark';
import { colors, radii, spacing } from '@/constants/theme';

export function DashboardHeader({
  title,
  onSettings,
}: {
  title: string;
  onSettings: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <View style={styles.logoPill}>
          <PineappleMark size={28} simplified />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Pineapple</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <Pressable onPress={onSettings} style={styles.settingsButton}>
        <MaterialIcons name="tune" size={22} color={colors.nightNavy} />
      </Pressable>
    </View>
  );
}

export function DashboardActionTile({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionTile}>
      <View style={styles.actionIconWrap}>
        <MaterialIcons name={icon} size={24} color={colors.nightNavy} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export function DashboardSummaryTile({
  title,
  value,
  icon,
  tone = 'default',
  onPress,
}: {
  title: string;
  value: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  tone?: 'default' | 'blue' | 'gold' | 'coral';
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.summaryTile, summaryToneStyles[tone]]}>
      <View style={styles.summaryIconRow}>
        <MaterialIcons name={icon} size={18} color={colors.nightNavy} />
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function DashboardAlertCard({
  title,
  subtitle,
  tone = 'gold',
}: {
  title: string;
  subtitle: string;
  tone?: 'gold' | 'coral' | 'danger';
}) {
  return (
    <View style={[styles.alertCard, alertToneStyles[tone]]}>
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function DashboardSectionHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

const summaryToneStyles = StyleSheet.create({
  default: { backgroundColor: '#FFF9F0' },
  blue: { backgroundColor: '#EAF6FA' },
  gold: { backgroundColor: '#FFF5D9' },
  coral: { backgroundColor: '#FFF0EB' },
});

const alertToneStyles = StyleSheet.create({
  gold: { backgroundColor: '#FFF7E5', borderColor: '#F1CF74' },
  coral: { backgroundColor: '#FFF0EB', borderColor: '#FFC2B3' },
  danger: { backgroundColor: '#FDECEC', borderColor: '#F1B9B9' },
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  logoPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7E2',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerText: {
    gap: 2,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTile: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 116,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3D2',
  },
  actionLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  summaryTile: {
    flex: 1,
    minWidth: '47%',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryTitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  summaryValue: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  alertCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  alertTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  alertSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
});
