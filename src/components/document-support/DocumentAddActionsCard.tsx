import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ChoiceChips } from '@/components/ChoiceChips';
import { colors, radii, spacing } from '@/constants/theme';
import type { DocumentType } from '@/types/models';

type Props = {
  title?: string;
  description?: string;
  selectedType: DocumentType;
  onTypeChange: (value: DocumentType) => void;
  typeOptions: Array<{ label: string; value: DocumentType }>;
  onScan: () => void;
  onImportForOcr: () => void;
  onManual: () => void;
};

export function DocumentAddActionsCard({
  title = 'Add a document',
  description = 'Start with OCR so Pineapple can extract details for review before you save.',
  selectedType,
  onTypeChange,
  typeOptions,
  onScan,
  onImportForOcr,
  onManual,
}: Props) {
  return (
    <AppCard>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <ChoiceChips<DocumentType> value={selectedType} onChange={onTypeChange} options={typeOptions} />
      <View style={styles.actions}>
        <View style={styles.primaryAction}>
          <MaterialIcons name="document-scanner" size={22} color={colors.white} />
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>Scan document</Text>
            <Text style={styles.primaryDescription}>Use camera capture and guide the document into frame for OCR.</Text>
          </View>
          <AppButton label="Scan" tone="secondary" onPress={onScan} style={styles.primaryButton} />
        </View>
        <View style={styles.secondaryRow}>
          <AppButton label="Add photo for OCR" tone="secondary" onPress={onImportForOcr} style={styles.secondaryButton} />
          <AppButton label="Enter manually" tone="outline" onPress={onManual} style={styles.secondaryButton} />
        </View>
        <Text style={styles.caption}>If OCR is not available or needs correction, Pineapple still routes you into a full editable review before save.</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: 4,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primaryBlue,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  primaryCopy: {
    gap: 2,
  },
  primaryTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  primaryDescription: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    minWidth: 108,
    backgroundColor: colors.white,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  caption: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});
