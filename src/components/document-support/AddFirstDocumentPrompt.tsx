import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  onAddPassport: () => void;
  onAddDrivingLicence: () => void;
  onImport: () => void;
};

export function AddFirstDocumentPrompt({ onAddPassport, onAddDrivingLicence, onImport }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>Start with your key identity document</Text>
        <Text style={styles.description}>
          Add a passport or driving licence first so Pineapple can keep your main travel identity details ready offline.
        </Text>
      </View>
      <View style={styles.actions}>
        <AppButton label="Add passport" onPress={onAddPassport} />
        <AppButton label="Add driving licence" tone="secondary" onPress={onAddDrivingLicence} />
        <AppButton label="Import a scan or PDF" tone="ghost" onPress={onImport} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E4D7C5',
    backgroundColor: '#FFF9F1',
  },
  copy: {
    gap: 4,
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
