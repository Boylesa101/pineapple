export type TripStatus = 'upcoming' | 'active' | 'completed';
export type DestinationType = 'country' | 'place' | 'unknown';
export type HeroImageStatus = 'idle' | 'loading' | 'ready' | 'failed';
export type DestinationImageSource = 'curated' | 'pexels' | 'wikimedia' | 'fallback';
export type TransportType = 'flight' | 'private_flight' | 'train' | 'car' | 'hire_car' | 'taxi' | 'ferry' | 'eurotunnel';
export type TravelDirection = 'outbound' | 'return' | 'other';
export type VibeCategory = 'eat' | 'drink' | 'visit' | 'do';
export type DocumentType =
  | 'passport'
  | 'ghic'
  | 'insurance'
  | 'visa'
  | 'driving_licence'
  | 'payment_card'
  | 'id_card'
  | 'boarding_pass'
  | 'hotel_booking'
  | 'excursion_ticket'
  | 'hire_car_booking'
  | 'airport_lounge_pass'
  | 'loyalty_card'
  | 'rail_ticket'
  | 'custom';
export type ExpiryReminderLeadTime = 180 | 90 | 30 | 14 | 7 | 1 | 0;
export type ExpiryReminderSchedule = ExpiryReminderLeadTime[];
export type PackingCategory =
  | 'clothes'
  | 'toiletries'
  | 'documents'
  | 'electronics'
  | 'medicines'
  | 'beach_pool'
  | 'kids_baby'
  | 'other';
export type LuggageType = 'carry_on' | 'checked';
export type PackingAssignmentScope = 'trip' | 'travellers';
export type PackingPriority = 'essential' | 'useful' | 'optional';
export type ItineraryType = 'excursion' | 'meal' | 'ticket' | 'reminder' | 'custom';
export type RelationshipType = 'adult' | 'child' | 'infant' | 'other';
export type ReminderKind =
  | 'passport_expiry'
  | 'ghic_expiry'
  | 'packing_incomplete'
  | 'trip_countdown_30_days'
  | 'trip_countdown_7_days'
  | 'trip_countdown_3_days'
  | 'trip_countdown_1_day'
  | 'trip_starts_tomorrow'
  | 'trip_today'
  | 'insurance_missing'
  | 'transport_departure'
  | 'flight_check_in'
  | 'hotel_check_in'
  | 'transfer_reminder'
  | 'travel_mode_reminder'
  | 'sos_ready'
  | 'excursion_reminder';
