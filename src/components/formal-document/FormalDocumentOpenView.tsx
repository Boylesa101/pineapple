import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { DocumentPreviewPane } from '@/components/formal-document/DocumentPreviewPane';
import { DocumentMetaRow } from '@/components/document-support/DocumentMetaRow';
import { ExpiryBadge } from '@/components/document-support/ExpiryBadge';
import { VerificationBadge } from '@/components/document-support/VerificationBadge';
import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller, VerificationStatus } from '@/types/models';
import { formatDateTime, formatShortDate } from '@/utils/date';
import { deriveFormalDocumentData } from '@/utils/formalDocument';
import { buildRailTicketQrPayload, getFormalDocumentDateLabels, getFormalDocumentTheme } from '@/utils/documentTypes';

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
  const theme = getFormalDocumentTheme(document);
  const dateLabels = getFormalDocumentDateLabels(document.documentType);
  const railQrValue = document.documentType === 'rail_ticket' ? buildRailTicketQrPayload(document, traveller) : null;
  const railTraveller = record.travellerName || document.holderName || traveller?.fullName || '';

  return (
    <View style={[styles.record, { borderColor: theme.border }, horizontal ? styles.horizontal : styles.vertical]}>
      <View style={[styles.panel, styles.metaPanel, { backgroundColor: document.documentType === 'rail_ticket' ? '#FFF4E5' : '#F7EFE2' }, horizontal ? styles.panelHalf : null]}>
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
        <DocumentMetaRow label={dateLabels.startLabel} value={formatShortDate(document.issueDate)} borderColor="#E9DDCF" />
        <DocumentMetaRow label={dateLabels.endLabel} value={formatShortDate(document.expiryDate)} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Location" value={record.location} borderColor="#E9DDCF" />
        <DocumentMetaRow label="Summary" value={record.summary || document.notes} borderColor="#E9DDCF" />
      </View>

      <View style={[styles.panel, styles.previewPanel, horizontal ? styles.panelHalf : null]}>
        {document.documentType === 'rail_ticket' && railQrValue ? (
          <View style={styles.ticketCard}>
            <View style={styles.ticketTopRow}>
              <View style={styles.ticketRoute}>
                <Text style={styles.ticketLabel}>Pineapple stored UK rail ticket</Text>
                <Text style={styles.ticketTitle}>{record.title || 'Rail ticket'}</Text>
                <Text style={styles.ticketMeta}>{record.issuer || 'Stored operator'}</Text>
              </View>
              <MaterialIcons name={theme.icon} size={30} color={theme.accent} />
            </View>
            <View style={styles.ticketStrip}>
              <Text style={styles.ticketStripText}>Not an official National Rail travel ticket. Check with the operator before travel.</Text>
            </View>
            <View style={styles.ticketDetails}>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Date</Text>
                <Text style={styles.ticketDetailValue}>{formatShortDate(document.issueDate)}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Departure</Text>
                <Text style={styles.ticketDetailValue}>{formatDateTime(document.issueDate)}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Arrival</Text>
                <Text style={styles.ticketDetailValue}>{formatDateTime(document.expiryDate)}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Class</Text>
                <Text style={styles.ticketDetailValue}>{record.railClass || 'Standard'}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Type</Text>
                <Text style={styles.ticketDetailValue}>{record.ticketType || 'Stored ticket'}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Coach / seat</Text>
                <Text style={styles.ticketDetailValue}>
                  {[record.coach, record.seat].filter(Boolean).join(' / ') || 'Open seating'}
                </Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Booking ref</Text>
                <Text style={styles.ticketDetailValue}>{record.referenceCode || document.documentNumber || 'Stored'}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Traveller</Text>
                <Text style={styles.ticketDetailValue}>{railTraveller || 'Traveller'}</Text>
              </View>
              <View style={styles.ticketDetailBlock}>
                <Text style={styles.ticketDetailLabel}>Fare</Text>
                <Text style={styles.ticketDetailValue}>{record.fare || record.status || 'Stored fare'}</Text>
              </View>
            </View>
            <View style={styles.ticketBottomRow}>
              <View style={styles.ticketSummary}>
                <Text style={styles.ticketDetailLabel}>Route / station</Text>
                <Text style={styles.ticketSummaryText}>
                  {[record.title, record.location].filter(Boolean).join(' • ') || record.summary || document.notes || 'Stored locally in Pineapple.'}
                </Text>
              </View>
              <View style={styles.ticketQrWrap}>
                <QRCodeImage value={railQrValue} size={108} />
              </View>
            </View>
          </View>
        ) : (
          <DocumentPreviewPane
            previewUri={document.previewUri}
            localFileUri={document.localFileUri}
            mimeType={document.mimeType}
            onOpen={onOpenSource}
          />
        )}
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
  ticketCard: {
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: '#E07F1E',
    backgroundColor: '#F8A647',
    padding: spacing.md,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  ticketStrip: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.42)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ticketStripText: {
    color: '#6C3B04',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 15,
  },
  ticketRoute: {
    flex: 1,
    gap: 4,
  },
  ticketLabel: {
    color: '#6C3B04',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ticketTitle: {
    color: '#3E2300',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  ticketMeta: {
    color: '#6C3B04',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  ticketDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ticketDetailBlock: {
    minWidth: 100,
    gap: 2,
  },
  ticketDetailLabel: {
    color: '#7A3E00',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  ticketDetailValue: {
    color: '#3E2300',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  ticketBottomRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  ticketSummary: {
    flex: 1,
    gap: 4,
  },
  ticketSummaryText: {
    color: '#4A2A02',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  ticketQrWrap: {
    alignItems: 'flex-end',
  },
});
