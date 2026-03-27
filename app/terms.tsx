import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { termsSections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="T" title="Terms of Use" subtitle="Important Pineapple app terms" />

      <AppCard
        title="Important reminder"
        subtitle="Pineapple helps you stay organised, but it does not replace checking official travel requirements yourself."
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
