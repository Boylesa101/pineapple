import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppTextField } from '@/components/AppTextField';
import { colors, radii, spacing } from '@/constants/theme';
import type { DocumentType } from '@/types/models';

import { AddFirstDocumentPrompt } from './AddFirstDocumentPrompt';
import { SecureSetupPrompt } from './SecureSetupPrompt';

type Props = {
  travellerName: string;
  onTravellerNameChange: (value: string) => void;
  onSaveTravellerName: () => void;
  savingTraveller?: boolean;
  showTravellerPrompt: boolean;
  pinConfigured: boolean;
  onOpenSecurity: () => void;
  selectedIdentityType: DocumentType;
  onIdentityTypeChange: (value: DocumentType) => void;
  onScanIdentity: () => void;
  onImportIdentityForOcr: () => void;
  onEnterIdentityManually: () => void;
  onAddHealthCard: () => void;
  onAddInsurance: () => void;
  onAddOther: () => void;
};

export function DocumentSetupFlow({
  travellerName,
  onTravellerNameChange,
  onSaveTravellerName,
  savingTraveller = false,
  showTravellerPrompt,
  pinConfigured,
  onOpenSecurity,
  selectedIdentityType,
  onIdentityTypeChange,
  onScanIdentity,
  onImportIdentityForOcr,
  onEnterIdentityManually,
  onAddHealthCard,
  onAddInsurance,
  onAddOther,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <SecureSetupPrompt pinConfigured={pinConfigured} onPress={onOpenSecurity} />

      {showTravellerPrompt ? (
        <View style={styles.card}>
          <Text style={styles.title}>Add your name first</Text>
          <Text style={styles.description}>
            Pineapple uses your traveller profile to prefill document holders and keep records organised per person.
          </Text>
          <AppTextField label="Your full name" value={travellerName} onChangeText={onTravellerNameChange} placeholder="e.g. Henry Boyle" />
          <AppButton label="Save your name" onPress={onSaveTravellerName} loading={savingTraveller} />
        </View>
      ) : null}

      <AddFirstDocumentPrompt
        selectedType={selectedIdentityType}
        onTypeChange={onIdentityTypeChange}
        onScan={onScanIdentity}
        onImportForOcr={onImportIdentityForOcr}
        onManual={onEnterIdentityManually}
      />

      <View style={styles.card}>
        <Text style={styles.title}>Then build out your travel pack</Text>
        <Text style={styles.description}>
          Once your main ID is saved, add the supporting records Pineapple can keep ready for airports, hotels, and emergencies.
        </Text>
        <View style={styles.actions}>
          <AppButton label="Add health card" tone="secondary" onPress={onAddHealthCard} />
          <AppButton label="Add insurance record" tone="secondary" onPress={onAddInsurance} />
          <AppButton label="Add other travel record" tone="ghost" onPress={onAddOther} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.card,
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
  actions: {
    gap: spacing.sm,
  },
});
