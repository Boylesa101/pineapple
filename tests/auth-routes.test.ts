import test from 'node:test';
import assert from 'node:assert/strict';

import { getPostUnlockRoute, resolveAuthRoute } from '@/utils/authRoutes';

test('post-unlock route uses create-first-trip when no trips exist', () => {
  assert.equal(getPostUnlockRoute(0), '/create-first-trip');
});

test('post-unlock route uses home when trips already exist', () => {
  assert.equal(getPostUnlockRoute(2), '/home');
});

test('route guard keeps first-time users on onboarding until setup is complete', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/home',
      hasCompletedOnboarding: false,
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
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    null,
  );
});

test('route guard redirects unlocked no-trip users from auth screens into create-first-trip', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/lock',
      hasCompletedOnboarding: true,
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 0,
    }),
    '/create-first-trip',
  );
});

test('route guard redirects unlocked returning users from auth screens into home', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/lock',
      hasCompletedOnboarding: true,
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 3,
    }),
    '/home',
  );
});

test('route guard sends locked users straight to the real unlock screen', () => {
  assert.equal(
    resolveAuthRoute({
      currentPath: '/',
      hasCompletedOnboarding: true,
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
      pinConfigured: true,
      isUnlocked: true,
      tripCount: 1,
    }),
    '/home',
  );
});
