import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DocumentMetaRow } from '@/components/document-support/DocumentMetaRow';
import { ExpiryBadge } from '@/components/document-support/ExpiryBadge';
import { VerificationBadge } from '@/components/document-support/VerificationBadge';
import { SensitiveFieldReveal } from '@/components/payment-card/SensitiveFieldReveal';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller, VerificationStatus } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { derivePaymentCardData, formatPaymentCardNumber, maskPaymentCardNumber } from '@/utils/paymentCard';

type Props = {
  document: Document;
  traveller?: Traveller | null;
  expiryBadge: { label: string; tone: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger' };
  verificationStatus: VerificationStatus;
};

export function PaymentCardOpenView({ document, traveller, expiryBadge, verificationStatus }: Props) {
  const { width } = useWindowDimensions();
  const record = derivePaymentCardData(document, traveller);
  const horizontal = width >= 720;
  const [numberRevealed, setNumberRevealed] = useState(false);

  return (
    <View style={[styles.record, horizontal ? styles.recordHorizontal : styles.recordVertical]}>
      <View style={[styles.panel, styles.summaryPanel, horizontal ? styles.panelHalf : null]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Stored payment card</Text>
          <VerificationBadge status={verificationStatus} />
        </View>
        <SensitiveFieldReveal
          label="Card number"
          value={numberRevealed ? formatPaymentCardNumber(document.documentNumber) : maskPaymentCardNumber(document.documentNumber)}
          revealed={numberRevealed}
          onToggle={() => setNumberRevealed((value) => !value)}
        />
        <View style={styles.inlineRow}>
          <ExpiryBadge label={expiryBadge.label} tone={expiryBadge.tone} />
          <Text style={styles.privateNote}>CVV stays hidden by default</Text>
        </View>
        <DocumentMetaRow label="Card holder" value={document.holderName || traveller?.fullName || ''} borderColor="#E9DCCB" />
        <DocumentMetaRow label="Card type" value={record.cardType} borderColor="#E9DCCB" />
        <DocumentMetaRow label="Bank" value={record.bank} borderColor="#E9DCCB" />
        <DocumentMetaRow label="Expiry" value={formatShortDate(document.expiryDate)} borderColor="#E9DCCB" />
      </View>

      <View style={[styles.panel, styles.infoPanel, horizontal ? styles.panelHalf : null]}>
        <Text style={styles.panelTitle}>Secure record</Text>
        <DocumentMetaRow label="Masked number" value={maskPaymentCardNumber(document.documentNumber)} borderColor="#E9DCCB" />
        <DocumentMetaRow label="Billing details" value={record.billingDetails} borderColor="#E9DCCB" />
        <DocumentMetaRow label="Travel note" value={document.notes} borderColor="#E9DCCB" />
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>Sensitive fields</Text>
          <Text style={styles.footerValue}>
            Pineapple never reveals the security code by default. Full card numbers only show after deliberate action on this device.
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
    borderColor: '#E2D3C0',
    backgroundColor: '#FBF5EE',
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
  summaryPanel: {
    backgroundColor: '#F6EBDD',
    borderRightWidth: 1,
    borderRightColor: '#E6D6C4',
  },
  infoPanel: {
    backgroundColor: '#FFF9F2',
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
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  privateNote: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  footerBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#F4E8D9',
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
