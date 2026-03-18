import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description: string;
};

const toneConfig = {
  info: {
    backgroundColor: '#F4F9FF',
    borderColor: '#CFE2FF',
    iconColor: colors.primaryBlue,
    iconName: 'info-outline' as const,
  },
  warning: {
    backgroundColor: '#FFF8E8',
    borderColor: '#F2D28A',
    iconColor: colors.warning,
    iconName: 'warning-amber' as const,
  },
  danger: {
    backgroundColor: '#FFF1F0',
    borderColor: '#F3BBB8',
    iconColor: colors.danger,
    iconName: 'error-outline' as const,
  },
  success: {
    backgroundColor: '#EFFAF5',
    borderColor: '#BFE6D2',
    iconColor: colors.success,
    iconName: 'check-circle-outline' as const,
  },
};

export function DocumentNoticeBanner({ tone = 'info', title, description }: Props) {
  const config = toneConfig[tone];

  return (
    <View style={[styles.banner, { backgroundColor: config.backgroundColor, borderColor: config.borderColor }]}>
      <MaterialIcons name={config.iconName} size={20} color={config.iconColor} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
