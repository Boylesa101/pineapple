const authSetupPaths = new Set(['/onboarding', '/setup-pin', '/lock']);

type ResolveAuthRouteOptions = {
  currentPath: string;
  hasCompletedOnboarding: boolean;
  pinConfigured: boolean;
  isUnlocked: boolean;
  tripCount: number;
};

export function getPostUnlockRoute(tripCount: number) {
  return tripCount > 0 ? '/home' : '/create-first-trip';
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

  if (tripCount === 0 && currentPath !== '/create-first-trip') {
    return '/create-first-trip';
  }

  return null;
}
