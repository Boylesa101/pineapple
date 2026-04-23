import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveOnboardingStep } from '@/utils/onboardingState';

test('stored onboarding step wins when already set', () => {
  assert.equal(
    deriveOnboardingStep('traveller_setup', null, {
      pinConfigured: true,
      profileName: 'Andrew',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'traveller_setup',
  );
  assert.equal(
    deriveOnboardingStep('complete', false, {
      pinConfigured: false,
      profileName: '',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'complete',
  );
});

test('legacy users only auto-complete when they have established profile data as well as usage data', () => {
  assert.equal(
    deriveOnboardingStep(null, null, {
      pinConfigured: true,
      profileName: 'Andrew',
      travellerCount: 1,
      documentCount: 2,
      tripCount: 1,
    }),
    'complete',
  );
  assert.equal(
    deriveOnboardingStep(null, null, {
      pinConfigured: true,
      profileName: 'Andrew',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'biometrics',
  );
  assert.equal(
    deriveOnboardingStep(null, null, {
      pinConfigured: true,
      profileName: '',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'name',
  );
  assert.equal(
    deriveOnboardingStep(null, null, {
      pinConfigured: false,
      profileName: '',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'language',
  );
  assert.equal(
    deriveOnboardingStep(null, null, {
      pinConfigured: false,
      profileName: 'Andrew',
      travellerCount: 0,
      documentCount: 0,
      tripCount: 0,
    }),
    'pin',
  );
});
