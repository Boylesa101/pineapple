import type { Document, HotelStay, TravelSegment, Traveller } from '@/types/models';

export type TransportCardState = 'top_of_stack' | 'in_stack' | 'clicked' | 'open';
export type TransportProviderId = 'aviationstack' | 'darwin' | 'bods' | 'manual' | 'mock';
export type TransportDisplayType = 'airline' | 'rail' | 'bus' | 'taxi' | 'hotel';
export type TransportLiveState = 'loading' | 'live' | 'stale' | 'unavailable' | 'manual_only' | 'partial';
export type TransportLiveStatus = 'on_time' | 'delayed' | 'boarding' | 'gate_change' | 'cancelled' | 'unknown';
export type TransportSourceConfidence = 'high' | 'medium' | 'low';

export type ProviderCapabilityFlags = {
  supportsRealtime: boolean;
  supportsSchedules: boolean;
  supportsFutureTrips: boolean;
  supportsCommercialUse: boolean;
  requiresCredentials: boolean;
};

export type TransportBrand = {
  operatorName: string;
  operatorBrandColor: string;
  operatorTextColor: string;
  operatorLogoXml: string | null;
  operatorLogoUrl: string | null;
};

export type TransportProviderUpdate = {
  liveState: TransportLiveState;
  liveStatus?: TransportLiveStatus;
  statusLabel?: string;
  departureTime?: string | null;
  arrivalTime?: string | null;
  terminal?: string | null;
  gate?: string | null;
  platform?: string | null;
  stopName?: string | null;
  lineName?: string | null;
  operatorName?: string | null;
  routeLabel?: string | null;
  departureCode?: string | null;
  destinationCode?: string | null;
  departureName?: string | null;
  destinationName?: string | null;
  serviceIdentifier?: string | null;
  notes?: string | null;
  liveNotice?: string | null;
  rawStatus?: string | null;
  lastUpdatedAt?: string | null;
  providerUnavailableReason?: string | null;
  sourceConfidence?: TransportSourceConfidence;
};

export type TransportDataProvider = {
  readonly id: TransportProviderId;
  readonly capabilities: ProviderCapabilityFlags;
  isConfigured: () => boolean;
  refresh: (item: TransportItem) => Promise<TransportProviderUpdate | null>;
};

export type TransportItem = {
  id: string;
  sourceRecordId: string;
  sourceType: 'travel_segment' | 'hotel_stay';
  type: TransportDisplayType;
  provider: TransportProviderId;
  operatorName: string;
  operatorBrandColor: string;
  operatorTextColor: string;
  operatorLogoXml: string | null;
  operatorLogoUrl: string | null;
  serviceIcon: 'flight' | 'train' | 'directions-bus' | 'local-taxi' | 'hotel';
  status: string;
  liveStatus: TransportLiveStatus;
  liveState: TransportLiveState;
  departureTime: string | null;
  arrivalTime: string | null;
  originCode: string;
  destinationCode: string;
  originName: string;
  destinationName: string;
  terminal: string;
  gate: string;
  platform: string;
  stopName: string;
  lineName: string;
  flightNumber: string;
  trainNumber: string;
  serviceNumber: string;
  bookingReference: string;
  ticketReference: string;
  passengerName: string;
  seat: string;
  coach: string;
  cabinClass: string;
  qrOrBarcodeValue: string;
  barcodeFormat: NonNullable<Document['formalDocumentData']>['barcodeFormat'] | null;
  verificationCode: string;
  boardingInfo: string;
  fareLabel: string;
  routeLabel: string;
  liveNotice: string;
  notes: string;
  rawStatus: string;
  lastUpdatedAt: string | null;
  sourceConfidence: TransportSourceConfidence;
  isLive: boolean;
  fallbackSource: string | null;
  matchingDocumentId: string | null;
  travelSegment: TravelSegment | null;
  hotelStay: HotelStay | null;
};

export type TransportBuilderInput = {
  travelSegments: TravelSegment[];
  hotelStays: HotelStay[];
  documents: Document[];
  travellers: Traveller[];
};
