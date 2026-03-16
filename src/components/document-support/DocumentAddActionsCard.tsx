import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ChoiceChips } from '@/components/ChoiceChips';
import { colors, spacing } from '@/constants/theme';
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
        <AppButton label="Scan document" onPress={onScan} />
        <Text style={styles.caption}>Use camera/live capture to scan and attempt OCR immediately.</Text>
        <AppButton label="Add photo for OCR" tone="secondary" onPress={onImportForOcr} />
        <Text style={styles.caption}>Choose an existing image, photo, or file and run OCR from it.</Text>
        <AppButton label="Enter manually" tone="outline" onPress={onManual} />
        <Text style={styles.caption}>Manual form entry fallback if a scan is not available.</Text>
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
    gap: spacing.xs,
  },
  caption: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.xs,
  },
});
