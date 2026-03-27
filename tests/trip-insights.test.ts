import assert from 'node:assert/strict';
import test from 'node:test';

import { getAirportSetOffInfo } from '../src/services/tripInsightsService';
import type { TravelSegment } from '../src/types/models';

function createFlightSegment(overrides: Partial<TravelSegment> = {}): TravelSegment {
  return {
    id: 'segment_1',
    tripId: 'trip_1',
    transportType: 'flight',
    travelDirection: 'outbound',
    airline: 'BA',
    providerCode: 'BA',
    providerLogoUrl: null,
    flightNumber: 'BA0321',
    departureAirport: 'London Heathrow',
    departureAirportCode: 'LHR',
    arrivalAirport: 'Palma',
    arrivalAirportCode: 'PMI',
    departureTime: '2026-08-12T09:30:00+01:00',
    departureTimeZone: 'Europe/London',
    arrivalTime: '2026-08-12T12:45:00+02:00',
    terminal: '',
    gate: '',
    bookingRef: '',
    notificationSummary: 'Lock screen alerts 7d • 3d • 2d • 1d • 2h • 1h • 15m',
    scheduledNotificationIds: [],
    notes: '',
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z',
    ...overrides,
  };
}

test('airport set-off time uses outbound flight departure minus two hours and travel duration', () => {
  const info = getAirportSetOffInfo([createFlightSegment()], 45);

  assert.equal(info.status, 'available');
  assert.equal(info.timeLabel, '06:45');
  assert.equal(info.departureLabel, 'Departure 12 Aug 2026, 09:30');
  assert.match(info.helperLabel, /45 min/);
});

test('airport set-off time falls back when travel duration is missing', () => {
  const info = getAirportSetOffInfo([createFlightSegment()], null);

  assert.equal(info.status, 'unavailable');
  assert.equal(info.timeLabel, 'Set-off time unavailable');
  assert.match(info.helperLabel, /Add airport travel time/);
});

test('airport set-off time falls back when outbound departure is invalid', () => {
  const info = getAirportSetOffInfo([createFlightSegment({ departureTime: 'not-a-date' })], 30);

  assert.equal(info.status, 'unavailable');
  assert.equal(info.timeLabel, 'Set-off time unavailable');
  assert.match(info.helperLabel, /invalid/i);
});
