import assert from 'node:assert/strict';
import test from 'node:test';

import type { Document, TravelSegment, Traveller } from '@/types/models';
import { getTransportItems, getTransportProviderDiagnostics } from '@/services/transport';
import { resolveTransportBrand } from '@/services/transport/brandResolver';
import { AviationstackProvider } from '@/services/transport/providers/aviationstack';
import { BodsProvider } from '@/services/transport/providers/bods';
import { DarwinProvider } from '@/services/transport/providers/darwin';
import { MockTransportProvider } from '@/services/transport/providers/mock';

const now = '2026-04-15T08:00:00.000Z';

function createTraveller(overrides: Partial<Traveller> = {}): Traveller {
  return {
    id: 'traveller_1',
    tripId: 'trip_1',
    fullName: 'Alex Traveller',
    photoUri: null,
    dateOfBirth: null,
    passportNationality: 'British',
    passportNumber: '123456789',
    ghicNumber: '',
    medicalNote: '',
    notes: '',
    avatarColor: '#0D6EFD',
    relationshipType: 'adult',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

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
    arrivalAirport: 'Rome Fiumicino',
    arrivalAirportCode: 'FCO',
    departureTime: '2026-04-16T08:00:00.000Z',
    departureTimeZone: 'Europe/London',
    arrivalTime: '2026-04-16T11:15:00.000Z',
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
    travellerId: 'traveller_1',
    holderName: 'Alex Traveller',
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
      seat: '14A',
      travellerName: 'Alex Traveller',
      fare: 'Euro Traveller',
      carrierCode: 'BA',
      flightNumber: 'BA482',
      departureAirportCode: 'LHR',
      arrivalAirportCode: 'FCO',
      sequence: '82',
      boardingInfo: 'Boards 07:20',
      gateCloseTime: '2026-04-16T07:45:00.000Z',
      barcodePayload: 'M1ALEXTRAVELLER',
      barcodeFormat: 'qr',
      railClass: '',
      ticketType: '',
      coach: '',
    },
    sensitive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRailTicket(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc_rail',
    tripId: 'trip_1',
    travellerId: 'traveller_1',
    holderName: 'Alex Traveller',
    documentType: 'rail_ticket',
    documentNumber: 'RAIL123',
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
      title: 'LNER eTicket',
      issuer: 'LNER',
      referenceCode: 'RAIL123',
      location: 'Coach C',
      status: 'Stored',
      summary: 'Advance single',
      coach: 'C',
      seat: '42A',
      travellerName: 'Alex Traveller',
      fare: 'Standard',
      barcodePayload: 'RAIL-QR-123',
      barcodeFormat: 'qr',
      railClass: 'Standard',
      ticketType: 'Advance',
    },
    sensitive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('transport brand resolver adapts airline, rail, and bus identities', () => {
  assert.equal(resolveTransportBrand({ type: 'airline', operatorCode: 'FR', operatorName: 'Ryanair' }).operatorBrandColor, '#1546B0');
  assert.equal(resolveTransportBrand({ type: 'rail', transportType: 'train', operatorCode: 'LNER', operatorName: 'LNER' }).operatorName, 'LNER');
  assert.equal(
    resolveTransportBrand({ type: 'bus', transportType: 'bus', operatorCode: 'NX', operatorName: 'National Express' }).operatorName,
    'National Express'
  );
});

test('transport items normalize flight, rail, and bus segments into one sorted stack', async () => {
  const travellers = [createTraveller()];
  const items = await getTransportItems({
    travelSegments: [
      createSegment(),
      createSegment({
        id: 'segment_rail',
        transportType: 'train',
        airline: 'London North Eastern Railway',
        providerCode: 'LNER',
        flightNumber: '1E23',
        departureAirport: 'Edinburgh Waverley',
        departureAirportCode: 'EDB',
        arrivalAirport: 'London Kings Cross',
        arrivalAirportCode: 'KGX',
        departureTime: '2026-04-16T06:30:00.000Z',
        arrivalTime: '2026-04-16T10:52:00.000Z',
        terminal: '5',
        bookingRef: 'RAIL123',
      }),
      createSegment({
        id: 'segment_bus',
        transportType: 'bus',
        airline: 'Very Long National Express Coach and Intercity Service Name',
        providerCode: 'NX',
        flightNumber: 'NX591',
        departureAirport: 'Edinburgh Bus Station',
        departureAirportCode: '',
        arrivalAirport: 'Leeds Coach Station',
        arrivalAirportCode: '',
        departureTime: '2026-04-16T12:15:00.000Z',
        arrivalTime: '2026-04-16T16:30:00.000Z',
        bookingRef: 'BUS123',
      }),
    ],
    hotelStays: [],
    documents: [createBoardingPass(), createRailTicket()],
    travellers,
  });

  assert.equal(items.length, 3);
  assert.equal(items[0]?.type, 'rail');
  assert.equal(items[1]?.type, 'airline');
  assert.equal(items[2]?.type, 'bus');
  assert.equal(items[1]?.passengerName, 'Alex Traveller');
  assert.equal(items[1]?.seat, '14A');
  assert.equal(items[0]?.coach, 'C');
  assert.equal(items[0]?.qrOrBarcodeValue, 'RAIL-QR-123');
  assert.match(items[2]?.operatorName ?? '', /Very Long National Express Coach/);
});

test('mock transport provider returns live updates for airline, rail, and bus cards', async () => {
  const provider = new MockTransportProvider();
  const airline = await provider.refresh({
    ...(await getTransportItems({
      travelSegments: [createSegment()],
      hotelStays: [],
      documents: [createBoardingPass()],
      travellers: [createTraveller()],
    })).at(0)!,
  });

  assert.equal(airline?.liveState, 'live');
  assert.equal(airline?.liveStatus, 'boarding');
});

test('real providers fail gracefully without configuration', async () => {
  const baseItem = (
    await getTransportItems({
      travelSegments: [createSegment()],
      hotelStays: [],
      documents: [createBoardingPass()],
      travellers: [createTraveller()],
    })
  )[0]!;

  const aviation = await new AviationstackProvider().refresh(baseItem);
  const rail = await new DarwinProvider().refresh({ ...baseItem, type: 'rail', originCode: 'EDB', destinationCode: 'KGX' });
  const bus = await new BodsProvider().refresh({ ...baseItem, type: 'bus', serviceNumber: 'NX591', stopName: 'St Andrew Square' });

  assert.equal(aviation?.liveState, 'manual_only');
  assert.equal(rail?.liveState, 'manual_only');
  assert.equal(bus?.liveState, 'manual_only');
});

test('provider diagnostics expose live capability flags without breaking local-only mode', () => {
  const diagnostics = getTransportProviderDiagnostics();

  assert.equal(typeof diagnostics.aviationstack.configured, 'boolean');
  assert.equal(diagnostics.aviationstack.capabilities.supportsRealtime, true);
  assert.equal(diagnostics.darwin.capabilities.supportsSchedules, true);
  assert.equal(diagnostics.bods.capabilities.requiresCredentials, true);
});