export type ReminderLeadTime = 30 | 7 | 6 | 3 | 1 | 0;
export type ParticipantRole = 'owner' | 'editor' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';
export type SyncMode = 'manual_share';
export type SyncStatus = 'local_only' | 'ready' | 'pending_export' | 'pending_import' | 'conflict';
export type ConflictStatus = 'open' | 'resolved_keep_local' | 'resolved_use_incoming';
export type PrivacyMaskingMode = 'always' | 'travel_mode';
export type TravelStyle = 'family_holidays' | 'city_breaks' | 'road_trips' | 'mixed';
export type PinLength = number;
export type VerificationStatus = 'verified' | 'review' | 'unverified';
export type PassportVerificationStatus = VerificationStatus;
export type AppLanguage = 'en-GB' | 'en-US' | 'fr-FR' | 'es-ES' | 'de-DE' | 'it-IT';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  destinationType: DestinationType;
  startDate: string;
  endDate: string;
  destinationImageLocalPath: string | null;
  destinationImageRemoteUrl: string | null;
  destinationImageSource: DestinationImageSource;
  attributionText: string | null;
  attributionMeta: DestinationImageAttribution | null;
  coverImageUri: string | null;
  heroImageRemoteUrl: string | null;
  heroImageStatus: HeroImageStatus;
  notes: string;
  transferSummary: string;
  transferProvider: string;
  transferMethod: string;
  transferLocation: string;
  transferTime: string | null;
  airportTravelDurationMinutes: number | null;
  transferNotes: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationImageAttribution {
  source: DestinationImageSource;
  photographer?: string;
  photographerUrl?: string;
  title?: string;
  author?: string;
  license?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export interface Traveller {
  id: string;
  tripId: string;
  fullName: string;
  photoUri?: string | null;
  dateOfBirth: string | null;
  passportNationality: string;
  passportNumber: string;
  ghicNumber: string;
  medicalNote: string;
  notes: string;
  avatarColor: string;
  relationshipType: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  tripId: string;
  travellerId: string | null;
  holderName: string;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  expiryReminderEnabled: boolean;
  expiryReminderSchedule: ExpiryReminderSchedule;
  expiredStatus: boolean;
  expiringSoonStatus: boolean;
  notes: string;
  localFileUri: string;
  previewUri: string | null;
  mimeType: string | null;
  passportData?: PassportData | null;
  secondaryLocalFileUri?: string | null;
  secondaryPreviewUri?: string | null;
  secondaryMimeType?: string | null;
  drivingLicenceData?: DrivingLicenceData | null;
  healthCardData?: HealthCardData | null;
  paymentCardData?: PaymentCardData | null;
  formalDocumentData?: FormalDocumentData | null;
  sensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PassportData {
  passportType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string | null;
  placeOfBirth: string;
}

export interface DrivingLicenceData {
  address: string;
  dateOfBirth: string | null;
  categories: string;
  issuingAuthority: string;
  status: string;
}

export interface HealthCardData {
  issuer: string;
  countryCode: string;
  emergencyLine: string;
  status: string;
}

export interface PaymentCardData {
  cardType: string;
  bank: string;
  billingDetails: string;
  cvv: string;
}

export interface FormalDocumentData {
  title: string;
  issuer: string;
  referenceCode: string;
  location: string;
  status: string;
  summary: string;
  railClass?: string;
  ticketType?: string;
  coach?: string;
  seat?: string;
  travellerName?: string;
  fare?: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  title: string;
  category: PackingCategory;
  quantity: number;
  isPacked: boolean;
  luggageType: LuggageType;
  assignmentScope: PackingAssignmentScope;
  travellerIds: string[];
  priority: PackingPriority;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TravelSegment {
  id: string;
  tripId: string;
  transportType: TransportType;
  travelDirection: TravelDirection;
  airline: string;
  providerCode: string;
  providerLogoUrl: string | null;
  flightNumber: string;
  departureAirport: string;
  departureAirportCode: string;
  arrivalAirport: string;
  arrivalAirportCode: string;
  departureTime: string;
  departureTimeZone: string | null;
  arrivalTime: string;
  terminal: string;
  gate: string;
  bookingRef: string;
  notificationSummary: string;
  scheduledNotificationIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelStay {
  id: string;
  tripId: string;
  hotelName: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  hotelImageLocalPath: string | null;
  hotelImageRemoteUrl: string | null;
  hotelImageSource: DestinationImageSource;
  hotelImageAttributionText: string | null;
  hotelImageAttributionMeta: DestinationImageAttribution | null;
  hotelImageStatus: HeroImageStatus;
  phone: string;
  bookingRef: string;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryEvent {
  id: string;
  tripId: string;
  title: string;
  type: ItineraryType;
  dateTime: string;
  location: string;
  confirmationNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyInfo {
  id: string;
  tripId: string;
  insurerEmergencyNumber: string;
  hotelPhone: string;
  airlinePhone: string;
  localEmergencyNote: string;
  embassyConsulateNote: string;
  travellerMedicalNote: string;
  emergencyContacts: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSetting {
  id: string;
  tripId: string | null;
  kind: ReminderKind;
  enabled: boolean;
  leadTimeDays: ReminderLeadTime;
  createdAt: string;
  updatedAt: string;
}

export interface SavedVibe {
  id: string;
  tripId: string;
  source: 'tripadvisor';
  sourceItemId: string;
  name: string;
  category: VibeCategory;
  displayCategory: string;
  address: string;
  rating: string | null;
  ranking: string | null;
  tripadvisorUrl: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VibeCacheEntry {
  id: string;
  tripId: string;
  queryKey: string;
  areaLabel: string;
  source: 'tripadvisor';
  payloadJson: string;
  fetchedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppPreferences {
  id: 'app';
  appLanguage: AppLanguage;
  notificationsEnabled: boolean;
  expiryRemindersEnabled: boolean;
  expiryReminderSchedule: ExpiryReminderSchedule;
  expiryReminderSilent: boolean;
  structuredDataProtected: boolean;
  profileName: string;
  profilePhotoUri: string | null;
  travelStyle: TravelStyle;
  syncEnabled: boolean;
  syncMode: SyncMode;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  lastBackupAt: string | null;
  privacyMaskingMode: PrivacyMaskingMode;
  vibesIntroSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripParticipant {
  id: string;
  tripId: string;
  displayName: string;
  email: string;
  role: ParticipantRole;
  avatarColor: string;
  inviteCode: string;
  isLocalProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripInvite {
  id: string;
  tripId: string;
  email: string;
  inviteCode: string;
  role: ParticipantRole;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SharedTripState {
  tripId: string;
  shareCode: string;
  syncEnabled: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  lastExportedAt: string | null;
  lastImportedAt: string | null;
  lastKnownRemoteUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncConflict {
  id: string;
  tripId: string;
  shareCode: string;
  summary: string;
  localUpdatedAt: string;
  incomingUpdatedAt: string;
  incomingPayload: string;
  status: ConflictStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppSecuritySettings {
  pinConfigured: boolean;
  pinLength: PinLength;
  biometricEnabled: boolean;
  autoLockSeconds: number;
}

export interface StoredSecurityConfig extends AppSecuritySettings {
  hashVersion: 1 | 2 | 3 | 4;
  salt: string;
  hash: string;
  failedUnlockAttempts: number;
  unlockBlockedUntil: number | null;
}

export interface AppDataSnapshot {
  trips: Trip[];
  travellers: Traveller[];
  documents: Document[];
  packingItems: PackingItem[];
  travelSegments: TravelSegment[];
  hotelStays: HotelStay[];
  itineraryEvents: ItineraryEvent[];
  emergencyInfos: EmergencyInfo[];
  reminderSettings: ReminderSetting[];
  savedVibes: SavedVibe[];
  vibeCacheEntries: VibeCacheEntry[];
  appPreferences: AppPreferences;
  tripParticipants: TripParticipant[];
  tripInvites: TripInvite[];
  sharedTripStates: SharedTripState[];
  syncConflicts: SyncConflict[];
}

export interface BackupAttachment {
  originalUri: string;
  folder: 'trips' | 'vault';
  mimeType: string | null;
  fileName: string;
  base64: string;
}

export interface BackupPayload {
  version: 3;
  exportedAt: string;
  settings: {
    autoLockSeconds: number;
  };
  data: AppDataSnapshot;
  attachments: BackupAttachment[];
}

export interface BackupEnvelope {
  format: 'pineapple-backup';
  version: 3;
  encryption: 'aes-256-cbc+hmac-sha256';
  kdf: 'pbkdf2';
  iterations: number;
  salt: string;
  iv: string;
  mac: string;
  ciphertext: string;
}

export interface BackupExportResult {
  uri: string;
  exportedAt: string;
  attachmentCount: number;
  skippedAttachmentCount: number;
}

export interface PdfExportOptions {
  includeEmergencyNumbers: boolean;
  includeDocumentNumbers: boolean;
  includePackingList: boolean;
  includeDocumentReferences: boolean;
  hideSensitiveValues: boolean;
}

export interface SharedTripPacketData {
  trip: Trip;
  travellers: Traveller[];
  packingItems: PackingItem[];
  travelSegments: TravelSegment[];
  hotelStays: HotelStay[];
  itineraryEvents: ItineraryEvent[];
  emergencyInfo: EmergencyInfo | null;
  reminderSettings: ReminderSetting[];
  participants: TripParticipant[];
  invites: TripInvite[];
}

export interface SharedTripPacket {
  format: 'pineapple-shared-trip';
  version: 1 | 2;
  shareCode: string;
  generatedAt: string;
  senderLabel: string;
  data: SharedTripPacketData;
  integrity?: {
    algorithm: 'sha256';
    payloadHash: string;
    encrypted: boolean;
    authenticated: boolean;
  };
}

export type TripDraft = Omit<Trip, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TravellerDraft = Omit<Traveller, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type DocumentDraft = Omit<Document, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type PackingItemDraft = Omit<PackingItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TravelSegmentDraft = Omit<TravelSegment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type HotelStayDraft = Omit<HotelStay, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type ItineraryEventDraft = Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type EmergencyInfoDraft = Omit<EmergencyInfo, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type ReminderSettingDraft = Omit<ReminderSetting, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type SavedVibeDraft = Omit<SavedVibe, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type VibeCacheEntryDraft = Omit<VibeCacheEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type AppPreferencesDraft = Omit<AppPreferences, 'createdAt' | 'updatedAt'>;
export type TripParticipantDraft = Omit<TripParticipant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TripInviteDraft = Omit<TripInvite, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type SharedTripStateDraft = Omit<SharedTripState, 'createdAt' | 'updatedAt'>;
export type SyncConflictDraft = Omit<SyncConflict, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
