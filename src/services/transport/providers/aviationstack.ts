import type { TransportDataProvider, TransportItem, TransportLiveStatus, TransportProviderUpdate } from '../types';

const AVIATIONSTACK_API_KEY = process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY?.trim() ?? '';
const AVIATIONSTACK_PLAN = (process.env.EXPO_PUBLIC_AVIATIONSTACK_PLAN ?? 'free').trim().toLowerCase();
const AVIATIONSTACK_BASE_URL = (process.env.EXPO_PUBLIC_AVIATIONSTACK_BASE_URL ?? 'https://api.aviationstack.com/v1').replace(/\/+$/, '');

type AviationstackFlight = {
  flight_status?: string | null;
  departure?: {
    airport?: string | null;
    timezone?: string | null;
    iata?: string | null;
    terminal?: string | null;
    gate?: string | null;
    delay?: number | null;
    scheduled?: string | null;
    estimated?: string | null;
  } | null;
  arrival?: {
    airport?: string | null;
    timezone?: string | null;
    iata?: string | null;
    terminal?: string | null;
    gate?: string | null;
    delay?: number | null;
    scheduled?: string | null;
    estimated?: string | null;
  } | null;
  airline?: {
    name?: string | null;
    iata?: string | null;
  } | null;
  flight?: {
    iata?: string | null;
    number?: string | null;
  } | null;
  live?: {
    updated?: string | null;
  } | null;
};

type AviationstackResponse = {
  data?: AviationstackFlight[];
  error?: {
    code?: string | number;
    message?: string;
  };
};

function trimDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return value.slice(0, 10);
}

function normalizeStatus(flight: AviationstackFlight): { liveStatus: TransportLiveStatus; statusLabel: string } {
  const raw = flight.flight_status?.trim().toLowerCase() ?? '';
  const departureDelay = flight.departure?.delay ?? 0;
  const arrivalDelay = flight.arrival?.delay ?? 0;
  const maximumDelay = Math.max(departureDelay, arrivalDelay);

  if (raw.includes('cancel')) {
    return { liveStatus: 'cancelled', statusLabel: 'Cancelled' };
  }
  if (raw.includes('boarding')) {
    return { liveStatus: 'boarding', statusLabel: 'Boarding' };
  }
  if (raw.includes('gate')) {
    return { liveStatus: 'gate_change', statusLabel: 'Gate change' };
  }
  if (maximumDelay >= 15 || raw.includes('delay')) {
    return { liveStatus: 'delayed', statusLabel: 'Delayed' };
  }
  if (raw.includes('scheduled') || raw.includes('active') || raw.includes('landed')) {
    return { liveStatus: 'on_time', statusLabel: 'On time' };
  }
  return { liveStatus: 'unknown', statusLabel: 'Status unavailable' };
}

function requestedFlightIdentifier(item: TransportItem) {
  return `${item.originCode || item.originName}-${item.destinationCode || item.destinationName}`.replace(/\s+/g, ' ').trim();
}

export class AviationstackProvider implements TransportDataProvider {
  readonly id = 'aviationstack' as const;
  readonly capabilities = {
    supportsRealtime: true,
    supportsSchedules: true,
    supportsFutureTrips: AVIATIONSTACK_PLAN !== 'free',
    supportsCommercialUse: AVIATIONSTACK_PLAN !== 'free',
    requiresCredentials: true,
  };

  isConfigured() {
    return Boolean(AVIATIONSTACK_API_KEY);
  }

  async refresh(item: TransportItem): Promise<TransportProviderUpdate | null> {
    if (item.type !== 'airline') {
      return null;
    }

    if (!AVIATIONSTACK_API_KEY) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'AVIATIONSTACK_API_KEY is missing, so Pineapple is using the saved trip details only.',
      };
    }

    const flightNumber = (item.flightNumber || item.serviceNumber).trim();
    if (!flightNumber) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'No flight number is saved for this segment.',
      };
    }

    const flightDate = trimDate(item.departureTime);
    if (flightDate && AVIATIONSTACK_PLAN === 'free') {
      const departureMs = Date.parse(item.departureTime ?? '');
      if (Number.isFinite(departureMs) && departureMs > Date.now() + 12 * 60 * 60 * 1000) {
        return {
          liveState: 'manual_only',
          liveStatus: item.liveStatus,
          providerUnavailableReason: 'The configured Aviationstack plan may not support future-flight lookups for this departure yet.',
        };
      }
    }

    const url = new URL(`${AVIATIONSTACK_BASE_URL}/flights`);
    url.searchParams.set('access_key', AVIATIONSTACK_API_KEY);
    url.searchParams.set('flight_iata', flightNumber);
    if (flightDate) {
      url.searchParams.set('flight_date', flightDate);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
    } catch {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'Aviationstack could not be reached from this device.',
      };
    }

    if (response.status === 429) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'Aviationstack rate limited the request.',
      };
    }

    if (!response.ok) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `Aviationstack returned ${response.status}.`,
      };
    }

    const payload = (await response.json()) as AviationstackResponse;
    if (payload.error?.message) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: payload.error.message,
      };
    }

    const exactFlightIata = flightNumber.replace(/\s+/g, '').toUpperCase();
    const match =
      payload.data?.find((entry) => {
        const entryFlight = entry.flight?.iata?.replace(/\s+/g, '').toUpperCase() ?? '';
        const sameRoute =
          (!item.originCode || entry.departure?.iata?.trim().toUpperCase() === item.originCode.trim().toUpperCase()) &&
          (!item.destinationCode || entry.arrival?.iata?.trim().toUpperCase() === item.destinationCode.trim().toUpperCase());
        return entryFlight === exactFlightIata && sameRoute;
      }) ?? payload.data?.[0];

    if (!match) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `No Aviationstack result matched ${requestedFlightIdentifier(item)}.`,
      };
    }

    const status = normalizeStatus(match);
    const lastUpdatedAt = match.live?.updated ?? new Date().toISOString();
    return {
      liveState: match.departure?.estimated || match.arrival?.estimated ? 'live' : 'partial',
      liveStatus: status.liveStatus,
      statusLabel: status.statusLabel,
      operatorName: match.airline?.name?.trim() || item.operatorName,
      departureTime: match.departure?.estimated ?? match.departure?.scheduled ?? item.departureTime,
      arrivalTime: match.arrival?.estimated ?? match.arrival?.scheduled ?? item.arrivalTime,
      terminal: match.departure?.terminal ?? item.terminal,
      gate: match.departure?.gate ?? item.gate,
      departureCode: match.departure?.iata ?? item.originCode,
      destinationCode: match.arrival?.iata ?? item.destinationCode,
      departureName: match.departure?.airport ?? item.originName,
      destinationName: match.arrival?.airport ?? item.destinationName,
      rawStatus: match.flight_status ?? status.liveStatus,
      liveNotice:
        status.liveStatus === 'delayed'
          ? 'Aviationstack reported a live delay for this service.'
          : 'Aviationstack refreshed the live flight status.',
      lastUpdatedAt,
      sourceConfidence: match.departure?.estimated || match.arrival?.estimated ? 'high' : 'medium',
    };
  }
}
