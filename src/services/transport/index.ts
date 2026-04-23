import type { Document, HotelStay, TransportType, TravelSegment, Traveller } from '@/types/models';

import { resolveTransportBrand } from './brandResolver';
import { BodsProvider } from './providers/bods';
import { DarwinProvider } from './providers/darwin';
import { MockTransportProvider } from './providers/mock';
import { OpenSkyTransportProvider } from './providers/opensky';
import type {
  TransportBuilderInput,
  TransportDataProvider,
  TransportDisplayType,
  TransportItem,
  TransportProviderId,
  TransportProviderUpdate,
} from './types';

const TRANSPORT_PROVIDER_MODE = (process.env.EXPO_PUBLIC_TRANSPORT_PROVIDER_MODE ?? '').trim().toLowerCase();

const providerCache = new Map<TransportProviderId | 'mock_dev', TransportDataProvider>();
const transportCache = new Map<string, TransportItem[]>();

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeServiceNumber(segment: TravelSegment) {
  return normalizeText(segment.flightNumber);
}

function normalizeTransportKind(type: TransportType): TransportDisplayType {
  if (type === 'flight' || type === 'private_flight') {
    return 'airline';
  }
  if (type === 'train' || type === 'underground' || type === 'metro') {
    return 'rail';
  }
  if (type === 'bus') {
    return 'bus';
  }
  if (type === 'taxi' || type === 'hire_car' || type === 'car') {
    return 'taxi';
  }
  return 'hotel';
}

function serviceIcon(type: TransportDisplayType) {
  if (type === 'airline') return 'flight' as const;
  if (type === 'rail') return 'train' as const;
  if (type === 'bus') return 'directions-bus' as const;
  if (type === 'taxi') return 'local-taxi' as const;
  return 'hotel' as const;
}

function matchingTravellerName(travellers: Traveller[]) {
  return travellers[0]?.fullName?.trim() || 'Passenger';
}

function matchingBoardingPass(segment: TravelSegment, documents: Document[]) {
  const serviceNumber = segment.flightNumber.replace(/\s+/g, '').toUpperCase();
  const bookingRef = segment.bookingRef.trim().toUpperCase();
  const carrierCode = segment.providerCode.trim().toUpperCase();
  return (
    documents.find((document) => {
      if (document.tripId !== segment.tripId || document.documentType !== 'boarding_pass') {
        return false;
      }
      const data = document.formalDocumentData;
      const documentFlightNumber = data?.flightNumber?.replace(/\s+/g, '').toUpperCase() ?? '';
      const documentCarrierCode = data?.carrierCode?.trim().toUpperCase() ?? '';
      const referenceCode = data?.referenceCode?.trim().toUpperCase() ?? document.documentNumber.trim().toUpperCase();
      return referenceCode === bookingRef || (documentFlightNumber === serviceNumber && (!documentCarrierCode || documentCarrierCode === carrierCode));
    }) ?? null
  );
}

function matchingRailTicket(segment: TravelSegment, documents: Document[]) {
  const serviceNumber = segment.flightNumber.replace(/\s+/g, '').toUpperCase();
  const bookingRef = segment.bookingRef.trim().toUpperCase();
  return (
    documents.find((document) => {
      if (document.tripId !== segment.tripId || document.documentType !== 'rail_ticket') {
        return false;
      }
      const data = document.formalDocumentData;
      const referenceCode = data?.referenceCode?.trim().toUpperCase() ?? document.documentNumber.trim().toUpperCase();
      return referenceCode === bookingRef || referenceCode === serviceNumber;
    }) ?? null
  );
}

function matchingTravelDocument(segment: TravelSegment, documents: Document[]) {
  const type = normalizeTransportKind(segment.transportType);
  if (type === 'airline') {
    return matchingBoardingPass(segment, documents);
  }
  if (type === 'rail') {
    return matchingRailTicket(segment, documents);
  }
  return null;
}

function statusFromTiming(departureTime: string | null) {
  if (!departureTime) {
    return { liveStatus: 'unknown' as const, status: 'Saved locally' };
  }
  const departureMs = Date.parse(departureTime);
  if (Number.isFinite(departureMs) && departureMs <= Date.now() + 50 * 60 * 1000 && departureMs >= Date.now() - 10 * 60 * 1000) {
    return { liveStatus: 'boarding' as const, status: 'Soon' };
  }
  return { liveStatus: 'unknown' as const, status: 'Saved locally' };
}

function humanRouteLabel(originName: string, destinationName: string, fallback: string) {
  if (originName && destinationName) {
    return `${originName} to ${destinationName}`;
  }
  return fallback;
}

