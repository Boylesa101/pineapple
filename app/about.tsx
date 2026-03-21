import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { ListRow } from '@/components/ListRow';
import { AppHeader } from '@/components/ui/AppHeader';
import { aboutSections, legalConfig, privacySummaryBullets } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { openExternalOrFallback } from '@/utils/openExternal';

const versionLabel = Constants.expoConfig?.version ?? legalConfig.versionPlaceholder;

export default function AboutScreen() {
  const router = useRouter();

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="P" title="About Pineapple" subtitle={legalConfig.tagline} />

      <AppCard title="Pineapple" subtitle="A privacy-aware travel companion for documents, trips, reminders, and SOS access.">
        <Text style={styles.version}>App version: {versionLabel}</Text>
        <Text style={styles.smallPrint}>{legalConfig.smallPrint}</Text>
      </AppCard>

      <AppCard title="Privacy summary" right={<MaterialIcons name="shield" size={22} color={colors.primaryBlue} />}>
        <View style={styles.summaryList}>
          {privacySummaryBullets.map((item) => (
            <View key={item} style={styles.summaryItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primaryBlue} />
              <Text style={styles.summaryText}>{item}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <LegalSectionCards sections={aboutSections} />

      <AppCard title="Legal and support links">
        <ListRow
          title="Privacy Policy"
          subtitle="Read the in-app policy or open the public website version."
          onPress={() => router.push('/privacy')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
        <ListRow
          title="Terms of Use"
          subtitle="Understand Pineapple's usage terms and disclaimers."
          onPress={() => router.push('/terms')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
        <ListRow
          title="Support"
          subtitle="Open help content, FAQs, and support details."
          onPress={() => router.push('/support')}
          right={<MaterialIcons name="chevron-right" size={20} color={colors.primaryBlue} />}
        />
        <ListRow
          title="Website"
          subtitle={legalConfig.websiteUrl}
          onPress={() =>
            void openExternalOrFallback(
              legalConfig.websiteUrl,
              'The Pineapple website could not be opened right now. You can still use the in-app legal pages.'
            )
          }
          right={<MaterialIcons name="open-in-new" size={18} color={colors.primaryBlue} />}
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
