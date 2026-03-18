import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { DocumentType } from '@/types/models';

import { DocumentAddActionsCard } from './DocumentAddActionsCard';

type Props = {
  selectedType: DocumentType;
  onTypeChange: (value: DocumentType) => void;
  onScan: () => void;
  onImportForOcr: () => void;
  onManual: () => void;
};

export function AddFirstDocumentPrompt({ selectedType, onTypeChange, onScan, onImportForOcr, onManual }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.copy}>
        <Text style={styles.title}>Start with your key identity document</Text>
        <Text style={styles.description}>
          Add a passport or driving licence first so Pineapple can keep your main travel identity details ready offline.
        </Text>
      </View>
      <DocumentAddActionsCard
        title="Choose document type"
        description="Use OCR first for a faster setup. Pineapple will ask you to review the extracted fields before saving."
        selectedType={selectedType}
        onTypeChange={onTypeChange}
        typeOptions={[
          { label: 'Passport', value: 'passport' },
          { label: 'Driving licence', value: 'driving_licence' },
        ]}
        onScan={onScan}
        onImportForOcr={onImportForOcr}
        onManual={onManual}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  copy: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: '#F4F9FF',
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
