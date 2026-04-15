import { useEffect } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SystemUI from 'expo-system-ui';
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
import { AppButton } from '@/components/AppButton';
import { colors, spacing } from '@/constants/theme';
import { setCurrentAppLanguage } from '@/i18n/runtime';
import { addNotificationResponseListener, consumePendingNotificationTarget, getInitialNotificationTarget, type NotificationTarget } from '@/services/notifications';
import { addTripTransferUrlListener, getInitialTripTransferTarget } from '@/services/tripTransfer';
import { useAppStore } from '@/store/useAppStore';
import { resolveAuthRoute } from '@/utils/authRoutes';
import { filterVisibleTrips } from '@/utils/tripVisibility';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function BootErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.loading}>
      <PineappleMark size={88} />
      <Text style={styles.loadingTitle}>Pineapple</Text>
      <Text style={styles.loadingSubtitle}>{message}</Text>
      <AppButton label="Try again" onPress={onRetry} />
    </View>
  );
}

function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const { isBootstrapped, security, isUnlocked, hasCompletedOnboarding, onboardingStep, data } = useAppStore();
  const visibleTripCount = filterVisibleTrips(data.trips).length;

  useEffect(() => {
    if (!isBootstrapped || !rootNavigationState?.key) {
      return;
    }

    const currentPath = pathname || '/';
    const target = resolveAuthRoute({
      currentPath,
      hasCompletedOnboarding,
      onboardingStep,
      pinConfigured: security.pinConfigured,
      isUnlocked,
      tripCount: visibleTripCount,
    });

    if (__DEV__) {
      console.log('[auth] route guard', {
        currentPath,
        target,
        hasCompletedOnboarding,
        onboardingStep,
        pinConfigured: security.pinConfigured,
        isUnlocked,
        tripCount: visibleTripCount,
      });
    }

    if (target && currentPath !== target) {
      router.replace(target);
    }
  }, [
    visibleTripCount,
    hasCompletedOnboarding,
    onboardingStep,
    isBootstrapped,
    isUnlocked,
    pathname,
    rootNavigationState?.key,
    router,
    security.pinConfigured,
  ]);

  return null;
}

function applyNotificationTarget(
  target: NotificationTarget,
  options: {
    isUnlocked: boolean;
    pinConfigured: boolean;
    pathname: string;
    setActiveTrip: (tripId: string | null) => void;
    router: ReturnType<typeof useRouter>;
  }
) {
  if (target.activeTripId) {
    options.setActiveTrip(target.activeTripId);
  }

  if (options.pinConfigured && !options.isUnlocked) {
    if (options.pathname !== '/lock') {
      options.router.replace('/lock');
    }
    return;
  }

  consumePendingNotificationTarget();
  options.router.push(target.href as never);
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
  const bootError = useAppStore((state) => state.bootError);
  const privacyOverlayVisible = useAppStore((state) => state.privacyOverlayVisible);
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const pinConfigured = useAppStore((state) => state.security.pinConfigured);
  const appLanguage = useAppStore((state) => state.data.appPreferences.appLanguage);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.authBlue).catch(() => undefined);
  }, []);

  useEffect(() => {
    setCurrentAppLanguage(appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    bootstrap().catch(() => undefined);
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
    if (fontsLoaded && (isBootstrapped || bootError)) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [bootError, fontsLoaded, isBootstrapped]);

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let removeTripTransferListener: (() => void) | null = null;

    void Promise.all([getInitialNotificationTarget(), getInitialTripTransferTarget()]).then(([notificationTarget]) => {
      if (cancelled) {
        return;
      }

      if (notificationTarget) {
        const target = notificationTarget;
        applyNotificationTarget(target, {
          isUnlocked,
          pinConfigured,
          pathname: pathname || '/',
          setActiveTrip,
          router,
        });
      }
    });

    void addNotificationResponseListener((target) => {
      if (cancelled) {
        return;
      }

      applyNotificationTarget(target, {
        isUnlocked: useAppStore.getState().isUnlocked,
        pinConfigured: useAppStore.getState().security.pinConfigured,
        pathname: pathname || '/',
        setActiveTrip: useAppStore.getState().setActiveTrip,
        router,
      });
    }).then((remove) => {
      if (cancelled) {
        remove();
        return;
      }
      unsubscribe = remove;
    });

    removeTripTransferListener = addTripTransferUrlListener(() => undefined);

    return () => {
      cancelled = true;
      unsubscribe?.();
      removeTripTransferListener?.();
    };
  }, [isBootstrapped, isUnlocked, pathname, pinConfigured, router, setActiveTrip]);

  if (!fontsLoaded || !isBootstrapped) {
    if (fontsLoaded && bootError) {
      return <BootErrorView message={bootError} onRetry={() => bootstrap().catch(() => undefined)} />;
    }
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container} onTouchStart={noteInteraction}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RouteGuard />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.authBlue } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="getting-started" />
          <Stack.Screen name="about" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="support" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="trip-transfer" />
          <Stack.Screen name="warnings" />
          <Stack.Screen name="trip/[tripId]" />
          <Stack.Screen name="trip/[tripId]/flights" />
          <Stack.Screen name="trip/[tripId]/flight/[segmentId]" />
          <Stack.Screen name="trip/[tripId]/transport/[itemId]" />
          <Stack.Screen name="trip/[tripId]/travel-mode" />
        </Stack>
        {privacyOverlayVisible && segments[0] !== '(auth)' ? <View pointerEvents="none" style={styles.overlay} /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.authBlue,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.authBlue,
    padding: spacing.lg,
  },
  loadingTitle: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  loadingSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.authBlue,
  },
});
