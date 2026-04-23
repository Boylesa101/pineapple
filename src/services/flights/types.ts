import type { Document, TravelSegment } from '@/types/models';

export type FlightLiveStatus = 'on_time' | 'delayed' | 'boarding' | 'gate_change' | 'cancelled' | 'unknown';

export type StatusSource = 'opensky_live' | 'schedule_heuristic' | 'boarding_pass_data' | 'mock' | 'none';

export type FlightProviderSource = 'opensky' | 'mock' | 'none';

export type AirlineBrand = {
  carrierCode: string;
  name: string;
  logoXml: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  bandTextColor?: string;
};

export type FlightDataLookup = {
  carrierCode?: string | null;
  flightNumber?: string | null;
  callsign?: string | null;
  departureAirportCode?: string | null;
  arrivalAirportCode?: string | null;
  departureDatetime?: string | null;
};

export type LiveFlightSnapshot = {
  liveStatus: FlightLiveStatus;
  statusSource: StatusSource;
  providerSource: FlightProviderSource;
  callsign: string | null;
  estimatedDeparture: string | null;
  estimatedArrival: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type FlightDataProvider = {
  readonly id: FlightProviderSource;
  lookupFlight: (lookup: FlightDataLookup) => Promise<LiveFlightSnapshot | null>;
};

export type PineappleFlightRecord = {
  carrierCode: string;
  airlineName: string;
  airlineLogo: string | null;
  airlineLogoUrl: string | null;
  airlinePrimaryColor: string;
  airlineSecondaryColor: string | null;
  airlineBandTextColor: string;
  flightNumber: string;
  callsign: string | null;
  departureAirportCode: string;
  arrivalAirportCode: string;
  departureAirportName: string;
  arrivalAirportName: string;
  departureDatetime: string;
  arrivalDatetime: string;
  scheduledDeparture: string | null;
  estimatedDeparture: string | null;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  liveStatus: FlightLiveStatus;
  statusSource: StatusSource;
  providerSource: FlightProviderSource;
  passengerName: string;
  seat: string;
  sequence: string;
  gateCloseTime: string | null;
  boardingInfo: string;
  fareLabel: string;
  bookingReference: string;
  barcodePayload: string;
  barcodeFormat: NonNullable<Document['formalDocumentData']>['barcodeFormat'] | null;
  baggageSummary: string;
  routeLabel: string;
  travelSegment: TravelSegment;
  boardingDocument: Document | null;
};
