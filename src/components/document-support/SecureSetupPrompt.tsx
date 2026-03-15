import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  pinConfigured: boolean;
  onPress: () => void;
};

export function SecureSetupPrompt({ pinConfigured, onPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={pinConfigured ? 'shield' : 'lock'} size={20} color={colors.oceanBlue} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{pinConfigured ? 'Vault security is active' : 'Secure the vault first'}</Text>
          <Text style={styles.description}>
            {pinConfigured
              ? 'Your documents stay behind Pineapple’s PIN and biometric lock.'
              : 'Set a PIN before storing private travel records so sensitive scans stay protected on this device.'}
          </Text>
        </View>
      </View>
      {!pinConfigured ? <AppButton label="Set PIN security" tone="secondary" onPress={onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#D5E8F2',
    backgroundColor: '#F4FBFF',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D2E5F0',
  },
  copy: {
    flex: 1,
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
});
