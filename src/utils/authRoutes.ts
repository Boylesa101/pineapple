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
    if (currentPath === '/' || currentPath === '/lock') {
      return null;
    }
    return '/';
  }

  if (tripCount === 0) {
    if (currentPath === '/create-first-trip') {
      return null;
    }
    return '/create-first-trip';
  }

  if (currentPath === '/') {
    return null;
  }

  if (authSetupPaths.has(currentPath)) {
    return '/home';
  }

  return null;
}
