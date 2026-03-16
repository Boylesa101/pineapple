import assert from 'node:assert/strict';
import test from 'node:test';

import { canAdvancePinSetup, canConfirmPinSetup, getWelcomeGreeting } from '@/utils/authFlow';

test('first-time welcome greeting uses the exact setup copy', () => {
  assert.equal(getWelcomeGreeting(false), "Aloha, let's get you all set up to plan your next trip.");
});

test('returning-user greeting switches away from first-time setup copy', () => {
  assert.notEqual(getWelcomeGreeting(true, new Date('2026-03-16T09:00:00.000Z')), "Aloha, let's get you all set up to plan your next trip.");
  assert.equal(getWelcomeGreeting(true, new Date('2026-03-16T09:00:00.000Z')), 'Welcome back');
});

test('pin setup requires at least four digits before continuing', () => {
  assert.equal(canAdvancePinSetup('123'), false);
  assert.equal(canAdvancePinSetup('1234'), true);
  assert.equal(canAdvancePinSetup('1234567'), true);
});

test('pin confirmation requires a full matching-length entry', () => {
  assert.equal(canConfirmPinSetup('1234', '12'), false);
  assert.equal(canConfirmPinSetup('1234', '1234'), true);
  assert.equal(canConfirmPinSetup('12345', '1234'), false);
});

