import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { ExpiryBadge } from '@/components/passport/ExpiryBadge';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, PassportVerificationStatus, Traveller } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { derivePassportData, buildPassportMrz } from '@/utils/passport';

type Props = {
  document: Document;
  traveller?: Traveller | null;
  expiryBadge: { label: string; tone: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger' };
  verificationStatus: PassportVerificationStatus;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

export function PassportOpenView({ document, traveller, expiryBadge, verificationStatus }: Props) {
  const { width } = useWindowDimensions();
  const passport = derivePassportData(document, traveller);
  const [mrzOne, mrzTwo] = buildPassportMrz(document, traveller);
  const horizontal = width >= 720;

  return (
    <View style={[styles.spread, horizontal ? styles.spreadHorizontal : styles.spreadVertical]}>
      <View style={[styles.page, styles.leftPage, horizontal ? styles.pageHalf : null]}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Passport</Text>
          <VerificationBadge status={verificationStatus} />
        </View>
        <View style={styles.photoFrame}>
          {document.previewUri ? (
            <Image source={document.previewUri} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>No scan</Text>
            </View>
          )}
        </View>
        <View style={styles.inlineChips}>
          <ExpiryBadge label={expiryBadge.label} tone={expiryBadge.tone} />
        </View>
        <DetailRow label="Type" value={passport.passportType} />
        <DetailRow label="Country code" value={passport.countryCode} />
        <DetailRow label="Passport number" value={document.documentNumber} />
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Signature / stamp</Text>
          <View style={styles.signatureArea}>
            <Text style={styles.signatureText}>{document.holderName || traveller?.fullName || 'Holder name'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.page, styles.rightPage, horizontal ? styles.pageHalf : null]}>
        <Text style={styles.pageTitle}>Identity</Text>
        <DetailRow label="Surname" value={passport.surname} />
        <DetailRow label="Given names" value={passport.givenNames} />
        <DetailRow label="Nationality" value={passport.nationality} />
        <DetailRow label="Date of birth" value={formatShortDate(passport.dateOfBirth)} />
        <DetailRow label="Place of birth" value={passport.placeOfBirth} />
        <DetailRow label="Date of issue" value={formatShortDate(document.issueDate)} />
        <DetailRow label="Expiry date" value={formatShortDate(document.expiryDate)} />
        <View style={styles.mrzBlock}>
          <Text style={styles.mrzLine}>{mrzOne}</Text>
          <Text style={styles.mrzLine}>{mrzTwo}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spread: {
    gap: 0,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D5C3A7',
    backgroundColor: '#F9F0E0',
  },
  spreadHorizontal: {
    flexDirection: 'row',
  },
  spreadVertical: {
    flexDirection: 'column',
  },
  page: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: '#FBF5E8',
  },
  pageHalf: {
    flex: 1,
  },
  leftPage: {
    borderRightWidth: 1,
    borderRightColor: '#DECBAE',
  },
  rightPage: {
    backgroundColor: '#FFF9EF',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  pageTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#E9E0CF',
    borderWidth: 1,
    borderColor: '#D9C5A7',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  inlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailRow: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DAC1',
    paddingBottom: spacing.xs,
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  signatureBlock: {
    gap: spacing.xs,
  },
  signatureLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  signatureArea: {
    minHeight: 68,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#DABF99',
    backgroundColor: '#FFF6E8',
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  signatureText: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  mrzBlock: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#EFE4D1',
    padding: spacing.sm,
    gap: 2,
  },
  mrzLine: {
    color: '#493A27',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.2,
  },
});
