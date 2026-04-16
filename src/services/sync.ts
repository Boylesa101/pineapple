import CryptoJS from 'crypto-js';

import type {
  AppDataSnapshot,
  ConflictStatus,
  DestinationImageSource,
  DestinationType,
  EmergencyInfo,
  HeroImageStatus,
  HotelStay,
  ItineraryEvent,
  ItineraryType,
  InviteStatus,
  LuggageType,
  PackingItem,
  PackingAssignmentScope,
  PackingCategory,
  PackingPriority,
  ParticipantRole,
  ReminderSetting,
  ReminderKind,
  ReminderLeadTime,
  RelationshipType,
  SharedTripPacket,
  SharedTripConflictRecord,
  SharedTripPacketData,
  SharedTripExportResult,
  SharedTripSecureEnvelope,
  SyncConflict,
  TransportType,
  TravelDirection,
  TravelSegment,
  Traveller,
  Trip,
  TripStatus,
  TripInvite,
  TripParticipant,
} from '@/types/models';
import { createId } from '@/utils/ids';
import { getTripBundle, getTripById } from '@/utils/selectors';

const MAX_SHARED_TRIP_PACKET_LENGTH = 1_000_000;
const MAX_COLLECTION_SIZE = 250;
const MAX_TEXT_LENGTH = 4_000;
const MAX_LONG_TEXT_LENGTH = 20_000;
const MAX_ID_LENGTH = 120;
const SHARE_CODE_PATTERN = /^PINE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const SHARE_CODE_PREFIX = 'PINE';
const BASE32_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHARED_TRIP_PBKDF2_ITERATIONS = 150000;

const transportTypes = new Set<TransportType>(['flight', 'private_flight', 'train', 'bus', 'underground', 'metro', 'car', 'hire_car', 'taxi', 'ferry', 'eurotunnel']);
const travelDirections = new Set<TravelDirection>(['outbound', 'return', 'other']);
const packingCategories = new Set<PackingCategory>(['clothes', 'toiletries', 'documents', 'electronics', 'medicines', 'beach_pool', 'kids_baby', 'other']);
const luggageTypes = new Set<LuggageType>(['carry_on', 'checked']);
const packingScopes = new Set<PackingAssignmentScope>(['trip', 'travellers']);
const packingPriorities = new Set<PackingPriority>(['essential', 'useful', 'optional']);
const itineraryTypes = new Set<ItineraryType>(['excursion', 'meal', 'ticket', 'reminder', 'custom']);
const reminderKinds = new Set<ReminderKind>([
  'passport_expiry',
  'ghic_expiry',
  'packing_incomplete',
  'trip_countdown_30_days',
  'trip_countdown_7_days',
  'trip_countdown_3_days',
  'trip_countdown_1_day',
  'trip_starts_tomorrow',
  'trip_today',
  'insurance_missing',
  'transport_departure',
  'flight_check_in',
  'hotel_check_in',
  'transfer_reminder',
  'shared_trip_update',
  'live_travel_update',
  'travel_mode_reminder',
  'sos_ready',
  'excursion_reminder',
]);
const reminderLeadTimes = new Set<ReminderLeadTime>([0, 1, 3, 6, 7, 30]);
const participantRoles = new Set<ParticipantRole>(['owner', 'editor', 'viewer']);
const inviteStatuses = new Set<InviteStatus>(['pending', 'accepted', 'revoked']);
const tripStatuses = new Set<TripStatus>(['upcoming', 'active', 'completed']);
const destinationTypes = new Set<DestinationType>(['country', 'place', 'unknown']);
const destinationImageSources = new Set<DestinationImageSource>(['curated', 'pexels', 'wikimedia', 'fallback']);
const heroImageStatuses = new Set<HeroImageStatus>(['idle', 'loading', 'ready', 'failed']);
const relationshipTypes = new Set<RelationshipType>(['adult', 'child', 'infant', 'other']);

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function now() {
  return new Date().toISOString();
}

