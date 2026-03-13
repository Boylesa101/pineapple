export type TripStatus = 'upcoming' | 'active' | 'completed';
export type DocumentType =
  | 'passport'
  | 'ghic'
  | 'insurance'
  | 'visa'
  | 'boarding_pass'
  | 'hotel_booking'
  | 'excursion_ticket'
  | 'custom';
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
export type ReminderKind = 'passport_expiry' | 'packing_incomplete' | 'trip_starts_tomorrow';
export type PinLength = 4 | 6;

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageUri: string | null;
  notes: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Traveller {
  id: string;
  tripId: string;
  fullName: string;
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
  notes: string;
  localFileUri: string;
  previewUri: string | null;
  mimeType: string | null;
  sensitive: boolean;
  createdAt: string;
  updatedAt: string;
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
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  terminal: string;
  gate: string;
  bookingRef: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelStay {
  id: string;
  tripId: string;
  hotelName: string;
  address: string;
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
  leadTimeDays: number;
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
  salt: string;
  hash: string;
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
}

export interface BackupAttachment {
  originalUri: string;
  folder: 'trips' | 'vault';
  mimeType: string | null;
  fileName: string;
  base64: string;
}

export interface BackupPayload {
  version: 2;
  exportedAt: string;
  settings: {
    autoLockSeconds: number;
  };
  data: AppDataSnapshot;
  attachments: BackupAttachment[];
}

export interface BackupEnvelope {
  format: 'pineapple-backup';
  version: 2;
  encryption: 'aes';
  ciphertext: string;
}

export interface PdfExportOptions {
  includeEmergencyNumbers: boolean;
  includeDocumentNumbers: boolean;
  includePackingList: boolean;
  includeDocumentReferences: boolean;
  hideSensitiveValues: boolean;
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
