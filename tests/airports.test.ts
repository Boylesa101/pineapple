import assert from 'node:assert/strict';
import test from 'node:test';

import { searchAirports } from '../src/data/airports';
import { formatAirportDisplay } from '../src/utils/airports';

test('airport search finds Newcastle with NCL available', () => {
  const results = searchAirports('newcastle');
  assert.ok(results.some((airport) => airport.code === 'NCL'));
});

test('airport search supports exact IATA lookups', () => {
  const results = searchAirports('LHR');
  assert.equal(results[0]?.code, 'LHR');
});

test('airport display formatter appends code cleanly', () => {
  assert.equal(formatAirportDisplay('Heathrow Airport', 'LHR'), 'Heathrow Airport (LHR)');
});
