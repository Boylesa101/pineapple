import type { TransportDataProvider, TransportItem, TransportLiveStatus, TransportProviderUpdate } from '../types';

const BODS_API_KEY = process.env.EXPO_PUBLIC_BODS_API_KEY?.trim() ?? '';
const BODS_BASE_URL = (process.env.EXPO_PUBLIC_BODS_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const BODS_ENDPOINT = (process.env.EXPO_PUBLIC_BODS_ENDPOINT ?? '').trim();

type BodsStopVisit = {
  routeName?: string | null;
  lineName?: string | null;
  operatorName?: string | null;
  aimedDepartureTime?: string | null;
  expectedDepartureTime?: string | null;
  destinationName?: string | null;
  stopName?: string | null;
  status?: string | null;
};

function normalizeBusStatus(raw: string | null): { liveStatus: TransportLiveStatus; statusLabel: string } {
  const value = raw?.trim().toLowerCase() ?? '';
  if (!value) {
    return { liveStatus: 'unknown', statusLabel: 'Status unavailable' };
  }
  if (value.includes('cancel')) {
    return { liveStatus: 'cancelled', statusLabel: 'Cancelled' };
  }
  if (value.includes('delay') || value.includes('late')) {
    return { liveStatus: 'delayed', statusLabel: 'Delayed' };
  }
  return { liveStatus: 'on_time', statusLabel: 'On time' };
}

function bestEndpoint() {
  if (BODS_ENDPOINT) {
    return BODS_ENDPOINT;
  }
  if (BODS_BASE_URL) {
    return `${BODS_BASE_URL}/journeys`;
  }
  return null;
}

export class BodsProvider implements TransportDataProvider {
  readonly id = 'bods' as const;
  readonly capabilities = {
    supportsRealtime: true,
    supportsSchedules: true,
    supportsFutureTrips: false,
    supportsCommercialUse: false,
    requiresCredentials: true,
  };

  isConfigured() {
    return Boolean(BODS_API_KEY && bestEndpoint());
  }

  async refresh(item: TransportItem): Promise<TransportProviderUpdate | null> {
    if (item.type !== 'bus') {
      return null;
    }

    const endpoint = bestEndpoint();
    if (!BODS_API_KEY || !endpoint) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'BODS credentials or endpoint are missing, so Pineapple is using stored bus details only.',
      };
    }

    const url = new URL(endpoint);
    if (item.serviceNumber) {
      url.searchParams.set('service', item.serviceNumber);
    }
    if (item.operatorName) {
      url.searchParams.set('operator', item.operatorName);
    }
    if (item.stopName) {
      url.searchParams.set('stop', item.stopName);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'x-api-key': BODS_API_KEY,
        },
      });
    } catch {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'BODS could not be reached from this device.',
      };
    }

    if (response.status === 429) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'BODS rate limited the request.',
      };
    }

    if (!response.ok) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `BODS returned ${response.status}.`,
      };
    }

    const payload = (await response.json()) as { items?: BodsStopVisit[]; results?: BodsStopVisit[]; data?: BodsStopVisit[] };
    const candidates = payload.items ?? payload.results ?? payload.data ?? [];
    const match =
      candidates.find((entry) => {
        const sameLine = !item.serviceNumber || entry.lineName?.trim().toUpperCase() === item.serviceNumber.trim().toUpperCase();
        const sameStop = !item.stopName || entry.stopName?.trim().toUpperCase() === item.stopName.trim().toUpperCase();
        return sameLine && sameStop;
      }) ?? candidates[0];

    if (!match) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'BODS did not return a matching service.',
      };
    }

    const status = normalizeBusStatus(match.status ?? null);
    return {
      liveState: match.expectedDepartureTime ? 'live' : 'partial',
      liveStatus: status.liveStatus,
      statusLabel: status.statusLabel,
      departureTime: match.expectedDepartureTime ?? match.aimedDepartureTime ?? item.departureTime,
      operatorName: match.operatorName ?? item.operatorName,
      destinationName: match.destinationName ?? item.destinationName,
      stopName: match.stopName ?? item.stopName,
      lineName: match.lineName ?? match.routeName ?? item.lineName,
      rawStatus: match.status ?? status.liveStatus,
      liveNotice: match.expectedDepartureTime
        ? 'BODS refreshed a live stop-level departure estimate.'
        : 'BODS returned service metadata without a live estimate.',
      lastUpdatedAt: new Date().toISOString(),
      sourceConfidence: match.expectedDepartureTime ? 'medium' : 'low',
    };
  }
}
