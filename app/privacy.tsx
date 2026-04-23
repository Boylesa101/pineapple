import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { privacySections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const translatedBullets = [
    t('legal.bullet.deviceOnly'),
    t('legal.bullet.noAccount'),
    t('legal.bullet.localNotifications'),
    t('legal.bullet.noLocationTracking'),
    t('legal.bullet.webCompanion'),
  ];

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="P"
        title={t('legal.privacyTitle')}
        subtitle={t('legal.privacySubtitle')}
      />

      <AppCard
        title={t('legal.quickPrivacySummary')}
        subtitle={t('legal.quickPrivacyBody')}
        right={<MaterialIcons name="shield" size={22} color={colors.primaryBlue} />}
      >
        <View style={styles.summaryList}>
          {translatedBullets.map((item) => (
            <View key={item} style={styles.summaryItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primaryBlue} />
              <Text style={styles.summaryText}>{item}</Text>
            </View>
          ))}
        </View>
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
