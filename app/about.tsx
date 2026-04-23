import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { ListRow } from '@/components/ListRow';
import { AppHeader } from '@/components/ui/AppHeader';
import { aboutSections, legalConfig } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

const versionLabel = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? legalConfig.currentVersion;

export default function AboutScreen() {
  const router = useRouter();
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
      <AppHeader badgeLabel="P" title={t('legal.aboutTitle')} subtitle={t('legal.aboutSubtitle')} />

      <AppCard title="Pineapple" subtitle="A privacy-aware travel companion for documents, trips, reminders, and SOS access.">
        <Text style={styles.version}>{t('legal.version', { version: versionLabel })}</Text>
        <Text style={styles.smallPrint}>{legalConfig.smallPrint}</Text>
      </AppCard>

      <AppCard title={t('legal.privacySummary')} right={<MaterialIcons name="shield" size={22} color={colors.primaryBlue} />}>
        <View style={styles.summaryList}>
          {translatedBullets.map((item) => (
            <View key={item} style={styles.summaryItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primaryBlue} />
              <Text style={styles.summaryText}>{item}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <LegalSectionCards sections={aboutSections} />

      <AppCard title={t('legal.links')}>
        <ListRow
          title={t('legal.privacyLinkTitle')}
          subtitle={t('legal.privacyLinkBody')}
          onPress={() => router.push('/privacy')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
        <ListRow
          title={t('legal.termsLinkTitle')}
          subtitle={t('legal.termsLinkBody')}
          onPress={() => router.push('/terms')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
        <ListRow
          title={t('legal.supportLinkTitle')}
          subtitle={t('legal.supportLinkBody')}
          onPress={() => router.push('/support')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  version: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  smallPrint: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
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
