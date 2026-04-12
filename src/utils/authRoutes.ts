import type { OnboardingStep } from './onboardingState';

const authSetupPaths = new Set(['/onboarding', '/setup-pin', '/biometric-opt-in', '/traveller-setup', '/lock']);

type ResolveAuthRouteOptions = {
  currentPath: string;
  hasCompletedOnboarding: boolean;
  onboardingStep: OnboardingStep;
  pinConfigured: boolean;
  isUnlocked: boolean;
  tripCount: number;
};

export function getPostUnlockRoute(tripCount: number) {
  void tripCount;
  return '/home';
}

export function resolveAuthRoute({
  currentPath,
  hasCompletedOnboarding,
  onboardingStep,
  pinConfigured,
  isUnlocked,
  tripCount,
}: ResolveAuthRouteOptions) {
  if (!hasCompletedOnboarding) {
    if (onboardingStep === 'pin') {
      return currentPath === '/setup-pin' ? null : '/setup-pin';
    }

    if (onboardingStep === 'biometrics') {
      if (!isUnlocked) {
        return currentPath === '/lock' ? null : '/lock';
      }
      return currentPath === '/biometric-opt-in' ? null : '/biometric-opt-in';
    }

    if (onboardingStep === 'traveller_setup') {
      if (!isUnlocked) {
        return currentPath === '/lock' ? null : '/lock';
      }
      return currentPath === '/traveller-setup' ? null : '/traveller-setup';
    }

    return currentPath === '/onboarding' ? null : '/onboarding';
  }

  if (!pinConfigured) {
    return currentPath === '/setup-pin' ? null : '/setup-pin';
  }

  if (currentPath === '/biometric-opt-in') {
    return isUnlocked ? null : '/lock';
  }

  if (!isUnlocked) {
    if (currentPath === '/lock') {
      return null;
    }
    return '/lock';
  }

  const postUnlockRoute = getPostUnlockRoute(tripCount);

  if (currentPath === '/') {
    return postUnlockRoute;
  }

  if (authSetupPaths.has(currentPath)) {
    return postUnlockRoute;
  }

  return null;
}
