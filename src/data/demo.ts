import { addDays, addHours, startOfTomorrow } from 'date-fns';

import type { AppDataSnapshot } from '@/types/models';
import { createId } from '@/utils/ids';

export function createDemoSnapshot(): AppDataSnapshot {
  const start = startOfTomorrow();
  const end = addDays(start, 6);
  const outbound = addHours(start, 8);
  const inbound = addHours(end, 18);

  const tripId = createId('trip');
  const travellerA = createId('traveller');
  const travellerB = createId('traveller');
  const now = new Date().toISOString();

  return {
    trips: [
      {
        id: tripId,
        name: 'Mallorca Escape',
        destination: 'Palma, Mallorca',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        coverImageUri: null,
        notes: 'Local-first demo trip for QA and layout checks.',
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      },
    ],
    travellers: [
      {
        id: travellerA,
        tripId,
        fullName: 'Andrew Moss',
        passportNumber: '552184330',
        ghicNumber: 'GHIC-1188-2044',
        medicalNote: 'Peanut allergy - carry antihistamine.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: travellerB,
        tripId,
        fullName: 'Jess Moss',
        passportNumber: '992044181',
        ghicNumber: 'GHIC-7100-9931',
        medicalNote: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    documents: [],
    packingItems: [
      {
        id: createId('packing'),
        tripId,
        travellerId: travellerA,
        title: 'Linen shirts',
        category: 'clothes',
        quantity: 3,
        isPacked: true,
        luggageType: 'checked',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('packing'),
        tripId,
        travellerId: travellerB,
        title: 'Sun cream SPF 50',
        category: 'toiletries',
        quantity: 1,
        isPacked: false,
        luggageType: 'checked',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('packing'),
        tripId,
        travellerId: null,
        title: 'Travel adapters',
        category: 'electronics',
        quantity: 2,
        isPacked: false,
        luggageType: 'carry_on',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    travelSegments: [
      {
        id: createId('segment'),
        tripId,
        airline: 'British Airways',
        flightNumber: 'BA2658',
        departureAirport: 'LGW',
        arrivalAirport: 'PMI',
        departureTime: outbound.toISOString(),
        arrivalTime: addHours(outbound, 2.5).toISOString(),
        terminal: 'S',
        gate: '18',
        bookingRef: 'MX3L92',
        notes: 'Arrive 2 hours early.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('segment'),
        tripId,
        airline: 'British Airways',
        flightNumber: 'BA2659',
        departureAirport: 'PMI',
        arrivalAirport: 'LGW',
        departureTime: inbound.toISOString(),
        arrivalTime: addHours(inbound, 2.5).toISOString(),
        terminal: '',
        gate: '',
        bookingRef: 'MX3L92',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    hotelStays: [
      {
        id: createId('hotel'),
        tripId,
        hotelName: 'Canopy by Hilton Palma',
        address: 'Carrer de la Marina 19, Palma',
        phone: '+34 971 66 77 88',
        bookingRef: 'HTL-7710',
        checkIn: start.toISOString(),
        checkOut: end.toISOString(),
        notes: 'Sea-view room requested.',
        createdAt: now,
        updatedAt: now,
      },
    ],
    itineraryEvents: [
      {
        id: createId('event'),
        tripId,
        title: 'Catamaran cruise',
        type: 'excursion',
        dateTime: addDays(start, 2).toISOString(),
        location: 'Palma Marina',
        confirmationNumber: 'SEA-4451',
        notes: 'Bring towels and photo ID.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('event'),
        tripId,
        title: 'Dinner booking',
        type: 'meal',
        dateTime: addDays(start, 3).toISOString(),
        location: 'Fera Palma',
        confirmationNumber: 'FERA-92',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    emergencyInfos: [
      {
        id: createId('emergency'),
        tripId,
        insurerEmergencyNumber: '+44 20 7000 2200',
        hotelPhone: '+34 971 66 77 88',
        airlinePhone: '+44 344 493 0787',
        localEmergencyNote: 'Spain general emergency: 112.',
        embassyConsulateNote: 'British Consulate: Plaça de la Reina, Palma.',
        travellerMedicalNote: 'Andrew carries antihistamine.',
        emergencyContacts: 'Mum: +44 7700 900111',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
