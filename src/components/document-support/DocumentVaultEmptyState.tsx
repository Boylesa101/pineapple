import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PineappleMark } from '@/brand/PineappleMark';
import { colors, radii, spacing } from '@/constants/theme';
import type { DocumentType } from '@/types/models';

import { DocumentSetupFlow } from './DocumentSetupFlow';

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

export function DocumentVaultEmptyState(props: Props) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={['#0D6EFD', '#3F8CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <PineappleMark size={64} simplified />
        <Text style={styles.title}>Your secure travel documents live here</Text>
        <Text style={styles.description}>
          Keep passports, licences, health cards, insurance records, tickets, and other travel paperwork in one local vault on this device.
        </Text>
      </LinearGradient>
      <DocumentSetupFlow {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  hero: {
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.xl,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
