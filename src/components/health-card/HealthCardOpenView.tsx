import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { ExpiryBadge } from '@/components/passport/ExpiryBadge';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller, VerificationStatus } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { deriveHealthCardData } from '@/utils/healthCard';

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

export function HealthCardOpenView({ document, traveller, expiryBadge, verificationStatus }: Props) {
  const { width } = useWindowDimensions();
  const record = deriveHealthCardData(document, traveller);
  const horizontal = width >= 720;

  return (
    <View style={[styles.record, horizontal ? styles.recordHorizontal : styles.recordVertical]}>
      <View style={[styles.panel, styles.cardPanel, horizontal ? styles.panelHalf : null]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>GHIC / EHIC</Text>
          <VerificationBadge status={verificationStatus} />
        </View>
        <View style={styles.cardFace}>
          <View style={styles.cardFaceTop}>
            <Text style={styles.cardIssuer}>{record.issuer || 'Health Insurance Card'}</Text>
            <ExpiryBadge label={expiryBadge.label} tone={expiryBadge.tone} />
          </View>
          <View style={styles.cardFaceBody}>
            <View style={styles.photoFrame}>
              {document.previewUri ? (
                <Image source={document.previewUri} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={styles.photoPlaceholderText}>No scan</Text>
                </View>
              )}
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardHolder}>{document.holderName || traveller?.fullName || 'Card holder'}</Text>
              <Text style={styles.cardNumber}>{document.documentNumber || 'Number not set'}</Text>
              <Text style={styles.cardCountry}>{record.countryCode || 'Country code not set'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.panel, styles.infoPanel, horizontal ? styles.panelHalf : null]}>
        <Text style={styles.panelTitle}>Travel health details</Text>
        <DetailRow label="Holder name" value={document.holderName || traveller?.fullName || ''} />
        <DetailRow label="Card number" value={document.documentNumber} />
        <DetailRow label="Issuer" value={record.issuer} />
        <DetailRow label="Issue date" value={formatShortDate(document.issueDate)} />
        <DetailRow label="Expiry date" value={formatShortDate(document.expiryDate)} />
        <DetailRow label="Country code" value={record.countryCode} />
        <DetailRow label="Emergency line" value={record.emergencyLine} />
        <DetailRow label="Status" value={record.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  record: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8E3EB',
    backgroundColor: '#F1F8FC',
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
  cardPanel: {
    backgroundColor: '#EAF6FC',
    borderRightWidth: 1,
    borderRightColor: '#D4E7F1',
  },
  infoPanel: {
    backgroundColor: '#F9FDFF',
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
  cardFace: {
    borderRadius: radii.lg,
    backgroundColor: '#0C86C7',
    padding: spacing.md,
    gap: spacing.md,
  },
  cardFaceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIssuer: {
    flex: 1,
    color: '#F5FBFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardFaceBody: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  photoFrame: {
    width: 92,
    aspectRatio: 0.85,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
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
    color: '#E7F6FF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardHolder: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
  },
  cardNumber: {
    color: '#D9F2FF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  cardCountry: {
    color: '#C7EDFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  detailRow: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#DCEBF3',
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
});