function assertPacket(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function expectObject(value: unknown, message: string) {
  assertPacket(isPlainObject(value), message);
  return value;
}

function expectArray(value: unknown, message: string, maxLength = MAX_COLLECTION_SIZE) {
  assertPacket(Array.isArray(value), message);
  assertPacket(value.length <= maxLength, 'This shared trip file contains too much data to import safely.');
  return value;
}

function expectString(
  value: unknown,
  message: string,
  options: { maxLength?: number; allowEmpty?: boolean; pattern?: RegExp } = {}
) {
  const { maxLength = MAX_TEXT_LENGTH, allowEmpty = false, pattern } = options;
  assertPacket(typeof value === 'string', message);
  const normalized = value.trim();
  assertPacket(allowEmpty || normalized.length > 0, message);
  assertPacket(value.length <= maxLength, 'This shared trip file contains fields that are too large to import safely.');
  if (pattern) {
    assertPacket(pattern.test(value), message);
  }
  return value;
}

function expectOptionalString(value: unknown, message: string, maxLength = MAX_TEXT_LENGTH) {
  assertPacket(value === null || typeof value === 'string', message);
  if (typeof value === 'string') {
    assertPacket(value.length <= maxLength, 'This shared trip file contains fields that are too large to import safely.');
  }
  return value as string | null;
}

function expectBoolean(value: unknown, message: string) {
  assertPacket(typeof value === 'boolean', message);
  return value;
}

function expectNumber(
  value: unknown,
  message: string,
  options: { integer?: boolean; min?: number; max?: number } = {}
) {
  const { integer = false, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;
  assertPacket(typeof value === 'number' && Number.isFinite(value), message);
  assertPacket(!integer || Number.isInteger(value), message);
  assertPacket(value >= min && value <= max, message);
  return value;
}

function expectIsoDate(value: unknown, message: string) {
  assertPacket(isIsoDate(value), message);
  return value as string;
}

function expectEnum<T extends string>(value: unknown, allowed: Set<T>, message: string) {
  assertPacket(typeof value === 'string' && allowed.has(value as T), message);
  return value as T;
}

function expectNumberEnum<T extends number>(value: unknown, allowed: Set<T>, message: string) {
  assertPacket(typeof value === 'number' && allowed.has(value as T), message);
  return value as T;
}

function expectId(value: unknown, message: string) {
  return expectString(value, message, {
    allowEmpty: false,
    maxLength: MAX_ID_LENGTH,
    pattern: /^[a-z0-9_-]+$/i,
  });
}

function expectStringArray(value: unknown, message: string, options: { maxLength?: number; maxItems?: number } = {}) {
  const items = expectArray(value, message, options.maxItems ?? MAX_COLLECTION_SIZE);
  return items.map((item) => expectString(item, message, { maxLength: options.maxLength ?? MAX_ID_LENGTH }));
}

function ensureUniqueIds(items: Array<{ id: string }>, label: string) {
  const ids = new Set<string>();
  for (const item of items) {
    assertPacket(!ids.has(item.id), `This shared trip file has duplicate ${label} IDs.`);
    ids.add(item.id);
  }
}

function createTransferCode() {
  const randomBytes = Uint8Array.from(Buffer.from(CryptoJS.lib.WordArray.random(5).toString(CryptoJS.enc.Hex), 'hex'));
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const byte of randomBytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }

  const token = output.slice(0, 8);
  return `${SHARE_CODE_PREFIX}-${token.slice(0, 4)}-${token.slice(4)}`;
}

function normalizeTransferCode(value: string) {
  return value.trim();
}

function assertTransferCode(value: string) {
  const normalized = normalizeTransferCode(value);
  assertPacket(normalized.length >= 8, 'Enter the transfer code to decrypt this shared trip.');
  return normalized;
}

function validateTrip(value: unknown): Trip {
  const trip = expectObject(value, 'This shared trip file is missing the main trip record.');
  return {
    id: expectId(trip.id, 'This shared trip file contains an invalid trip ID.'),
    name: expectString(trip.name, 'This shared trip file is missing the trip name.'),
    destination: expectString(trip.destination, 'This shared trip file is missing the trip destination.'),
    destinationType: expectEnum(trip.destinationType, destinationTypes, 'This shared trip file contains an invalid destination type.'),
    startDate: expectIsoDate(trip.startDate, 'This shared trip file contains an invalid trip start date.'),
    endDate: expectIsoDate(trip.endDate, 'This shared trip file contains an invalid trip end date.'),
    destinationImageLocalPath: expectOptionalString(trip.destinationImageLocalPath, 'This shared trip file contains an invalid trip image path.'),
    destinationImageRemoteUrl: expectOptionalString(trip.destinationImageRemoteUrl, 'This shared trip file contains an invalid trip image URL.'),
    destinationImageSource: expectEnum(trip.destinationImageSource, destinationImageSources, 'This shared trip file contains an invalid trip image source.'),
    attributionText: expectOptionalString(trip.attributionText, 'This shared trip file contains invalid trip attribution text.'),
    attributionMeta: (trip.attributionMeta ?? null) as Trip['attributionMeta'],
    coverImageUri: expectOptionalString(trip.coverImageUri, 'This shared trip file contains an invalid trip cover image path.'),
    heroImageRemoteUrl: expectOptionalString(trip.heroImageRemoteUrl, 'This shared trip file contains an invalid hero image URL.'),
    heroImageStatus: expectEnum(trip.heroImageStatus, heroImageStatuses, 'This shared trip file contains an invalid hero image state.'),
    notes: expectString(trip.notes ?? '', 'This shared trip file contains invalid trip notes.', { allowEmpty: true, maxLength: MAX_LONG_TEXT_LENGTH }),
    transferSummary: expectString(trip.transferSummary ?? '', 'This shared trip file contains invalid transfer details.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    transferProvider: expectString(trip.transferProvider ?? '', 'This shared trip file contains an invalid transfer provider.', {
      allowEmpty: true,
    }),
    transferMethod: expectString(trip.transferMethod ?? '', 'This shared trip file contains an invalid transfer method.', {
      allowEmpty: true,
    }),
    transferLocation: expectString(trip.transferLocation ?? '', 'This shared trip file contains an invalid transfer location.', {
      allowEmpty: true,
    }),
    transferTime: trip.transferTime === null ? null : expectIsoDate(trip.transferTime, 'This shared trip file contains an invalid transfer time.'),
    airportTravelDurationMinutes:
      trip.airportTravelDurationMinutes === null
        ? null
        : expectNumber(trip.airportTravelDurationMinutes, 'This shared trip file contains an invalid airport transfer duration.', {
            integer: true,
            min: 0,
            max: 24 * 60,
          }),
    transferNotes: expectString(trip.transferNotes ?? '', 'This shared trip file contains invalid transfer notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    status: expectEnum(trip.status, tripStatuses, 'This shared trip file contains an invalid trip status.'),
    createdAt: expectIsoDate(trip.createdAt, 'This shared trip file contains an invalid trip creation date.'),
    updatedAt: expectIsoDate(trip.updatedAt, 'This shared trip file contains an invalid trip update date.'),
  };
}

function validateTraveller(value: unknown, tripId: string): Traveller {
  const traveller = expectObject(value, 'This shared trip file contains an invalid traveller record.');
  const validatedTripId = expectId(traveller.tripId, 'This shared trip file contains an invalid traveller trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes traveller records from another trip.');
  return {
    id: expectId(traveller.id, 'This shared trip file contains an invalid traveller ID.'),
    tripId: validatedTripId,
    fullName: expectString(traveller.fullName, 'This shared trip file contains a traveller with no name.'),
    photoUri: expectOptionalString(traveller.photoUri ?? null, 'This shared trip file contains an invalid traveller photo path.'),
    dateOfBirth: traveller.dateOfBirth === null ? null : expectIsoDate(traveller.dateOfBirth, 'This shared trip file contains an invalid traveller date of birth.'),
    passportNationality: expectString(traveller.passportNationality ?? '', 'This shared trip file contains an invalid traveller nationality.', {
      allowEmpty: true,
    }),
    passportNumber: expectString(traveller.passportNumber ?? '', 'This shared trip file contains an invalid traveller passport number.', {
      allowEmpty: true,
    }),
    ghicNumber: expectString(traveller.ghicNumber ?? '', 'This shared trip file contains an invalid traveller GHIC number.', {
      allowEmpty: true,
    }),
    medicalNote: expectString(traveller.medicalNote ?? '', 'This shared trip file contains an invalid traveller medical note.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    notes: expectString(traveller.notes ?? '', 'This shared trip file contains an invalid traveller note.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    avatarColor: expectString(traveller.avatarColor, 'This shared trip file contains an invalid traveller colour.', {
      pattern: /^#[0-9a-f]{6}$/i,
      maxLength: 7,
    }),
    relationshipType: expectEnum(traveller.relationshipType, relationshipTypes, 'This shared trip file contains an invalid traveller type.'),
    createdAt: expectIsoDate(traveller.createdAt, 'This shared trip file contains an invalid traveller creation date.'),
    updatedAt: expectIsoDate(traveller.updatedAt, 'This shared trip file contains an invalid traveller update date.'),
  };
}

function validatePackingItem(value: unknown, tripId: string, travellerIds: Set<string>): PackingItem {
  const item = expectObject(value, 'This shared trip file contains an invalid packing item.');
  const validatedTripId = expectId(item.tripId, 'This shared trip file contains an invalid packing trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes packing items from another trip.');
  const validatedTravellerIds = expectStringArray(item.travellerIds, 'This shared trip file contains invalid packing traveller links.');
  for (const travellerId of validatedTravellerIds) {
    assertPacket(travellerIds.has(travellerId), 'This shared trip file references a traveller that is not included.');
  }
  return {
    id: expectId(item.id, 'This shared trip file contains an invalid packing item ID.'),
    tripId: validatedTripId,
    title: expectString(item.title, 'This shared trip file contains a packing item with no title.'),
    category: expectEnum(item.category, packingCategories, 'This shared trip file contains an invalid packing category.'),
    quantity: expectNumber(item.quantity, 'This shared trip file contains an invalid packing quantity.', {
      integer: true,
      min: 1,
      max: 500,
    }),
    isPacked: expectBoolean(item.isPacked, 'This shared trip file contains an invalid packing state.'),
    luggageType: expectEnum(item.luggageType, luggageTypes, 'This shared trip file contains an invalid luggage type.'),
    assignmentScope: expectEnum(item.assignmentScope, packingScopes, 'This shared trip file contains an invalid packing assignment.'),
    travellerIds: validatedTravellerIds,
    priority: expectEnum(item.priority, packingPriorities, 'This shared trip file contains an invalid packing priority.'),
    notes: expectString(item.notes ?? '', 'This shared trip file contains invalid packing notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    createdAt: expectIsoDate(item.createdAt, 'This shared trip file contains an invalid packing creation date.'),
    updatedAt: expectIsoDate(item.updatedAt, 'This shared trip file contains an invalid packing update date.'),
  };
}

function validateTravelSegment(value: unknown, tripId: string): TravelSegment {
  const segment = expectObject(value, 'This shared trip file contains an invalid travel segment.');
  const validatedTripId = expectId(segment.tripId, 'This shared trip file contains an invalid travel segment trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes travel segments from another trip.');
  return {
    id: expectId(segment.id, 'This shared trip file contains an invalid travel segment ID.'),
    tripId: validatedTripId,
    transportType: expectEnum(segment.transportType, transportTypes, 'This shared trip file contains an invalid transport type.'),
    travelDirection: expectEnum(segment.travelDirection, travelDirections, 'This shared trip file contains an invalid travel direction.'),
    airline: expectString(segment.airline ?? '', 'This shared trip file contains an invalid carrier name.', { allowEmpty: true }),
    providerCode: expectString(segment.providerCode ?? '', 'This shared trip file contains an invalid transport provider code.', { allowEmpty: true }),
    providerLogoUrl: expectOptionalString(segment.providerLogoUrl ?? null, 'This shared trip file contains an invalid provider logo URL.'),
    flightNumber: expectString(segment.flightNumber ?? '', 'This shared trip file contains an invalid segment reference.', { allowEmpty: true }),
    departureAirport: expectString(segment.departureAirport ?? '', 'This shared trip file contains an invalid departure label.', { allowEmpty: true }),
    departureAirportCode: expectString(segment.departureAirportCode ?? '', 'This shared trip file contains an invalid departure code.', { allowEmpty: true, maxLength: 12 }),
    arrivalAirport: expectString(segment.arrivalAirport ?? '', 'This shared trip file contains an invalid arrival label.', { allowEmpty: true }),
    arrivalAirportCode: expectString(segment.arrivalAirportCode ?? '', 'This shared trip file contains an invalid arrival code.', { allowEmpty: true, maxLength: 12 }),
    departureTime: expectIsoDate(segment.departureTime, 'This shared trip file contains an invalid departure time.'),
    departureTimeZone: expectOptionalString(segment.departureTimeZone ?? null, 'This shared trip file contains an invalid departure timezone.', 120),
    arrivalTime: expectIsoDate(segment.arrivalTime, 'This shared trip file contains an invalid arrival time.'),
    terminal: expectString(segment.terminal ?? '', 'This shared trip file contains an invalid terminal field.', { allowEmpty: true, maxLength: 120 }),
    gate: expectString(segment.gate ?? '', 'This shared trip file contains an invalid gate field.', { allowEmpty: true, maxLength: 120 }),
    bookingRef: expectString(segment.bookingRef ?? '', 'This shared trip file contains an invalid booking reference.', { allowEmpty: true, maxLength: 120 }),
    notificationSummary: expectString(segment.notificationSummary ?? '', 'This shared trip file contains an invalid reminder summary.', {
      allowEmpty: true,
      maxLength: MAX_TEXT_LENGTH,
    }),
    scheduledNotificationIds: expectStringArray(
      segment.scheduledNotificationIds,
      'This shared trip file contains invalid scheduled notification IDs.',
      { maxLength: MAX_ID_LENGTH, maxItems: 20 }
    ),
    notes: expectString(segment.notes ?? '', 'This shared trip file contains invalid travel notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    createdAt: expectIsoDate(segment.createdAt, 'This shared trip file contains an invalid travel segment creation date.'),
    updatedAt: expectIsoDate(segment.updatedAt, 'This shared trip file contains an invalid travel segment update date.'),
  };
}

function validateHotelStay(value: unknown, tripId: string): HotelStay {
  const hotel = expectObject(value, 'This shared trip file contains an invalid hotel stay.');
  const validatedTripId = expectId(hotel.tripId, 'This shared trip file contains an invalid hotel stay trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes hotel stays from another trip.');
  return {
    id: expectId(hotel.id, 'This shared trip file contains an invalid hotel stay ID.'),
    tripId: validatedTripId,
    hotelName: expectString(hotel.hotelName, 'This shared trip file contains a hotel stay without a name.'),
    address: expectString(hotel.address ?? '', 'This shared trip file contains an invalid hotel address.', { allowEmpty: true, maxLength: MAX_LONG_TEXT_LENGTH }),
    city: expectString(hotel.city ?? '', 'This shared trip file contains an invalid hotel city.', { allowEmpty: true }),
    country: expectString(hotel.country ?? '', 'This shared trip file contains an invalid hotel country.', { allowEmpty: true }),
    latitude: hotel.latitude === null ? null : expectNumber(hotel.latitude, 'This shared trip file contains an invalid hotel latitude.', { min: -90, max: 90 }),
    longitude: hotel.longitude === null ? null : expectNumber(hotel.longitude, 'This shared trip file contains an invalid hotel longitude.', { min: -180, max: 180 }),
    hotelImageLocalPath: expectOptionalString(hotel.hotelImageLocalPath ?? null, 'This shared trip file contains an invalid hotel image path.'),
    hotelImageRemoteUrl: expectOptionalString(hotel.hotelImageRemoteUrl ?? null, 'This shared trip file contains an invalid hotel image URL.'),
    hotelImageSource: expectEnum(hotel.hotelImageSource, destinationImageSources, 'This shared trip file contains an invalid hotel image source.'),
    hotelImageAttributionText: expectOptionalString(hotel.hotelImageAttributionText ?? null, 'This shared trip file contains invalid hotel attribution text.'),
    hotelImageAttributionMeta: (hotel.hotelImageAttributionMeta ?? null) as HotelStay['hotelImageAttributionMeta'],
    hotelImageStatus: expectEnum(hotel.hotelImageStatus, heroImageStatuses, 'This shared trip file contains an invalid hotel image state.'),
    phone: expectString(hotel.phone ?? '', 'This shared trip file contains an invalid hotel phone.', { allowEmpty: true, maxLength: 120 }),
    bookingRef: expectString(hotel.bookingRef ?? '', 'This shared trip file contains an invalid hotel booking reference.', { allowEmpty: true, maxLength: 120 }),
    checkIn: expectIsoDate(hotel.checkIn, 'This shared trip file contains an invalid hotel check-in time.'),
    checkOut: expectIsoDate(hotel.checkOut, 'This shared trip file contains an invalid hotel check-out time.'),
    notes: expectString(hotel.notes ?? '', 'This shared trip file contains invalid hotel notes.', { allowEmpty: true, maxLength: MAX_LONG_TEXT_LENGTH }),
    createdAt: expectIsoDate(hotel.createdAt, 'This shared trip file contains an invalid hotel creation date.'),
    updatedAt: expectIsoDate(hotel.updatedAt, 'This shared trip file contains an invalid hotel update date.'),
  };
}

function validateItineraryEvent(value: unknown, tripId: string): ItineraryEvent {
  const event = expectObject(value, 'This shared trip file contains an invalid itinerary event.');
  const validatedTripId = expectId(event.tripId, 'This shared trip file contains an invalid itinerary trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes itinerary events from another trip.');
  return {
    id: expectId(event.id, 'This shared trip file contains an invalid itinerary ID.'),
    tripId: validatedTripId,
    title: expectString(event.title, 'This shared trip file contains an itinerary item without a title.'),
    type: expectEnum(event.type, itineraryTypes, 'This shared trip file contains an invalid itinerary type.'),
    dateTime: expectIsoDate(event.dateTime, 'This shared trip file contains an invalid itinerary time.'),
    location: expectString(event.location ?? '', 'This shared trip file contains an invalid itinerary location.', { allowEmpty: true, maxLength: MAX_LONG_TEXT_LENGTH }),
    confirmationNumber: expectString(event.confirmationNumber ?? '', 'This shared trip file contains an invalid itinerary confirmation number.', {
      allowEmpty: true,
      maxLength: 120,
    }),
    notes: expectString(event.notes ?? '', 'This shared trip file contains invalid itinerary notes.', { allowEmpty: true, maxLength: MAX_LONG_TEXT_LENGTH }),
    createdAt: expectIsoDate(event.createdAt, 'This shared trip file contains an invalid itinerary creation date.'),
    updatedAt: expectIsoDate(event.updatedAt, 'This shared trip file contains an invalid itinerary update date.'),
  };
}

function validateEmergencyInfo(value: unknown, tripId: string): EmergencyInfo | null {
  if (value === null) {
    return null;
  }
  const info = expectObject(value, 'This shared trip file contains an invalid emergency record.');
  const validatedTripId = expectId(info.tripId, 'This shared trip file contains an invalid emergency trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes emergency details from another trip.');
  return {
    id: expectId(info.id, 'This shared trip file contains an invalid emergency record ID.'),
    tripId: validatedTripId,
    insurerEmergencyNumber: expectString(info.insurerEmergencyNumber ?? '', 'This shared trip file contains an invalid insurer emergency number.', {
      allowEmpty: true,
      maxLength: 120,
    }),
    hotelPhone: expectString(info.hotelPhone ?? '', 'This shared trip file contains an invalid hotel phone.', { allowEmpty: true, maxLength: 120 }),
    airlinePhone: expectString(info.airlinePhone ?? '', 'This shared trip file contains an invalid airline phone.', { allowEmpty: true, maxLength: 120 }),
    localEmergencyNote: expectString(info.localEmergencyNote ?? '', 'This shared trip file contains invalid local emergency notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    embassyConsulateNote: expectString(info.embassyConsulateNote ?? '', 'This shared trip file contains invalid embassy notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    travellerMedicalNote: expectString(info.travellerMedicalNote ?? '', 'This shared trip file contains invalid medical notes.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    emergencyContacts: expectString(info.emergencyContacts ?? '', 'This shared trip file contains invalid emergency contacts.', {
      allowEmpty: true,
      maxLength: MAX_LONG_TEXT_LENGTH,
    }),
    createdAt: expectIsoDate(info.createdAt, 'This shared trip file contains an invalid emergency record creation date.'),
    updatedAt: expectIsoDate(info.updatedAt, 'This shared trip file contains an invalid emergency record update date.'),
  };
}

function validateReminderSetting(value: unknown, tripId: string): ReminderSetting {
  const setting = expectObject(value, 'This shared trip file contains an invalid reminder setting.');
  const validatedTripId = expectId(setting.tripId, 'This shared trip file contains an invalid reminder trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes reminder settings from another trip.');
  return {
    id: expectId(setting.id, 'This shared trip file contains an invalid reminder ID.'),
    tripId: validatedTripId,
    kind: expectEnum(setting.kind, reminderKinds, 'This shared trip file contains an invalid reminder type.'),
    enabled: expectBoolean(setting.enabled, 'This shared trip file contains an invalid reminder enabled flag.'),
    leadTimeDays: expectNumberEnum(setting.leadTimeDays, reminderLeadTimes, 'This shared trip file contains an invalid reminder lead time.'),
    createdAt: expectIsoDate(setting.createdAt, 'This shared trip file contains an invalid reminder creation date.'),
    updatedAt: expectIsoDate(setting.updatedAt, 'This shared trip file contains an invalid reminder update date.'),
  };
}

function validateParticipant(value: unknown, tripId: string): TripParticipant {
  const participant = expectObject(value, 'This shared trip file contains an invalid participant record.');
  const validatedTripId = expectId(participant.tripId, 'This shared trip file contains an invalid participant trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes participant records from another trip.');
  return {
    id: expectId(participant.id, 'This shared trip file contains an invalid participant ID.'),
    tripId: validatedTripId,
    displayName: expectString(participant.displayName, 'This shared trip file contains a participant with no display name.'),
    email: expectString(participant.email ?? '', 'This shared trip file contains an invalid participant email.', {
      allowEmpty: true,
      maxLength: 320,
    }),
    role: expectEnum(participant.role, participantRoles, 'This shared trip file contains an invalid participant role.'),
    avatarColor: expectString(participant.avatarColor, 'This shared trip file contains an invalid participant colour.', {
      pattern: /^#[0-9a-f]{6}$/i,
      maxLength: 7,
    }),
    inviteCode: expectString(participant.inviteCode, 'This shared trip file contains an invalid participant invite code.', {
      pattern: SHARE_CODE_PATTERN,
      maxLength: 14,
    }),
    isLocalProfile: expectBoolean(participant.isLocalProfile, 'This shared trip file contains an invalid participant locality flag.'),
    createdAt: expectIsoDate(participant.createdAt, 'This shared trip file contains an invalid participant creation date.'),
    updatedAt: expectIsoDate(participant.updatedAt, 'This shared trip file contains an invalid participant update date.'),
  };
}

function validateInvite(value: unknown, tripId: string): TripInvite {
  const invite = expectObject(value, 'This shared trip file contains an invalid invite record.');
  const validatedTripId = expectId(invite.tripId, 'This shared trip file contains an invalid invite trip ID.');
  assertPacket(validatedTripId === tripId, 'This shared trip file mixes invite records from another trip.');
  return {
    id: expectId(invite.id, 'This shared trip file contains an invalid invite ID.'),
    tripId: validatedTripId,
    email: expectString(invite.email ?? '', 'This shared trip file contains an invalid invite email.', {
      allowEmpty: true,
      maxLength: 320,
    }),
    inviteCode: expectString(invite.inviteCode, 'This shared trip file contains an invalid invite code.', {
      pattern: SHARE_CODE_PATTERN,
      maxLength: 14,
    }),
    role: expectEnum(invite.role, participantRoles, 'This shared trip file contains an invalid invite role.'),
    status: expectEnum(invite.status, inviteStatuses, 'This shared trip file contains an invalid invite status.'),
    createdAt: expectIsoDate(invite.createdAt, 'This shared trip file contains an invalid invite creation date.'),
    updatedAt: expectIsoDate(invite.updatedAt, 'This shared trip file contains an invalid invite update date.'),
  };
}

function validateSharedTripPacketData(value: unknown): SharedTripPacketData {
  const data = expectObject(value, 'This shared trip file is incomplete.');
  const trip = validateTrip(data.trip);
  const travellers = expectArray(data.travellers, 'This shared trip file is missing travellers.').map((item) => validateTraveller(item, trip.id));
  ensureUniqueIds(travellers, 'traveller');
  const travellerIds = new Set(travellers.map((item) => item.id));
  const packingItems = expectArray(data.packingItems, 'This shared trip file is missing packing items.').map((item) =>
    validatePackingItem(item, trip.id, travellerIds)
  );
  const travelSegments = expectArray(data.travelSegments, 'This shared trip file is missing travel segments.').map((item) =>
    validateTravelSegment(item, trip.id)
  );
  const hotelStays = expectArray(data.hotelStays, 'This shared trip file is missing hotel stays.').map((item) => validateHotelStay(item, trip.id));
  const itineraryEvents = expectArray(data.itineraryEvents, 'This shared trip file is missing itinerary items.').map((item) =>
    validateItineraryEvent(item, trip.id)
  );
  const reminderSettings = expectArray(data.reminderSettings, 'This shared trip file is missing reminder settings.').map((item) =>
    validateReminderSetting(item, trip.id)
  );
  const participants = expectArray(data.participants, 'This shared trip file is missing participants.').map((item) =>
    validateParticipant(item, trip.id)
  );
  const invites = expectArray(data.invites, 'This shared trip file is missing invites.').map((item) => validateInvite(item, trip.id));
  const emergencyInfo = validateEmergencyInfo(data.emergencyInfo ?? null, trip.id);

  ensureUniqueIds(packingItems, 'packing item');
  ensureUniqueIds(travelSegments, 'travel segment');
  ensureUniqueIds(hotelStays, 'hotel stay');
  ensureUniqueIds(itineraryEvents, 'itinerary item');
  ensureUniqueIds(reminderSettings, 'reminder');
  ensureUniqueIds(participants, 'participant');
  ensureUniqueIds(invites, 'invite');

  return {
    trip,
    travellers,
    packingItems,
    travelSegments,
    hotelStays,
    itineraryEvents,
    emergencyInfo,
    reminderSettings,
    participants,
    invites,
  };
}

function buildSharedPacketData(snapshot: AppDataSnapshot, tripId: string): SharedTripPacketData {
  const trip = getTripById(snapshot, tripId);
  const bundle = getTripBundle(snapshot, tripId);

  if (!trip) {
    throw new Error('Trip not found.');
  }

  return {
    trip,
    travellers: bundle.travellers,
    packingItems: bundle.packingItems,
    travelSegments: bundle.travelSegments,
    hotelStays: bundle.hotelStays,
    itineraryEvents: bundle.itineraryEvents,
    emergencyInfo: bundle.emergencyInfo,
    reminderSettings: bundle.reminderSettings.filter((setting) => setting.tripId === tripId),
    participants: bundle.participants,
    invites: bundle.invites,
  };
}

export function createSharedTripPacket(snapshot: AppDataSnapshot, tripId: string): SharedTripPacket {
  const trip = getTripById(snapshot, tripId);
  const bundle = getTripBundle(snapshot, tripId);
  const senderLabel =
    bundle.participants.find((participant) => participant.role === 'owner' && participant.isLocalProfile)?.displayName ??
    bundle.participants[0]?.displayName ??
    'Pineapple user';
  const shareCode = bundle.sharedTripState?.shareCode ?? createTransferCode();

  if (!trip) {
    throw new Error('Trip not found.');
  }

  return {
    format: 'pineapple-shared-trip' as const,
    version: 3 as const,
    shareCode,
    generatedAt: now(),
    senderLabel,
    data: buildSharedPacketData(snapshot, tripId),
  };
}

function serializeSharedTripPacket(packet: SharedTripPacket) {
  return JSON.stringify(packet);
}

export function createSharedTripSecureEnvelope(packet: SharedTripPacket, transferCode: string): SharedTripSecureEnvelope {
  const normalizedCode = assertTransferCode(transferCode);
  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);
  const keyMaterial = CryptoJS.PBKDF2(normalizedCode, salt, {
    keySize: 512 / 32,
    iterations: SHARED_TRIP_PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  const ciphertext = CryptoJS.AES.encrypt(serializeSharedTripPacket(packet), encryptionKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString(CryptoJS.enc.Base64);
  const saltHex = salt.toString();
  const ivHex = iv.toString();
  const mac = CryptoJS.HmacSHA256(
    `${ciphertext}.${ivHex}.${saltHex}.${SHARED_TRIP_PBKDF2_ITERATIONS}.pineapple-shared-trip-secure`,
    macKey
  ).toString();

  return {
    format: 'pineapple-shared-trip-secure',
    version: 1,
    encryption: 'aes-256-cbc+hmac-sha256',
    kdf: 'pbkdf2',
    iterations: SHARED_TRIP_PBKDF2_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    mac,
    ciphertext,
  };
}

export function createEncryptedSharedTripTransfer(snapshot: AppDataSnapshot, tripId: string, providedTransferCode?: string) {
  const packet = createSharedTripPacket(snapshot, tripId);
  const transferCode = providedTransferCode?.trim() || createTransferCode();
  const envelope = createSharedTripSecureEnvelope(packet, transferCode);
  const envelopeContents = JSON.stringify(envelope);

  return {
    packet,
    envelope,
    envelopeContents,
    transferCode,
  };
}

export async function exportSharedTripPacket(
  snapshot: AppDataSnapshot,
  tripId: string,
  providedTransferCode?: string
): Promise<SharedTripExportResult> {
  const [{ writeUtf8File }, Sharing] = await Promise.all([
    import('@/utils/fileStorage'),
    import('expo-sharing'),
  ]);
  const { packet, envelope, transferCode } = createEncryptedSharedTripTransfer(snapshot, tripId, providedTransferCode);
  const uri = await writeUtf8File(
    'exports',
    `pineapple-share-${packet.data.trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'trip'}.pineappleshare`,
    JSON.stringify(envelope, null, 2)
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: `${packet.data.trip.name} · Encrypted Nearby / Quick Share`,
    });
  }

  return { uri, transferCode, envelope };
}

function parseSharedTripSecureEnvelope(contents: string): SharedTripSecureEnvelope {
  if (!contents || contents.length > MAX_SHARED_TRIP_PACKET_LENGTH) {
    throw new Error('This shared trip file is too large to import safely.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('This shared trip file is not valid JSON.');
  }

  const envelope = expectObject(parsed, 'This shared trip file is not recognised.');
  const format = expectString(envelope.format, 'This shared trip file is not recognised.');
  if (format === 'pineapple-shared-trip') {
    throw new Error('Plaintext shared-trip files are no longer supported. Export the trip again from Pineapple to create an encrypted transfer.');
  }
  assertPacket(format === 'pineapple-shared-trip-secure', 'This shared trip file is not recognised.');
  const version = expectNumber(envelope.version, 'This shared trip file is not recognised.', {
    integer: true,
    min: 1,
    max: 1,
  }) as 1;
  const encryption = expectString(envelope.encryption, 'This shared trip file uses an unsupported encryption format.');
  assertPacket(encryption === 'aes-256-cbc+hmac-sha256', 'This shared trip file uses an unsupported encryption format.');
  const kdf = expectString(envelope.kdf, 'This shared trip file uses an unsupported key derivation format.');
  assertPacket(kdf === 'pbkdf2', 'This shared trip file uses an unsupported key derivation format.');
  const iterations = expectNumber(envelope.iterations, 'This shared trip file contains invalid encryption settings.', {
    integer: true,
    min: 100000,
    max: 500000,
  });
  const salt = expectString(envelope.salt, 'This shared trip file contains invalid encryption settings.', {
    pattern: /^[a-f0-9]{32}$/i,
    maxLength: 32,
  });
  const iv = expectString(envelope.iv, 'This shared trip file contains invalid encryption settings.', {
    pattern: /^[a-f0-9]{32}$/i,
    maxLength: 32,
  });
  const mac = expectString(envelope.mac, 'This shared trip file failed integrity checks.', {
    pattern: /^[a-f0-9]{64}$/i,
    maxLength: 64,
  });
  const ciphertext = expectString(envelope.ciphertext, 'This shared trip file is incomplete.', {
    maxLength: MAX_SHARED_TRIP_PACKET_LENGTH,
  });

  return {
    format: 'pineapple-shared-trip-secure',
    version,
    encryption: 'aes-256-cbc+hmac-sha256',
    kdf: 'pbkdf2',
    iterations,
    salt,
    iv,
    mac,
    ciphertext,
  };
}

export function parseSharedTripPacket(contents: string, transferCode: string): SharedTripPacket {
  const envelope = parseSharedTripSecureEnvelope(contents);
  const normalizedCode = assertTransferCode(transferCode);
  const salt = CryptoJS.enc.Hex.parse(envelope.salt);
  const iv = CryptoJS.enc.Hex.parse(envelope.iv);
  const keyMaterial = CryptoJS.PBKDF2(normalizedCode, salt, {
    keySize: 512 / 32,
    iterations: envelope.iterations,
    hasher: CryptoJS.algo.SHA256,
  });
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  const expectedMac = CryptoJS.HmacSHA256(
    `${envelope.ciphertext}.${envelope.iv}.${envelope.salt}.${envelope.iterations}.pineapple-shared-trip-secure`,
    macKey
  ).toString();
  assertPacket(expectedMac === envelope.mac, 'Shared-trip integrity check failed. The transfer code or file may be invalid.');

  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    } as CryptoJS.lib.CipherParams,
    encryptionKey,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);
  assertPacket(Boolean(decrypted), 'Unable to decrypt this shared trip. Check the transfer code and try again.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(decrypted);
  } catch {
    throw new Error('The decrypted shared-trip contents were invalid.');
  }

  const packet = expectObject(parsed, 'This shared trip file is not recognised.');
  const format = expectString(packet.format, 'This shared trip file is not recognised.');
  assertPacket(format === 'pineapple-shared-trip', 'This shared trip file is not recognised.');
  const version = expectNumber(packet.version, 'This shared trip file is not recognised.', {
    integer: true,
    min: 3,
    max: 3,
  }) as 3;
  const shareCode = expectString(packet.shareCode, 'This shared trip file contains an invalid share code.', {
    pattern: SHARE_CODE_PATTERN,
    maxLength: 14,
  });
  const generatedAt = expectIsoDate(packet.generatedAt, 'This shared trip file contains an invalid export date.');
  const senderLabel = expectString(packet.senderLabel, 'This shared trip file contains an invalid sender label.', {
    maxLength: 120,
  });
  const data = validateSharedTripPacketData(packet.data);

  return {
    format: 'pineapple-shared-trip',
    version,
    shareCode,
    generatedAt,
    senderLabel,
    data,
  };
}

function replaceTripCollections(snapshot: AppDataSnapshot, packet: SharedTripPacket, tripId: string) {
  const next = cloneSnapshot(snapshot);
  const tripIdsToRemove = new Set([tripId]);

  next.trips = [...next.trips.filter((trip) => !tripIdsToRemove.has(trip.id)), packet.data.trip];
  next.travellers = [...next.travellers.filter((item) => item.tripId !== tripId), ...packet.data.travellers];
  next.packingItems = [...next.packingItems.filter((item) => item.tripId !== tripId), ...packet.data.packingItems];
  next.travelSegments = [...next.travelSegments.filter((item) => item.tripId !== tripId), ...packet.data.travelSegments];
  next.hotelStays = [...next.hotelStays.filter((item) => item.tripId !== tripId), ...packet.data.hotelStays];
  next.itineraryEvents = [...next.itineraryEvents.filter((item) => item.tripId !== tripId), ...packet.data.itineraryEvents];
  next.emergencyInfos = [
    ...next.emergencyInfos.filter((item) => item.tripId !== tripId),
    ...(packet.data.emergencyInfo ? [packet.data.emergencyInfo] : []),
  ];
  next.reminderSettings = [
    ...next.reminderSettings.filter((item) => item.tripId !== tripId),
    ...packet.data.reminderSettings,
  ];
  next.tripParticipants = [...next.tripParticipants.filter((item) => item.tripId !== tripId), ...packet.data.participants];
  next.tripInvites = [...next.tripInvites.filter((item) => item.tripId !== tripId), ...packet.data.invites];
  next.sharedTripStates = [
    ...next.sharedTripStates.filter((item) => item.tripId !== tripId),
    {
      tripId,
      shareCode: packet.shareCode,
      syncEnabled: true,
      syncStatus: 'ready',
      lastSyncAt: now(),
      lastExportedAt: null,
      lastImportedAt: now(),
      lastKnownRemoteUpdatedAt: packet.data.trip.updatedAt,
      createdAt: packet.data.trip.createdAt,
      updatedAt: now(),
    },
  ];

  return next;
}

function buildConflict(packet: SharedTripPacket, tripId: string, localUpdatedAt: string): SyncConflict {
  const timestamp = now();
  return {
    id: createId('conflict'),
    tripId,
    shareCode: packet.shareCode,
    summary: `Manual sync conflict for ${packet.data.trip.name}`,
    localUpdatedAt,
    incomingUpdatedAt: packet.data.trip.updatedAt,
    incomingRecord: {
      senderLabel: packet.senderLabel,
      packetVersion: packet.version,
      data: cloneSnapshot(packet.data),
    },
    status: 'open',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function importSharedTripPacket(snapshot: AppDataSnapshot, packet: SharedTripPacket) {
  const next = cloneSnapshot(snapshot);
  const existingState = snapshot.sharedTripStates.find((state) => state.shareCode === packet.shareCode) ?? null;
  const targetTripId = existingState?.tripId ?? packet.data.trip.id;
  const localTrip = snapshot.trips.find((trip) => trip.id === targetTripId) ?? null;
  const lastKnownRemoteUpdatedAt = existingState?.lastKnownRemoteUpdatedAt;

  if (
    localTrip &&
    lastKnownRemoteUpdatedAt &&
    localTrip.updatedAt > lastKnownRemoteUpdatedAt &&
    packet.data.trip.updatedAt > lastKnownRemoteUpdatedAt &&
    localTrip.updatedAt !== packet.data.trip.updatedAt
  ) {
    const conflict = buildConflict(packet, targetTripId, localTrip.updatedAt);
    next.syncConflicts = [conflict, ...next.syncConflicts];
    next.appPreferences = {
      ...next.appPreferences,
      syncStatus: 'conflict',
      updatedAt: now(),
    };
    next.sharedTripStates = next.sharedTripStates.map((state) =>
      state.tripId === targetTripId
        ? { ...state, syncStatus: 'conflict', updatedAt: now() }
        : state
    );
    return { mode: 'conflict' as const, snapshot: next, conflict };
  }

  const applied = replaceTripCollections(next, packet, targetTripId);
  applied.appPreferences = {
    ...applied.appPreferences,
    syncStatus: applied.appPreferences.syncEnabled ? 'ready' : applied.appPreferences.syncStatus,
    lastSyncAt: now(),
    updatedAt: now(),
  };
  applied.syncConflicts = applied.syncConflicts.filter((conflict) => conflict.tripId !== targetTripId || conflict.status !== 'open');
  return { mode: localTrip ? ('updated' as const) : ('created' as const), snapshot: applied, tripId: targetTripId };
}

export function resolveConflict(snapshot: AppDataSnapshot, conflictId: string, resolution: ConflictStatus) {
  const conflict = snapshot.syncConflicts.find((item) => item.id === conflictId);
  if (!conflict) {
    throw new Error('Conflict not found.');
  }

  const timestamp = now();
  let next = cloneSnapshot(snapshot);

  if (resolution === 'resolved_use_incoming') {
    const packet: SharedTripPacket = {
      format: 'pineapple-shared-trip',
      version: conflict.incomingRecord.packetVersion,
      shareCode: conflict.shareCode,
      generatedAt: timestamp,
      senderLabel: conflict.incomingRecord.senderLabel,
      data: cloneSnapshot(conflict.incomingRecord.data),
    };
    next = replaceTripCollections(next, packet, conflict.tripId);
  }

  next.syncConflicts = next.syncConflicts.map((item) =>
    item.id === conflictId ? { ...item, status: resolution, updatedAt: timestamp } : item
  );
  next.sharedTripStates = next.sharedTripStates.map((state) =>
    state.tripId === conflict.tripId
      ? {
          ...state,
          syncStatus: next.syncConflicts.some((item) => item.tripId === conflict.tripId && item.status === 'open')
            ? 'conflict'
            : 'ready',
          lastImportedAt: resolution === 'resolved_use_incoming' ? timestamp : state.lastImportedAt,
          lastKnownRemoteUpdatedAt:
            resolution === 'resolved_use_incoming' ? conflict.incomingUpdatedAt : state.lastKnownRemoteUpdatedAt,
          updatedAt: timestamp,
        }
      : state
  );
  next.appPreferences = {
    ...next.appPreferences,
    syncStatus: next.syncConflicts.some((item) => item.status === 'open') ? 'conflict' : next.appPreferences.syncEnabled ? 'ready' : 'local_only',
    updatedAt: timestamp,
  };
  return next;
}
