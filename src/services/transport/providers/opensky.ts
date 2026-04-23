import type { TransportDataProvider, TransportItem, TransportLiveStatus, TransportProviderUpdate } from '../types';

const OPENSKY_CLIENT_ID = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_ID?.trim() ?? '';
const OPENSKY_CLIENT_SECRET = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_SECRET?.trim() ?? '';
const OPENSKY_BASE_URL = (process.env.EXPO_PUBLIC_OPENSKY_BASE_URL ?? 'https://opensky-network.org/api').replace(/\/+$/, '');
const OPENSKY_AUTH_URL =
  (process.env.EXPO_PUBLIC_OPENSKY_AUTH_URL ??
    'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token').trim();

type OpenSkyStateRow = [
  string | null,
  string | null,
  string | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean | null,
  number | null,
  number | null,
  number | null,
  number[] | null,
  number | null,
  string | null,
  boolean | null,
  number | null,
  number | null
];

type OpenSkyStatesResponse = {
  time?: number;
  states?: OpenSkyStateRow[] | null;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function normalizeCallsign(value: string | null | undefined) {
  return value?.replace(/\s+/g, '').trim().toUpperCase() ?? '';
}

function candidateCallsigns(item: TransportItem) {
  const candidates = new Set<string>();
  const savedFlightNumber = normalizeCallsign(item.flightNumber || item.serviceNumber);
  if (savedFlightNumber) {
    candidates.add(savedFlightNumber);
  }

  const carrierCode = item.travelSegment?.providerCode?.trim().toUpperCase() ?? '';
  const numericSuffix = savedFlightNumber.replace(/^[A-Z]{2,3}/, '');
  if (carrierCode && numericSuffix) {
    candidates.add(`${carrierCode}${numericSuffix}`);
  }

  return [...candidates].filter(Boolean);
}

async function getAccessToken() {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) {
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: OPENSKY_CLIENT_ID,
    client_secret: OPENSKY_CLIENT_SECRET,
  });

  const response = await fetch(OPENSKY_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`OpenSky token request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error('OpenSky token response did not include an access token.');
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max((payload.expires_in ?? 1800) - 30, 30) * 1000,
  };

  return payload.access_token;
}

function deriveStatus(onGround: boolean | null, departureTime: string | null, lastContact: number | null): { liveStatus: TransportLiveStatus; statusLabel: string } {
  const now = Date.now();
  const departureMs = departureTime ? Date.parse(departureTime) : Number.NaN;
  const freshnessMs = lastContact ? now - lastContact * 1000 : Number.POSITIVE_INFINITY;

  if (onGround === false) {
    return { liveStatus: 'on_time', statusLabel: 'In flight' };
  }
  if (Number.isFinite(departureMs)) {
    const minutesUntilDeparture = Math.round((departureMs - now) / 60000);
    if (minutesUntilDeparture <= 45 && minutesUntilDeparture >= -15) {
      return { liveStatus: 'boarding', statusLabel: 'Boarding soon' };
    }
    if (minutesUntilDeparture < -15 && freshnessMs < 3 * 60 * 60 * 1000) {
      return { liveStatus: 'delayed', statusLabel: 'Delayed' };
    }
  }
  return { liveStatus: 'unknown', statusLabel: 'Status unavailable' };
}

export class OpenSkyTransportProvider implements TransportDataProvider {
  readonly id = 'opensky' as const;
  readonly capabilities = {
    supportsRealtime: true,
    supportsSchedules: false,
    supportsFutureTrips: false,
    supportsCommercialUse: false,
    requiresCredentials: true,
  };

  isConfigured() {
    return Boolean(OPENSKY_CLIENT_ID && OPENSKY_CLIENT_SECRET);
  }

  async refresh(item: TransportItem): Promise<TransportProviderUpdate | null> {
    if (item.type !== 'airline') {
      return null;
    }

    if (!this.isConfigured()) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'OpenSky credentials are missing, so Pineapple is using the saved trip details only.',
      };
    }

    const callsigns = candidateCallsigns(item);
    if (!callsigns.length) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'No flight number is saved for this segment.',
      };
    }

    let token: string | null;
    try {
      token = await getAccessToken();
    } catch (error) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: error instanceof Error ? error.message : 'OpenSky authentication failed.',
      };
    }

    let response: Response;
    try {
      response = await fetch(`${OPENSKY_BASE_URL}/states/all`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'OpenSky could not be reached from this device.',
      };
    }

    if (response.status === 401) {
      cachedToken = null;
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'OpenSky rejected the current access token. Refresh the client credentials and try again.',
      };
    }

    if (response.status === 429) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'OpenSky rate limited the request.',
      };
    }

    if (!response.ok) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `OpenSky returned ${response.status}.`,
      };
    }

    const payload = (await response.json()) as OpenSkyStatesResponse;
    const match =
      payload.states?.find((row) => callsigns.includes(normalizeCallsign(row[1]))) ??
      null;

    if (!match) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `No OpenSky live state matched ${callsigns[0]}.`,
      };
    }

    const [, rawCallsign, , , lastContact, , , , onGround] = match;
    const status = deriveStatus(onGround ?? null, item.departureTime, lastContact ?? null);
    const lastUpdatedAt = lastContact ? new Date(lastContact * 1000).toISOString() : new Date().toISOString();

    return {
      liveState: 'live',
      liveStatus: status.liveStatus,
      statusLabel: status.statusLabel,
      serviceIdentifier: normalizeCallsign(rawCallsign) || item.flightNumber || item.serviceNumber,
      rawStatus: onGround === false ? 'in_flight' : onGround === true ? 'on_ground' : 'unknown',
      liveNotice:
        status.liveStatus === 'boarding'
          ? 'OpenSky matched a current ground state close to departure.'
          : status.liveStatus === 'on_time'
            ? 'OpenSky matched a live airborne state for this flight.'
            : 'OpenSky refreshed the current live state for this flight.',
      lastUpdatedAt,
      sourceConfidence: onGround === false ? 'high' : 'medium',
    };
  }
}