function buildManualTransportItem(segment: TravelSegment, documents: Document[], travellers: Traveller[]): TransportItem {
  const type = normalizeTransportKind(segment.transportType);
  const matchingDocument = matchingTravelDocument(segment, documents);
  const formalData = matchingDocument?.formalDocumentData ?? null;
  const brand = resolveTransportBrand({
    type,
    transportType: segment.transportType,
    operatorCode: segment.providerCode,
    operatorName: segment.airline,
    logoUrl: segment.providerLogoUrl,
  });
  const fallbackStatus = statusFromTiming(segment.departureTime);
  const passengerName = formalData?.travellerName?.trim() || matchingDocument?.holderName?.trim() || matchingTravellerName(travellers);
  const lineName = normalizeText(formalData?.title) || normalizeText(segment.flightNumber);
  const routeLabel = humanRouteLabel(segment.departureAirport, segment.arrivalAirport, segment.airline || brand.operatorName);

  return {
    id: `${type}-${segment.id}`,
    sourceRecordId: segment.id,
    sourceType: 'travel_segment',
    type,
    provider: 'manual',
    operatorName: normalizeText(segment.airline) || brand.operatorName,
    operatorBrandColor: brand.operatorBrandColor,
    operatorTextColor: brand.operatorTextColor,
    operatorLogoXml: brand.operatorLogoXml,
    operatorLogoUrl: brand.operatorLogoUrl,
    serviceIcon: serviceIcon(type),
    status: fallbackStatus.status,
    liveStatus: fallbackStatus.liveStatus,
    liveState: 'manual_only',
    departureTime: segment.departureTime || null,
    arrivalTime: segment.arrivalTime || null,
    originCode: normalizeText(segment.departureAirportCode),
    destinationCode: normalizeText(segment.arrivalAirportCode),
    originName: normalizeText(segment.departureAirport),
    destinationName: normalizeText(segment.arrivalAirport),
    terminal: normalizeText(segment.terminal),
    gate: normalizeText(segment.gate),
    platform: normalizeText(formalData?.coach || segment.terminal),
    stopName: normalizeText(segment.departureAirport),
    lineName,
    flightNumber: type === 'airline' ? normalizeText(segment.flightNumber) : '',
    trainNumber: type === 'rail' ? normalizeText(segment.flightNumber) : '',
    serviceNumber: type === 'bus' || type === 'rail' ? normalizeText(segment.flightNumber) : normalizeText(segment.flightNumber),
    bookingReference: normalizeText(segment.bookingRef),
    ticketReference: normalizeText(formalData?.referenceCode) || normalizeText(segment.bookingRef),
    passengerName,
    seat: normalizeText(formalData?.seat),
    coach: normalizeText(formalData?.coach),
    cabinClass: normalizeText(formalData?.fare),
    qrOrBarcodeValue: normalizeText(formalData?.barcodePayload),
    barcodeFormat: formalData?.barcodeFormat ?? null,
    verificationCode: normalizeText(formalData?.sequence),
    boardingInfo: normalizeText(formalData?.boardingInfo) || [segment.terminal && `Terminal ${segment.terminal}`, segment.gate && `Gate ${segment.gate}`].filter(Boolean).join(' • '),
    fareLabel: normalizeText(formalData?.fare),
    routeLabel,
    liveNotice: '',
    notes: normalizeText(segment.notes),
    rawStatus: '',
    lastUpdatedAt: null,
    sourceConfidence: 'medium',
    isLive: false,
    fallbackSource: 'saved_trip_details',
    matchingDocumentId: matchingDocument?.id ?? null,
    travelSegment: segment,
    hotelStay: null,
  };
}

function buildHotelItem(hotel: HotelStay): TransportItem {
  const brand = resolveTransportBrand({
    type: 'hotel',
    operatorName: hotel.hotelName,
  });
  return {
    id: `hotel-${hotel.id}`,
    sourceRecordId: hotel.id,
    sourceType: 'hotel_stay',
    type: 'hotel',
    provider: 'manual',
    operatorName: hotel.hotelName,
    operatorBrandColor: brand.operatorBrandColor,
    operatorTextColor: brand.operatorTextColor,
    operatorLogoXml: null,
    operatorLogoUrl: null,
    serviceIcon: 'hotel',
    status: 'Booking saved',
    liveStatus: 'unknown',
    liveState: 'manual_only',
    departureTime: hotel.checkIn || null,
    arrivalTime: hotel.checkOut || null,
    originCode: '',
    destinationCode: '',
    originName: hotel.city,
    destinationName: hotel.country,
    terminal: '',
    gate: '',
    platform: '',
    stopName: hotel.address,
    lineName: '',
    flightNumber: '',
    trainNumber: '',
    serviceNumber: '',
    bookingReference: normalizeText(hotel.bookingRef),
    ticketReference: normalizeText(hotel.bookingRef),
    passengerName: '',
    seat: '',
    coach: '',
    cabinClass: '',
    qrOrBarcodeValue: '',
    barcodeFormat: null,
    verificationCode: '',
    boardingInfo: hotel.address,
    fareLabel: '',
    routeLabel: hotel.hotelName,
    liveNotice: '',
    notes: normalizeText(hotel.notes),
    rawStatus: '',
    lastUpdatedAt: null,
    sourceConfidence: 'medium',
    isLive: false,
    fallbackSource: 'saved_trip_details',
    matchingDocumentId: null,
    travelSegment: null,
    hotelStay: hotel,
  };
}

