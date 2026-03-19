import assert from 'node:assert/strict';
import test from 'node:test';

import { createId } from '../src/utils/ids';

test('record ids are generated locally without collisions in a short run', () => {
  const ids = new Set<string>();

  for (let index = 0; index < 250; index += 1) {
    ids.add(createId('trip'));
  }

  assert.equal(ids.size, 250);
});

test('record ids keep the requested prefix', () => {
  const tripId = createId('trip');
  const travellerId = createId('traveller');

  assert.equal(tripId.startsWith('trip_'), true);
  assert.equal(travellerId.startsWith('traveller_'), true);
});
