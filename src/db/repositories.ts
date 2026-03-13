import { getDatabase } from './client';

import { createId } from '@/utils/ids';
import type {
  AppDataSnapshot,
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
} from '@/types/models';

function now() {
  return new Date().toISOString();
}

function toBool(value: number) {
  return value === 1;
}

export async function loadSnapshot(): Promise<AppDataSnapshot> {
  const db = await getDatabase();
  const [trips, travellers, documents, packingItems, travelSegments, hotelStays, itineraryEvents, emergencyInfos] =
    await Promise.all([
      db.getAllAsync<any>('SELECT * FROM trips ORDER BY startDate ASC'),
      db.getAllAsync<any>('SELECT * FROM travellers ORDER BY fullName ASC'),
      db.getAllAsync<any>('SELECT * FROM documents ORDER BY createdAt DESC'),
      db.getAllAsync<any>('SELECT * FROM packing_items ORDER BY category ASC, title ASC'),
      db.getAllAsync<any>('SELECT * FROM travel_segments ORDER BY departureTime ASC'),
      db.getAllAsync<any>('SELECT * FROM hotel_stays ORDER BY checkIn ASC'),
      db.getAllAsync<any>('SELECT * FROM itinerary_events ORDER BY dateTime ASC'),
      db.getAllAsync<any>('SELECT * FROM emergency_infos ORDER BY createdAt DESC'),
    ]);

  return {
    trips,
    travellers,
    documents: documents.map((document) => ({ ...document, sensitive: toBool(document.sensitive) })),
    packingItems: packingItems.map((item) => ({ ...item, isPacked: toBool(item.isPacked) })),
    travelSegments,
    hotelStays,
    itineraryEvents,
    emergencyInfos,
  };
}

export async function upsertTrip(input: TripDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('trip');

  await db.runAsync(
    `INSERT INTO trips (id, name, destination, startDate, endDate, coverImageUri, notes, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       destination = excluded.destination,
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       coverImageUri = excluded.coverImageUri,
       notes = excluded.notes,
       status = excluded.status,
       updatedAt = excluded.updatedAt`,
    id,
    input.name,
    input.destination,
    input.startDate,
    input.endDate,
    input.coverImageUri,
    input.notes,
    input.status,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertTraveller(input: TravellerDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('traveller');

  await db.runAsync(
    `INSERT INTO travellers (id, tripId, fullName, passportNumber, ghicNumber, medicalNote, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       fullName = excluded.fullName,
       passportNumber = excluded.passportNumber,
       ghicNumber = excluded.ghicNumber,
       medicalNote = excluded.medicalNote,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.fullName,
    input.passportNumber,
    input.ghicNumber,
    input.medicalNote,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertDocument(input: DocumentDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('document');

  await db.runAsync(
    `INSERT INTO documents (id, tripId, travellerId, holderName, documentType, documentNumber, issueDate, expiryDate, notes, localFileUri, previewUri, mimeType, sensitive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       travellerId = excluded.travellerId,
       holderName = excluded.holderName,
       documentType = excluded.documentType,
       documentNumber = excluded.documentNumber,
       issueDate = excluded.issueDate,
       expiryDate = excluded.expiryDate,
       notes = excluded.notes,
       localFileUri = excluded.localFileUri,
       previewUri = excluded.previewUri,
       mimeType = excluded.mimeType,
       sensitive = excluded.sensitive,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.travellerId,
    input.holderName,
    input.documentType,
    input.documentNumber,
    input.issueDate,
    input.expiryDate,
    input.notes,
    input.localFileUri,
    input.previewUri,
    input.mimeType,
    input.sensitive ? 1 : 0,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertPackingItem(input: PackingItemDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('packing');

  await db.runAsync(
    `INSERT INTO packing_items (id, tripId, travellerId, title, category, quantity, isPacked, luggageType, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       travellerId = excluded.travellerId,
       title = excluded.title,
       category = excluded.category,
       quantity = excluded.quantity,
       isPacked = excluded.isPacked,
       luggageType = excluded.luggageType,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.travellerId,
    input.title,
    input.category,
    input.quantity,
    input.isPacked ? 1 : 0,
    input.luggageType,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertTravelSegment(input: TravelSegmentDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('segment');

  await db.runAsync(
    `INSERT INTO travel_segments (id, tripId, airline, flightNumber, departureAirport, arrivalAirport, departureTime, arrivalTime, terminal, gate, bookingRef, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       airline = excluded.airline,
       flightNumber = excluded.flightNumber,
       departureAirport = excluded.departureAirport,
       arrivalAirport = excluded.arrivalAirport,
       departureTime = excluded.departureTime,
       arrivalTime = excluded.arrivalTime,
       terminal = excluded.terminal,
       gate = excluded.gate,
       bookingRef = excluded.bookingRef,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.airline,
    input.flightNumber,
    input.departureAirport,
    input.arrivalAirport,
    input.departureTime,
    input.arrivalTime,
    input.terminal,
    input.gate,
    input.bookingRef,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertHotelStay(input: HotelStayDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('hotel');

  await db.runAsync(
    `INSERT INTO hotel_stays (id, tripId, hotelName, address, phone, bookingRef, checkIn, checkOut, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       hotelName = excluded.hotelName,
       address = excluded.address,
       phone = excluded.phone,
       bookingRef = excluded.bookingRef,
       checkIn = excluded.checkIn,
       checkOut = excluded.checkOut,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.hotelName,
    input.address,
    input.phone,
    input.bookingRef,
    input.checkIn,
    input.checkOut,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertItineraryEvent(input: ItineraryEventDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('event');

  await db.runAsync(
    `INSERT INTO itinerary_events (id, tripId, title, type, dateTime, location, confirmationNumber, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       title = excluded.title,
       type = excluded.type,
       dateTime = excluded.dateTime,
       location = excluded.location,
       confirmationNumber = excluded.confirmationNumber,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.title,
    input.type,
    input.dateTime,
    input.location,
    input.confirmationNumber,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertEmergencyInfo(input: EmergencyInfoDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('emergency');

  await db.runAsync(
    `INSERT INTO emergency_infos (id, tripId, insurerEmergencyNumber, hotelPhone, airlinePhone, localEmergencyNote, embassyConsulateNote, travellerMedicalNote, emergencyContacts, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tripId) DO UPDATE SET
       insurerEmergencyNumber = excluded.insurerEmergencyNumber,
       hotelPhone = excluded.hotelPhone,
       airlinePhone = excluded.airlinePhone,
       localEmergencyNote = excluded.localEmergencyNote,
       embassyConsulateNote = excluded.embassyConsulateNote,
       travellerMedicalNote = excluded.travellerMedicalNote,
       emergencyContacts = excluded.emergencyContacts,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.insurerEmergencyNumber,
    input.hotelPhone,
    input.airlinePhone,
    input.localEmergencyNote,
    input.embassyConsulateNote,
    input.travellerMedicalNote,
    input.emergencyContacts,
    timestamp,
    timestamp
  );

  return id;
}

export async function deleteById(table: string, id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

export async function clearAllData() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM emergency_infos;
    DELETE FROM itinerary_events;
    DELETE FROM hotel_stays;
    DELETE FROM travel_segments;
    DELETE FROM packing_items;
    DELETE FROM documents;
    DELETE FROM travellers;
    DELETE FROM trips;
  `);
}