function createProvider(id: TransportProviderId): TransportDataProvider {
  if (id === 'opensky') {
    return new OpenSkyTransportProvider();
  }
  if (id === 'darwin') {
    return new DarwinProvider();
  }
  if (id === 'bods') {
    return new BodsProvider();
  }
  return new MockTransportProvider();
}

function providerForItem(item: TransportItem) {
  if (TRANSPORT_PROVIDER_MODE === 'mock') {
    const cached = providerCache.get('mock_dev');
    if (cached) {
      return cached;
    }
    const provider = new MockTransportProvider();
    providerCache.set('mock_dev', provider);
    return provider;
  }

  const providerId: TransportProviderId =
    item.type === 'airline' ? 'opensky' : item.type === 'rail' ? 'darwin' : item.type === 'bus' ? 'bods' : 'manual';

  if (providerId === 'manual') {
    return null;
  }

  const cached = providerCache.get(providerId);
  if (cached) {
    return cached;
  }
  const provider = createProvider(providerId);
  providerCache.set(providerId, provider);
  return provider;
}

function mergeLiveUpdate(item: TransportItem, update: TransportProviderUpdate | null): TransportItem {
  if (!update) {
    return item;
  }

  return {
    ...item,
    provider: update.liveState === 'manual_only' ? 'manual' : providerForItem(item)?.id ?? item.provider,
    operatorName: normalizeText(update.operatorName) || item.operatorName,
    status: update.statusLabel ?? item.status,
    liveStatus: update.liveStatus ?? item.liveStatus,
    liveState: update.liveState,
    departureTime: update.departureTime ?? item.departureTime,
    arrivalTime: update.arrivalTime ?? item.arrivalTime,
    terminal: normalizeText(update.terminal) || item.terminal,
    gate: normalizeText(update.gate) || item.gate,
    platform: normalizeText(update.platform) || item.platform,
    stopName: normalizeText(update.stopName) || item.stopName,
    lineName: normalizeText(update.lineName) || item.lineName,
    routeLabel: normalizeText(update.routeLabel) || item.routeLabel,
    originCode: normalizeText(update.departureCode) || item.originCode,
    destinationCode: normalizeText(update.destinationCode) || item.destinationCode,
    originName: normalizeText(update.departureName) || item.originName,
    destinationName: normalizeText(update.destinationName) || item.destinationName,
    liveNotice: normalizeText(update.liveNotice) || item.liveNotice,
    rawStatus: normalizeText(update.rawStatus) || item.rawStatus,
    lastUpdatedAt: update.lastUpdatedAt ?? item.lastUpdatedAt,
    sourceConfidence: update.sourceConfidence ?? item.sourceConfidence,
    isLive: update.liveState === 'live' || update.liveState === 'partial',
    fallbackSource: update.providerUnavailableReason ?? item.fallbackSource,
  };
}

async function hydrateTransportItem(item: TransportItem) {
  const provider = providerForItem(item);
  if (!provider) {
    return item;
  }
  const update = await provider.refresh(item);
  return mergeLiveUpdate(item, update);
}

function tripCacheKey({ travelSegments, hotelStays, documents }: TransportBuilderInput) {
  return [
    travelSegments.map((segment) => `${segment.id}:${segment.updatedAt}`).join('|'),
    hotelStays.map((hotel) => `${hotel.id}:${hotel.updatedAt}`).join('|'),
    documents.map((document) => `${document.id}:${document.updatedAt}`).join('|'),
    TRANSPORT_PROVIDER_MODE,
  ].join('::');
}

function orderedTransportItems(items: TransportItem[]) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.departureTime ?? '') || Number.MAX_SAFE_INTEGER;
    const rightTime = Date.parse(right.departureTime ?? '') || Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.routeLabel.localeCompare(right.routeLabel);
  });
}

export async function getTransportItems(input: TransportBuilderInput) {
  const cacheKey = tripCacheKey(input);
  const cached = transportCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseItems = input.travelSegments.map((segment) => buildManualTransportItem(segment, input.documents, input.travellers));
  const hotelItems = input.hotelStays.map((hotel) => buildHotelItem(hotel));
  const hydrated = await Promise.all([...baseItems, ...hotelItems].map((item) => hydrateTransportItem(item)));
  const ordered = orderedTransportItems(hydrated);
  transportCache.set(cacheKey, ordered);
  return ordered;
}

export async function getTransportItemById(input: TransportBuilderInput, itemId: string) {
  const items = await getTransportItems(input);
  return items.find((item) => item.id === itemId) ?? null;
}

export function getTransportProviderDiagnostics() {
  const flightProvider = createProvider('opensky');
  const darwinProvider = createProvider('darwin');
  const bodsProvider = createProvider('bods');

  return {
    opensky: { configured: flightProvider.isConfigured(), capabilities: flightProvider.capabilities },
    darwin: { configured: darwinProvider.isConfigured(), capabilities: darwinProvider.capabilities },
    bods: { configured: bodsProvider.isConfigured(), capabilities: bodsProvider.capabilities },
    mockMode: TRANSPORT_PROVIDER_MODE === 'mock',
  };
}

export type { TransportItem, TransportCardState, TransportDisplayType, TransportLiveStatus } from './types';
