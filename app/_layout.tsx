import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { PineappleMark } from '@/brand/PineappleMark';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function LoadingView() {
  return (
    <View style={styles.loading}>
      <PineappleMark size={88} />
      <Text style={styles.loadingTitle}>Pineapple</Text>
      <Text style={styles.loadingSubtitle}>Loading your offline travel organiser</Text>
    </View>
  );
}

function RouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { isBootstrapped, security, isUnlocked, hasCompletedOnboarding, data } = useAppStore();

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    const inAuth = segments[0] === '(auth)';
    const secondSegment = segments.at(1);
    const isChecklist = segments[0] === 'getting-started';

    if (!hasCompletedOnboarding && !(inAuth && secondSegment === 'onboarding')) {
      router.replace('/onboarding');
      return;
    }

    if (hasCompletedOnboarding && !security.pinConfigured && !(inAuth && secondSegment === 'setup-pin')) {
      router.replace('/setup-pin');
      return;
    }

    if (security.pinConfigured && !isUnlocked && !(segments[0] === '(auth)' && secondSegment === 'lock')) {
      router.replace('/lock');
      return;
    }

    if (security.pinConfigured && isUnlocked && data.trips.length === 0 && !(inAuth && secondSegment === 'create-first-trip')) {
      router.replace('/create-first-trip');
      return;
    }

    if (security.pinConfigured && isUnlocked && inAuth && !isChecklist) {
      router.replace('/home');
    }
  }, [data.trips.length, hasCompletedOnboarding, isBootstrapped, isUnlocked, router, security.pinConfigured, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const bootstrap = useAppStore((state) => state.bootstrap);
  const noteInteraction = useAppStore((state) => state.noteInteraction);
  const handleAppStateChange = useAppStore((state) => state.handleAppStateChange);
  const enforceInactivityLock = useAppStore((state) => state.enforceInactivityLock);
  const isBootstrapped = useAppStore((state) => state.isBootstrapped);
  const privacyOverlayVisible = useAppStore((state) => state.privacyOverlayVisible);
  const segments = useSegments();

  useEffect(() => {
    bootstrap().catch(console.error);
  }, [bootstrap]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  useEffect(() => {
    const timer = setInterval(enforceInactivityLock, 15000);
    return () => clearInterval(timer);
  }, [enforceInactivityLock]);

  useEffect(() => {
    if (fontsLoaded && isBootstrapped) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, isBootstrapped]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  if (!fontsLoaded || !isBootstrapped) {
    return <LoadingView />;
  }

  return (
    <GestureHandlerRootView style={styles.container} onTouchStart={noteInteraction}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RouteGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="getting-started" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="trip/[tripId]" />
          <Stack.Screen name="trip/[tripId]/travel-mode" />
        </Stack>
        {privacyOverlayVisible && segments[0] !== '(auth)' ? (
          <View pointerEvents="none" style={styles.overlay}>
            <PineappleMark size={72} simplified />
            <Text style={styles.overlayText}>Pineapple is locked</Text>
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warmSand,
    padding: spacing.lg,
  },
  loadingTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  loadingSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.warmSand,
  },
  overlayText: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
});
