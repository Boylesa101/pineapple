import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveOnboardingCompletionStatus } from '@/utils/onboardingState';

test('stored onboarding status wins when already set', () => {
  assert.equal(deriveOnboardingCompletionStatus(false, { pinConfigured: true, tripCount: 2 }), false);
  assert.equal(deriveOnboardingCompletionStatus(true, { pinConfigured: false, tripCount: 0 }), true);
});

test('onboarding auto-completes for upgraded installs with a configured pin or trip data', () => {
  assert.equal(deriveOnboardingCompletionStatus(null, { pinConfigured: true, tripCount: 0 }), true);
  assert.equal(deriveOnboardingCompletionStatus(null, { pinConfigured: false, tripCount: 1 }), true);
  assert.equal(deriveOnboardingCompletionStatus(null, { pinConfigured: false, tripCount: 0 }), false);
});
