import test from 'node:test';
import assert from 'node:assert/strict';

import { getPostUnlockRoute, resolveAuthRoute } from '@/utils/authRoutes';

test('post-unlock route uses home when no trips exist', () => {
  assert.equal(getPostUnlockRoute(0), '/home');
});

test('post-unlock route uses home when trips already exist', () => {
  assert.equal(getPostUnlockRoute(2), '/home');
});

test('route guard keeps first-time users on onboarding until setup is complete', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/home',
      hasCompletedOnboarding: false,
      onboardingStep: 'language',
      pinConfigured: false,
      isUnlocked: false,
      tripCount: 0,
    }),
    '/onboarding',
  );
});

test('route guard keeps users on onboarding while the required name step is still incomplete', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/home',
      hasCompletedOnboarding: false,
      onboardingStep: 'name',
      pinConfigured: false,
      isUnlocked: false,
      tripCount: 0,
    }),
    '/onboarding',
  );
});

test('route guard keeps unlocked no-trip users on create-first-trip without bouncing to home', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/create-first-trip',
      hasCompletedOnboarding: true,
      onboardingStep: 'complete',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    null,
  );
});

test('route guard redirects unlocked no-trip users from auth screens into home', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/lock',
      hasCompletedOnboarding: true,
      onboardingStep: 'complete',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    '/home',
  );
});

test('route guard redirects unlocked returning users from auth screens into home', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/lock',
      hasCompletedOnboarding: true,
      onboardingStep: 'complete',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 3,
    }),
    '/home',
  );
});

test('route guard allows the biometric opt-in screen during biometric setup', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/biometric-opt-in',
      hasCompletedOnboarding: false,
      onboardingStep: 'biometrics',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    null,
  );
});

test('route guard sends locked users straight to the real unlock screen', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/',
      hasCompletedOnboarding: true,
      onboardingStep: 'complete',
      pinConfigured: true,
      isUnlocked: false,
      tripCount: 1,
    }),
    '/lock',
  );
});

test('route guard sends unlocked root visits straight to the main app route', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/',
      hasCompletedOnboarding: true,
      onboardingStep: 'complete',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 1,
    }),
    '/home',
  );
});

test('route guard sends users with incomplete traveller setup to the traveller setup screen after unlock', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/home',
      hasCompletedOnboarding: false,
      onboardingStep: 'traveller_setup',
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    '/traveller-setup',
  );
});
