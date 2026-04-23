import assert from 'node:assert/strict';
import test from 'node:test';

import type { Document, TravelSegment } from '@/types/models';
import { resolveAirlineBrand } from '@/services/flights';
import { buildPineappleFlightRecord } from '@/services/flights/normalizeFlight';
import { MockFlightProvider } from '@/services/flights/providers/mock';

const now = '2026-04-14T10:00:00.000Z';

function createSegment(overrides: Partial<TravelSegment> = {}): TravelSegment {
  return {
    id: 'segment_1',
    tripId: 'trip_1',
    transportType: 'flight',
    travelDirection: 'outbound',
    airline: 'British Airways',
    providerCode: 'BA',
    providerLogoUrl: null,
    flightNumber: 'BA482',
    departureAirport: 'London Heathrow',
    departureAirportCode: 'LHR',
    arrivalAirport: 'Edinburgh',
    arrivalAirportCode: 'EDI',
    departureTime: '2026-04-16T08:00:00.000Z',
    departureTimeZone: 'Europe/London',
    arrivalTime: '2026-04-16T09:20:00.000Z',
    terminal: '5',
    gate: 'A12',
    bookingRef: 'ABC123',
    notificationSummary: '',
    scheduledNotificationIds: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createBoardingPass(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc_1',
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Jamie Traveller',
    documentType: 'boarding_pass',
    documentNumber: 'ABC123',
    issueDate: null,
    expiryDate: null,
    expiryReminderEnabled: false,
    expiryReminderSchedule: [30, 7, 1],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: '',
    localFileUri: '',
    previewUri: null,
    mimeType: null,
    formalDocumentData: {
      title: 'Boarding pass',
      issuer: 'British Airways',
      referenceCode: 'ABC123',
      location: 'Terminal 5',
      status: 'Stored',
      summary: '1 cabin bag',
      railClass: '',
      ticketType: '',
      coach: '',
      seat: '14A',
      travellerName: 'Jamie Traveller',
      fare: 'Euro Traveller',
      carrierCode: 'BA',
      flightNumber: 'BA482',
      departureAirportCode: 'LHR',
      arrivalAirportCode: 'EDI',
      sequence: '72',
      boardingInfo: 'Gate A12 • Boards 07:20',
      gateCloseTime: '2026-04-16T07:45:00.000Z',
      barcodePayload: 'M1JAMIETRAVELLER',
      barcodeFormat: 'qr',
    },
    sensitive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('airline brand resolver supports multiple carriers', () => {
  assert.equal(resolveAirlineBrand({ carrierCode: 'FR', airlineName: 'Ryanair' }).primaryColor, '#1546B0');
  assert.equal(resolveAirlineBrand({ carrierCode: 'U2', airlineName: 'easyJet' }).name, 'easyJet');
  assert.equal(resolveAirlineBrand({ carrierCode: 'BA', airlineName: 'British Airways' }).name, 'British Airways');
});

test('normalized flight record merges airline brand, live snapshot, and boarding-pass data', async () => {
  const provider = new MockFlightProvider();
  const record = await buildPineappleFlightRecord(createSegment(), [createBoardingPass()], provider);

  assert.equal(record.airlineName, 'British Airways');
  assert.equal(record.liveStatus, 'on_time');
  assert.equal(record.providerSource, 'mock');
  assert.equal(record.passengerName, 'Jamie Traveller');
  assert.equal(record.seat, '14A');
  assert.equal(record.bookingReference, 'ABC123');
  assert.equal(record.barcodePayload, 'M1JAMIETRAVELLER');
});

test('normalized flight record falls back cleanly when no boarding pass exists', async () => {
  const provider = new MockFlightProvider();
  const record = await buildPineappleFlightRecord(
    createSegment({ airline: 'Jet2', providerCode: 'EXS', flightNumber: 'LS123' }),
    [],
    provider
  );

  assert.equal(record.airlineName, 'Jet2');
  assert.equal(record.passengerName, 'Passenger');
  assert.equal(record.barcodePayload, '');
  assert.equal(record.liveStatus, 'delayed');
});
