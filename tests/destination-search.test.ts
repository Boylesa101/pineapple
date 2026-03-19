import assert from 'node:assert/strict';
import test from 'node:test';

import { searchDestinations } from '@/data/destinations';

test('destination search returns normalized country suggestions', () => {
  const results = searchDestinations('spa');
  assert.equal(results[0]?.label, 'Spain');
  assert.equal(results[0]?.type, 'country');
});

test('destination search returns known place suggestions before loose matches', () => {
  const results = searchDestinations('lis');
  assert.equal(results[0]?.label, 'Lisbon, Portugal');
  assert.equal(results[0]?.type, 'city');
});
