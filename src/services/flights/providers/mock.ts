import type { FlightDataLookup, FlightDataProvider, LiveFlightSnapshot } from '../types';

function normalizeFlightNumber(value: string | null | undefined) {
  return value?.replace(/\s+/g, '').trim().toUpperCase() ?? '';
}

const MOCK_SNAPSHOTS: Record<string, LiveFlightSnapshot> = {
  FR9123: {
    liveStatus: 'boarding',
    statusSource: 'mock',
    providerSource: 'mock',
    callsign: 'RYR9123',
    estimatedDeparture: null,
    estimatedArrival: null,
  },
  U28651: {
    liveStatus: 'delayed',
    statusSource: 'mock',
    providerSource: 'mock',
    callsign: 'EZY8651',
    estimatedDeparture: null,
    estimatedArrival: null,
  },
  BA482: {
    liveStatus: 'on_time',
    statusSource: 'mock',
    providerSource: 'mock',
    callsign: 'BAW482',
    estimatedDeparture: null,
    estimatedArrival: null,
  },
};

export class MockFlightProvider implements FlightDataProvider {
  readonly id = 'mock' as const;

  async lookupFlight(lookup: FlightDataLookup) {
    const carrier = lookup.carrierCode?.trim().toUpperCase() ?? '';
    const suffix = normalizeFlightNumber(lookup.flightNumber).replace(new RegExp(`^${carrier}`), '');
    const key = normalizeFlightNumber(`${carrier}${suffix}`);
    return MOCK_SNAPSHOTS[key] ?? null;
  }
}
