import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AppHeader } from '@/components/ui/AppHeader';
import { legalConfig, supportFaqs, supportIntroSections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';

const versionLabel = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? legalConfig.currentVersion;

export default function SupportScreen() {
  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="H" title="Support" subtitle="Help and release contact details" />

      <AppCard
        title="Support details"
        subtitle="Use this page for app help, reviewer checks, and launch support references."
        right={<MaterialIcons name="support-agent" size={22} color={colors.primaryBlue} />}
      >
        <Text style={styles.meta}>Support email: {legalConfig.supportEmail}</Text>
        <Text style={styles.meta}>App version: {versionLabel}</Text>
        <Text style={styles.meta}>Release support label: {legalConfig.releaseLabel}</Text>
      </AppCard>

      <LegalSectionCards sections={supportIntroSections} />

      <View style={styles.faqWrap}>
        {supportFaqs.map((item) => (
          <AppCard key={item.question} title={item.question}>
            <Text style={styles.answer}>{item.answer}</Text>
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  faqWrap: {
    gap: spacing.sm,
  },
  meta: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  answer: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
});
