import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LegalSectionCards } from '@/components/legal/LegalSectionCards';
import { AccordionSection } from '@/components/ui/AccordionSection';
import { AppHeader } from '@/components/ui/AppHeader';
import { legalConfig, supportFaqs, supportIntroSections } from '@/content/legal';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

const versionLabel = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? legalConfig.currentVersion;

export default function SupportScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader badgeLabel="H" title={t('legal.supportTitle')} subtitle={t('legal.supportSubtitle')} />

      <AppCard
        title={t('legal.supportDetails')}
        subtitle={t('legal.supportDetailsBody')}
        right={<MaterialIcons name="support-agent" size={22} color={colors.primaryBlue} />}
      >
        <Text style={styles.meta}>{t('legal.supportEmail', { email: legalConfig.supportEmail })}</Text>
        <Text style={styles.meta}>{t('legal.version', { version: versionLabel })}</Text>
        <Text style={styles.meta}>{t('legal.releaseLabel', { label: legalConfig.releaseLabel })}</Text>
      </AppCard>

      <LegalSectionCards sections={supportIntroSections} />

      <View style={styles.faqWrap}>
        {supportFaqs.map((item) => (
          <AccordionSection key={item.question} title={item.question}>
            <AppCard>
              <Text style={styles.answer}>{item.answer}</Text>
            </AppCard>
          </AccordionSection>
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
