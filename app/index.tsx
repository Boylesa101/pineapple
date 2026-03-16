import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getWelcomeGreeting } from '@/utils/authFlow';
import { getPostUnlockRoute } from '@/utils/authRoutes';

export default function IndexScreen() {
  const router = useRouter();
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const tripCount = useAppStore((state) => state.data.trips.length);
  const pinConfigured = useAppStore((state) => state.security.pinConfigured);
  const greeting = useMemo(() => getWelcomeGreeting(hasCompletedOnboarding), [hasCompletedOnboarding]);

  const nextRoute = useMemo(() => {
    if (!hasCompletedOnboarding) {
      return '/onboarding';
    }

    if (!pinConfigured) {
      return '/setup-pin';
    }

    if (!isUnlocked) {
      return '/lock';
    }

    return getPostUnlockRoute(tripCount);
  }, [hasCompletedOnboarding, isUnlocked, pinConfigured, tripCount]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor contentStyle={styles.content}>
      <View style={styles.screen}>
        <View style={styles.topRail}>
          <Text style={styles.header}>Pineapple</Text>
        </View>
        <View style={styles.centerRail}>
          <View style={styles.hero}>
            <PineappleMark size={220} />
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
          <AppButton
            label="Let's go"
            tone="secondary"
            size="large"
            style={styles.cta}
            labelStyle={styles.ctaLabel}
            onPress={() => router.replace(nextRoute)}
          />
        </View>
        <View style={styles.bottomRail} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  topRail: {
    minHeight: 96,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRail: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  bottomRail: {
    minHeight: 96,
    width: '100%',
  },
  header: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    textAlign: 'center',
  },
  hero: {
    minHeight: 248,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: colors.white,
    fontFamily: 'Inter_500Medium',
    fontSize: 19,
    lineHeight: 28,
    maxWidth: 320,
    textAlign: 'center',
  },
  cta: {
    minWidth: 264,
    borderColor: colors.white,
    alignSelf: 'center',
  },
  ctaLabel: {
    color: colors.authBlue,
    fontSize: 18,
  },
});
