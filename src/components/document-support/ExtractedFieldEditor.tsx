import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { VerificationBadge } from '@/components/document-support/VerificationBadge';
import { colors, radii, spacing } from '@/constants/theme';
import type { VerificationStatus } from '@/types/models';

type Props = PropsWithChildren<{
  title: string;
  verificationStatus: VerificationStatus;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  helperText?: string | null;
}>;

export function ExtractedFieldEditor({
  title,
  verificationStatus,
  description,
  actionLabel,
  onAction,
  actionDisabled,
  actionLoading,
  helperText,
  children,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <VerificationBadge status={verificationStatus} />
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          tone="secondary"
          onPress={onAction}
          disabled={actionDisabled}
          loading={actionLoading}
        />
      ) : null}
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: '#F8FBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    gap: spacing.sm,
  },
});
