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
export type ItineraryType = 'excursion' | 'meal' | 'ticket' | 'reminder' | 'custom';
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
  passportNumber: string;
  ghicNumber: string;
  medicalNote: string;
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
  travellerId: string | null;
  title: string;
  category: PackingCategory;
  quantity: number;
  isPacked: boolean;
  luggageType: LuggageType;
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
}

export type TripDraft = Omit<Trip, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TravellerDraft = Omit<Traveller, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type DocumentDraft = Omit<Document, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type PackingItemDraft = Omit<PackingItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TravelSegmentDraft = Omit<TravelSegment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type HotelStayDraft = Omit<HotelStay, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type ItineraryEventDraft = Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type EmergencyInfoDraft = Omit<EmergencyInfo, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
