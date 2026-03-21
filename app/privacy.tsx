import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { legalConfig, privacySections, privacySummaryBullets } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { openExternalOrFallback } from '@/utils/openExternal';

export default function PrivacyScreen() {
  async function openWebsitePolicy() {
    await openExternalOrFallback(
      legalConfig.privacyPolicyUrl,
      'The public privacy policy could not be opened right now. The in-app version is shown here instead.'
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="P"
        title="Privacy Policy"
        subtitle="Plain-English privacy details for Pineapple"
      />

      <AppCard
        title="Quick privacy summary"
        subtitle="Pineapple is designed to keep core travel information close at hand without unnecessary sign-up friction."
        right={<MaterialIcons name="shield" size={22} color={colors.primaryBlue} />}
      >
        <View style={styles.summaryList}>
          {privacySummaryBullets.map((item) => (
            <View key={item} style={styles.summaryItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primaryBlue} />
              <Text style={styles.summaryText}>{item}</Text>
            </View>
          ))}
        </View>
        <AppButton label="Open website policy" tone="secondary" onPress={() => void openWebsitePolicy()} />
      </AppCard>

      <LegalSectionCards sections={privacySections} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  summaryList: {
    gap: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  summaryText: {
    flex: 1,
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
