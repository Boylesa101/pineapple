import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function IndexScreen() {
  const router = useRouter();
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const tripCount = useAppStore((state) => state.data.trips.length);
  const pinConfigured = useAppStore((state) => state.security.pinConfigured);

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

    return tripCount === 0 ? '/create-first-trip' : '/home';
  }, [hasCompletedOnboarding, isUnlocked, pinConfigured, tripCount]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor>
      <View style={styles.screen}>
        <Text style={styles.header}>Pineapple</Text>
        <View style={styles.hero}>
          <PineappleMark size={220} />
        </View>
        <AppButton label="Let's go" tone="secondary" onPress={() => router.push(nextRoute)} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    textAlign: 'center',
  },
  hero: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
