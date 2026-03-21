import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { legalConfig, termsSections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { openExternalOrFallback } from '@/utils/openExternal';

export default function TermsScreen() {
  async function openWebsiteTerms() {
    await openExternalOrFallback(
      legalConfig.termsUrl,
      'The public terms page could not be opened right now. The in-app version is shown here instead.'
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="T" title="Terms of Use" subtitle="Important app and website terms" />

      <AppCard
        title="Important reminder"
        subtitle="Pineapple helps you stay organised, but it does not replace checking official travel requirements yourself."
        right={<MaterialIcons name="gavel" size={22} color={colors.primaryBlue} />}
      >
        <AppButton label="Open website terms" tone="secondary" onPress={() => void openWebsiteTerms()} />
      </AppCard>

      <LegalSectionCards sections={termsSections} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
});
