const authSetupPaths = new Set(['/onboarding', '/setup-pin', '/lock']);

type ResolveAuthRouteOptions = {
  currentPath: string;
  hasCompletedOnboarding: boolean;
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
  pinConfigured,
  isUnlocked,
  tripCount,
}: ResolveAuthRouteOptions) {
  if (!hasCompletedOnboarding) {
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
