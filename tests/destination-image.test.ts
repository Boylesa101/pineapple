import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDestinationType } from '@/utils/destinationImage';
import { normalizeTripRecord } from '@/utils/trips';

test('detects country-only destinations', () => {
  assert.equal(resolveDestinationType('Spain'), 'country');
  assert.equal(resolveDestinationType('Japan'), 'country');
});

test('detects place destinations with a trailing country', () => {
  assert.equal(resolveDestinationType('Paris, France'), 'place');
  assert.equal(resolveDestinationType('Lake District, United Kingdom'), 'place');
});

test('defaults unknown trip hero metadata safely', () => {
  const trip = normalizeTripRecord({
    id: 'trip_1',
    name: 'Test',
    destination: 'Keswick',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    status: 'upcoming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(trip.destinationType, 'unknown');
  assert.equal(trip.heroImageStatus, 'idle');
  assert.equal(trip.coverImageUri, null);
  assert.equal(trip.heroImageRemoteUrl, null);
  assert.equal(trip.transferSummary, '');
});
