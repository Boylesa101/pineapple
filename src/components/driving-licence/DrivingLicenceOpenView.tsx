import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { ExpiryBadge } from '@/components/passport/ExpiryBadge';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller, VerificationStatus } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { deriveDrivingLicenceData } from '@/utils/drivingLicence';

type Props = {
  document: Document;
  traveller?: Traveller | null;
  expiryBadge: { label: string; tone: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger' };
  verificationStatus: VerificationStatus;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

export function DrivingLicenceOpenView({ document, traveller, expiryBadge, verificationStatus }: Props) {
  const { width } = useWindowDimensions();
  const record = deriveDrivingLicenceData(document, traveller);
  const horizontal = width >= 720;

  return (
    <View style={[styles.record, horizontal ? styles.recordHorizontal : styles.recordVertical]}>
      <View style={[styles.panel, styles.photoPanel, horizontal ? styles.panelHalf : null]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Driving licence</Text>
          <VerificationBadge status={verificationStatus} />
        </View>
        <View style={styles.photoFrame}>
          {document.previewUri ? (
            <Image source={document.previewUri} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>No front scan</Text>
            </View>
          )}
        </View>
        <View style={styles.inlineRow}>
          <ExpiryBadge label={expiryBadge.label} tone={expiryBadge.tone} />
          <Text style={styles.scanStatus}>{document.secondaryLocalFileUri ? 'Front and back scans saved' : 'Front scan only'}</Text>
        </View>
        <DetailRow label="Full name" value={document.holderName || traveller?.fullName || ''} />
        <DetailRow label="Licence number" value={document.documentNumber} />
        <DetailRow label="Date of birth" value={formatShortDate(record.dateOfBirth)} />
        <DetailRow label="Issuing authority" value={record.issuingAuthority} />
      </View>

      <View style={[styles.panel, styles.infoPanel, horizontal ? styles.panelHalf : null]}>
        <Text style={styles.panelTitle}>Official record</Text>
        <DetailRow label="Address" value={record.address} />
        <DetailRow label="Date of issue" value={formatShortDate(document.issueDate)} />
        <DetailRow label="Expiry date" value={formatShortDate(document.expiryDate)} />
        <DetailRow label="Categories" value={record.categories} />
        <DetailRow label="Status" value={record.status} />
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>Scan record</Text>
          <Text style={styles.footerValue}>
            {document.secondaryLocalFileUri
              ? 'Front and reverse saved locally for quick reference.'
              : 'Add the reverse side to keep the categories and endorsements with the card.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  record: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4D7D8',
    backgroundColor: '#F7EFF2',
  },
  recordHorizontal: {
    flexDirection: 'row',
  },
  recordVertical: {
    flexDirection: 'column',
  },
  panel: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelHalf: {
    flex: 1,
  },
  photoPanel: {
    backgroundColor: '#F4E6EB',
    borderRightWidth: 1,
    borderRightColor: '#E3D1D8',
  },
  infoPanel: {
    backgroundColor: '#FFF8FB',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  panelTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#E8DDE1',
    borderWidth: 1,
    borderColor: '#D7C8CE',
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
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scanStatus: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  detailRow: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E9DBE0',
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
    lineHeight: 20,
  },
  footerBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#F3E5EB',
    gap: 4,
  },
  footerLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerValue: {
    color: colors.nightNavy,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
