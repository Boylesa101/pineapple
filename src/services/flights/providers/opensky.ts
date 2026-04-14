import type { FlightDataLookup, FlightDataProvider, FlightLiveStatus, LiveFlightSnapshot } from '../types';

// OpenSky can provide prototype live air-traffic state, but it does not provide
// passenger boarding data. Keep passenger/seat/barcode data in Pineapple's own
// local import model, and review OpenSky licensing before operational use.

const OPENSKY_BASE_URL = 'https://opensky-network.org/api';
const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const CLIENT_ID = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_ID?.trim() ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_SECRET?.trim() ?? '';

type OpenSkyStateRow = [
  string | null,
  string | null,
  string | null,
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
  number | null,
  string | null,
  boolean | null,
  number
];

type OpenSkyStatesResponse = {
  time: number;
  states: OpenSkyStateRow[] | null;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function normalizeCallsign(value: string | null | undefined) {
  return value?.replace(/\s+/g, '').trim().toUpperCase() ?? '';
}

function toCandidateCallsigns(lookup: FlightDataLookup) {
  const candidates = new Set<string>();

  if (lookup.callsign) {
    candidates.add(normalizeCallsign(lookup.callsign));
  }

  const carrier = lookup.carrierCode?.trim().toUpperCase() ?? '';
  const suffix = lookup.flightNumber?.replace(/\s+/g, '').trim().toUpperCase() ?? '';
  if (carrier && suffix) {
    candidates.add(`${carrier}${suffix.replace(new RegExp(`^${carrier}`), '')}`);
  }

  return [...candidates].filter(Boolean);
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`OpenSky token request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error('OpenSky token response did not include an access token.');
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max((payload.expires_in ?? 300) - 30, 30) * 1000,
  };

  return payload.access_token;
}

function deriveStatusFromState(onGround: boolean | null, scheduledDeparture: string | null | undefined): FlightLiveStatus {
  const now = Date.now();
  const departureMs = scheduledDeparture ? Date.parse(scheduledDeparture) : Number.NaN;

  if (onGround === false) {
    return 'on_time' as const;
  }

  if (Number.isFinite(departureMs)) {
    const minutesUntilDeparture = Math.round((departureMs - now) / 60000);
    if (minutesUntilDeparture <= 45 && minutesUntilDeparture >= -15) {
      return 'boarding' as const;
    }
    if (minutesUntilDeparture < -15) {
      return 'delayed' as const;
    }
  }

  return 'unknown' as const;
}

export class OpenSkyProvider implements FlightDataProvider {
  readonly id = 'opensky' as const;

  async lookupFlight(lookup: FlightDataLookup): Promise<LiveFlightSnapshot | null> {
    const candidates = toCandidateCallsigns(lookup);
    if (!candidates.length) {
      return null;
    }

    try {
      const accessToken = await getAccessToken();
      const headers: HeadersInit = { Accept: 'application/json' };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await fetch(`${OPENSKY_BASE_URL}/states/all`, {
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as OpenSkyStatesResponse;
      const rows = payload.states ?? [];
      const match = rows.find((row) => candidates.includes(normalizeCallsign(row[1])));
      if (!match) {
        return null;
      }

      const [, rawCallsign, , , , , , onGround, , , , , , lastSeen] = match;

      return {
        liveStatus: deriveStatusFromState(onGround, lookup.departureDatetime),
        statusSource: 'opensky_live' as const,
        providerSource: 'opensky' as const,
        callsign: normalizeCallsign(rawCallsign),
        estimatedDeparture: null,
        estimatedArrival: null,
        metadata: {
          lastSeen: lastSeen ?? null,
          onGround: onGround ?? null,
        },
      };
    } catch {
      return null;
    }
  }
}
