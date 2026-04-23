import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { termsSections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="T" title={t('legal.termsTitle')} subtitle={t('legal.termsSubtitle')} />

      <AppCard
        title={t('legal.importantReminder')}
        subtitle={t('legal.importantReminderBody')}
        right={<MaterialIcons name="gavel" size={22} color={colors.primaryBlue} />}
      />

      <LegalSectionCards sections={termsSections} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
});
