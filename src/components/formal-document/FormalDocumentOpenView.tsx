import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DocumentPreviewPane } from '@/components/formal-document/DocumentPreviewPane';
import { DocumentMetaRow } from '@/components/document-support/DocumentMetaRow';
import { ExpiryBadge } from '@/components/document-support/ExpiryBadge';
import { VerificationBadge } from '@/components/document-support/VerificationBadge';
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
        <DocumentMetaRow label="Holder" value={document.holderName || traveller?.fullName || ''} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Issuer" value={record.issuer} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Reference" value={record.referenceCode || document.documentNumber} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Issue date" value={formatShortDate(document.issueDate)} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Expiry / renewal" value={formatShortDate(document.expiryDate)} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Location" value={record.location} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Summary" value={record.summary || document.notes} borderColor="#E9DDCF" />
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
});
