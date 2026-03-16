import test from 'node:test';
import assert from 'node:assert/strict';

import { unlockCultureFacts, unlockGreetings } from '@/data/unlockCulture';

test('unlock screen culture dataset includes 100 etiquette facts', () => {
  assert.equal(unlockCultureFacts.length, 100);
});

test('unlock screen greeting dataset includes multiple greetings', () => {
  assert.ok(unlockGreetings.length >= 10);
});
