import { StyleSheet, Text, View } from 'react-native';

import { PineappleMark } from '@/brand/PineappleMark';
import { colors, radii, spacing } from '@/constants/theme';

import { DocumentSetupFlow } from './DocumentSetupFlow';

type Props = {
  travellerName: string;
  onTravellerNameChange: (value: string) => void;
  onSaveTravellerName: () => void;
  savingTraveller?: boolean;
  showTravellerPrompt: boolean;
  pinConfigured: boolean;
  onOpenSecurity: () => void;
  onAddPassport: () => void;
  onAddDrivingLicence: () => void;
  onImport: () => void;
  onAddHealthCard: () => void;
  onAddInsurance: () => void;
  onAddOther: () => void;
};

export function DocumentVaultEmptyState(props: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        <PineappleMark size={64} simplified />
        <Text style={styles.title}>Your secure travel documents live here</Text>
        <Text style={styles.description}>
          Keep passports, licences, health cards, insurance records, tickets, and other travel paperwork in one local vault on this device.
        </Text>
      </View>
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFF9F0',
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
