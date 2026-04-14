import type { Document, TravelSegment } from '@/types/models';

import { buildPineappleFlightRecord } from './normalizeFlight';
import { MockFlightProvider } from './providers/mock';
import { OpenSkyProvider } from './providers/opensky';
import type { FlightDataProvider, PineappleFlightRecord } from './types';

const FLIGHT_PROVIDER = (process.env.EXPO_PUBLIC_FLIGHT_PROVIDER ?? 'opensky').trim().toLowerCase();

const providerCache = new Map<string, FlightDataProvider>();
const flightRecordCache = new Map<string, PineappleFlightRecord>();

function createProvider() {
  if (FLIGHT_PROVIDER === 'mock') {
    return new MockFlightProvider();
  }
  if (FLIGHT_PROVIDER === 'opensky') {
    return new OpenSkyProvider();
  }
  return new MockFlightProvider();
}

export function getFlightDataProvider() {
  const cacheKey = FLIGHT_PROVIDER || 'opensky';
  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const provider = createProvider();
  providerCache.set(cacheKey, provider);
  return provider;
}

function cacheKeyForSegment(segment: TravelSegment, documents: Document[]) {
  const documentMarker = documents
    .filter((document) => document.tripId === segment.tripId && document.documentType === 'boarding_pass')
    .map((document) => `${document.id}:${document.updatedAt}`)
    .join('|');
  return `${segment.id}:${segment.updatedAt}:${documentMarker}`;
}

export async function getFlightRecord(segment: TravelSegment, documents: Document[]) {
  const cacheKey = cacheKeyForSegment(segment, documents);
  const cached = flightRecordCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const record = await buildPineappleFlightRecord(segment, documents, getFlightDataProvider());
  flightRecordCache.set(cacheKey, record);
  return record;
}

export async function getFlightRecords(segments: TravelSegment[], documents: Document[]) {
  return Promise.all(segments.map((segment) => getFlightRecord(segment, documents)));
}

export * from './brandResolver';
export * from './types';
