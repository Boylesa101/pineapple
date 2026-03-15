import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DocumentPreviewPane } from '@/components/formal-document/DocumentPreviewPane';
import { ExpiryBadge } from '@/components/passport/ExpiryBadge';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller, VerificationStatus } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { deriveFormalDocumentData } from '@/utils/formalDocument';

type Props = {
  document: Document;
  traveller?: Traveller | null;
  expiryBadge: { label: string; tone: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger' };
  verificationStatus: VerificationStatus;
  onOpenSource: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

export function FormalDocumentOpenView({ document, traveller, expiryBadge, verificationStatus, onOpenSource }: Props) {
  const { width } = useWindowDimensions();
  const record = deriveFormalDocumentData(document, traveller);
  const horizontal = width >= 820;

  return (
    <View style={[styles.record, horizontal ? styles.horizontal : styles.vertical]}>
      <View style={[styles.panel, styles.metaPanel, horizontal ? styles.panelHalf : null]}>
        <View style={styles.header}>
          <Text style={styles.title}>{record.title || 'Formal document'}</Text>
          <VerificationBadge status={verificationStatus} />
        </View>
        <View style={styles.inlineRow}>
          <ExpiryBadge label={expiryBadge.label} tone={expiryBadge.tone} />
          <Text style={styles.subtle}>{record.status || 'Stored'}</Text>
        </View>
        <DetailRow label="Holder" value={document.holderName || traveller?.fullName || ''} />
        <DetailRow label="Issuer" value={record.issuer} />
        <DetailRow label="Reference" value={record.referenceCode || document.documentNumber} />
        <DetailRow label="Issue date" value={formatShortDate(document.issueDate)} />
        <DetailRow label="Expiry / renewal" value={formatShortDate(document.expiryDate)} />
        <DetailRow label="Location" value={record.location} />
        <DetailRow label="Summary" value={record.summary || document.notes} />
      </View>

      <View style={[styles.panel, styles.previewPanel, horizontal ? styles.panelHalf : null]}>
        <DocumentPreviewPane
          previewUri={document.previewUri}
          localFileUri={document.localFileUri}
          mimeType={document.mimeType}
          onOpen={onOpenSource}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  record: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DFD1C1',
    backgroundColor: '#FCF7EF',
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column',
  },
  panel: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelHalf: {
    flex: 1,
  },
  metaPanel: {
    backgroundColor: '#F7EFE2',
    borderRightWidth: 1,
    borderRightColor: '#E4D6C6',
  },
  previewPanel: {
    backgroundColor: '#FFFDF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  subtle: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  detailRow: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E9DDCF',
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
