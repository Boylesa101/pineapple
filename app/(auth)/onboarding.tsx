import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { OnboardingIllustration } from '@/components/OnboardingIllustration';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const slides = [
  {
    key: 'welcome',
    icon: 'beach-access' as const,
    heading: 'Welcome to Pineapple',
    body:
      'Keep every trip, traveller, booking, and emergency detail in one calm local-first organiser. Pineapple works offline first and stays ready when travel gets busy.',
  },
  {
    key: 'document-scanning',
    icon: 'document-scanner' as const,
    heading: 'Store travel documents clearly',
    body:
      'Save passports, insurance, hotel bookings, and boarding passes in the secure vault. Sensitive previews stay hidden until you unlock them.',
  },
  {
    key: 'travel-mode',
    icon: 'bolt' as const,
    heading: 'Travel Mode is built for speed',
    body:
      'Open a high-contrast quick-access view for airports, hotels, taxis, and family emergencies. Reveal sensitive values only when you need them.',
  },
  {
    key: 'import-email',
    icon: 'mail-outline' as const,
    heading: 'Bring plans in from elsewhere',
    body:
      'Import travel files from device storage and keep shared-trip packets ready for manual sync. Pineapple stays useful even without an account or cloud backend.',
  },
  {
    key: 'expiry-warnings',
    icon: 'warning-amber' as const,
    heading: 'Catch expiry dates early',
    body:
      'Surface passport and GHIC expiry warnings before departure, plus local reminders for packing, flights, and missing insurance so nothing slips through.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const current = slides[index];
  const isLast = index === slides.length - 1;

  const footer = useMemo(
    () => (
      <View style={styles.footer}>
        <AppButton
          label={isLast ? 'Continue' : 'Next'}
          onPress={async () => {
            if (!isLast) {
              setIndex((value) => Math.min(value + 1, slides.length - 1));
              return;
            }

            setSubmitting(true);
            await completeOnboarding();
            router.replace('/setup-pin');
          }}
          loading={submitting}
        />
        <AppButton
          label="Skip"
          tone="ghost"
          onPress={async () => {
            setSubmitting(true);
            await completeOnboarding();
            router.replace('/setup-pin');
          }}
          disabled={submitting}
        />
      </View>
    ),
    [completeOnboarding, isLast, router, submitting]
  );

  return (
    <AppScreen scroll={false} footer={footer}>
      <View style={styles.hero}>
        <PineappleMark size={82} />
        <Text style={styles.brand}>Pineapple</Text>
      </View>
      <AppCard>
        <View style={styles.progressRow}>
          {slides.map((slide, slideIndex) => (
            <View
              key={slide.key}
              style={[styles.progressDot, slideIndex === index ? styles.progressDotActive : null]}
            />
          ))}
        </View>
        <OnboardingIllustration icon={current.icon} accent={index % 2 === 0 ? colors.pineappleGold : colors.oceanBlue} />
        <Text style={styles.heading}>{current.heading}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  brand: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAD8BA',
  },
  progressDotActive: {
    width: 26,
    backgroundColor: colors.nightNavy,
  },
  heading: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
});
