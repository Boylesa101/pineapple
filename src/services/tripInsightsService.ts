import type { TravelSegment } from '@/types/models';
import { compareIsoDates, formatDateTime, parseIsoDate } from '@/utils/date';
import { normalizeDestinationLabel } from '@/utils/trips';

type OpenMeteoGeocodeResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  feature_code?: string;
};

type OpenMeteoGeocodeResponse = {
  results?: OpenMeteoGeocodeResult[];
};

type OpenMeteoForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export type ResolvedDestinationContext = {
  label: string;
  resolvedLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string | null;
};

export type DestinationLocalTimeInfo = {
  localTimeLabel: string;
  offsetLabel: string;
  relativeLabel: string;
  timezone: string;
  resolvedLabel: string;
};

export type DestinationWeatherDay = {
  date: string;
  dayLabel: string;
  weatherCode: number | null;
  conditionLabel: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
};

export type DestinationWeatherForecast = {
  resolvedLabel: string;
  timezone: string;
  days: DestinationWeatherDay[];
};

export type AirportSetOffInfo =
  | {
      status: 'available';
      timeLabel: string;
      helperLabel: string;
      departureLabel: string;
    }
  | {
      status: 'unavailable';
      timeLabel: string;
      helperLabel: string;
    };

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 30;
const geocodeCache = new Map<string, { expiresAt: number; value: ResolvedDestinationContext | null }>();
const weatherCache = new Map<string, { expiresAt: number; value: DestinationWeatherForecast | null }>();

function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
}

function normalizeQuery(value: string) {
  return normalizeDestinationLabel(value).toLowerCase();
}

function splitDestinationSegments(destination: string) {
  return normalizeDestinationLabel(destination)
    .split(',')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function buildGeocodeQueries(destination: string) {
  const normalized = normalizeDestinationLabel(destination);
  const segments = normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  return Array.from(new Set([normalized, segments[0] ?? normalized, segments.join(' ')]));
}

function scoreGeocodeResult(result: OpenMeteoGeocodeResult, destination: string) {
  const segments = splitDestinationSegments(destination);
  const primary = segments[0] ?? '';
  const final = segments.at(-1) ?? '';
  const candidateName = result.name?.trim().toLowerCase() ?? '';
  const candidateCountry = result.country?.trim().toLowerCase() ?? '';
  const candidateAdmin = result.admin1?.trim().toLowerCase() ?? '';
  const candidateLabel = [result.name, result.admin1, result.country].filter(Boolean).join(', ').toLowerCase();
  const destinationLabel = normalizeQuery(destination);

  let score = 0;
  if (candidateLabel === destinationLabel) score += 120;
  if (candidateName === primary) score += 80;
  if (final && (candidateCountry === final || candidateAdmin === final)) score += 60;
  if (candidateLabel.includes(destinationLabel)) score += 40;
  if (result.timezone) score += 20;
  if (result.feature_code === 'PPL' || result.feature_code === 'PPLC' || result.feature_code === 'ADM0') score += 10;
  return score;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Trip insights request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function chooseBestGeocodeResult(results: OpenMeteoGeocodeResult[], destination: string) {
  return [...results]
    .filter(
      (result) =>
        typeof result.latitude === 'number' &&
        Number.isFinite(result.latitude) &&
        typeof result.longitude === 'number' &&
        Number.isFinite(result.longitude) &&
        typeof result.timezone === 'string' &&
        result.timezone.length > 0
    )
    .sort((left, right) => scoreGeocodeResult(right, destination) - scoreGeocodeResult(left, destination))[0];
}

function buildResolvedDestination(result: OpenMeteoGeocodeResult, originalLabel: string): ResolvedDestinationContext | null {
  if (
    typeof result.latitude !== 'number' ||
    !Number.isFinite(result.latitude) ||
    typeof result.longitude !== 'number' ||
    !Number.isFinite(result.longitude) ||
    !result.timezone
  ) {
    return null;
  }

  return {
    label: normalizeDestinationLabel(originalLabel),
    resolvedLabel: [result.name, result.admin1, result.country].filter(Boolean).join(', ') || normalizeDestinationLabel(originalLabel),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    country: result.country ?? null,
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const second = Number(values.second);

  if (![year, month, day, hour, minute, second].every(Number.isFinite)) {
    return 0;
  }

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatOffsetLabel(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatRelativeDifference(offsetDeltaMinutes: number) {
  if (offsetDeltaMinutes === 0) {
    return 'Same time as you';
  }

  const direction = offsetDeltaMinutes > 0 ? 'ahead' : 'behind';
  const absoluteMinutes = Math.abs(offsetDeltaMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ${direction}`;
  }

  return `${hours}h ${minutes}m ${direction}`;
}

function formatClockTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatDayLabel(dateValue: string) {
  const parsed = parseIsoDate(`${dateValue}T12:00:00`);
  if (!parsed) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

function describeWeatherCode(weatherCode: number | null | undefined) {
  switch (weatherCode) {
    case 0:
      return 'Clear';
    case 1:
    case 2:
      return 'Partly cloudy';
    case 3:
      return 'Cloudy';
    case 45:
    case 48:
      return 'Fog';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 56:
    case 57:
      return 'Freezing drizzle';
    case 61:
    case 63:
    case 65:
      return 'Rain';
    case 66:
    case 67:
      return 'Freezing rain';
    case 71:
    case 73:
    case 75:
      return 'Snow';
    case 77:
      return 'Snow grains';
    case 80:
    case 81:
    case 82:
      return 'Rain showers';
    case 85:
    case 86:
      return 'Snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Storm with hail';
    default:
      return 'Weather unavailable';
  }
}

export async function resolveDestinationContext(destination: string) {
  const normalized = normalizeDestinationLabel(destination);
  if (!normalized) {
    return null;
  }

  const cacheKey = normalized.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let resolved: ResolvedDestinationContext | null = null;

  for (const query of buildGeocodeQueries(normalized)) {
    const url = new URL(GEOCODE_URL);
    url.searchParams.set('name', query);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    try {
      const payload = await fetchJson<OpenMeteoGeocodeResponse>(url.toString());
      const bestResult = chooseBestGeocodeResult(payload.results ?? [], normalized);
      resolved = bestResult ? buildResolvedDestination(bestResult, normalized) : null;
      if (resolved) {
        break;
      }
    } catch (error) {
      if (__DEV__) {
        console.error('resolveDestinationContext failed', normalized, error);
      }
    }
  }

  geocodeCache.set(cacheKey, {
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
    value: resolved,
  });

  return resolved;
}

export async function getDestinationLocalTimeInfo(destination: string, now = new Date()): Promise<DestinationLocalTimeInfo | null> {
  const context = await resolveDestinationContext(destination);
  if (!context) {
    return null;
  }

  try {
    const deviceTimeZone = getDeviceTimeZone();
    const destinationOffsetMinutes = getTimeZoneOffsetMinutes(now, context.timezone);
    const deviceOffsetMinutes = getTimeZoneOffsetMinutes(now, deviceTimeZone);
    const offsetDeltaMinutes = destinationOffsetMinutes - deviceOffsetMinutes;

    return {
      localTimeLabel: formatClockTime(now, context.timezone),
      offsetLabel: formatOffsetLabel(destinationOffsetMinutes),
      relativeLabel: formatRelativeDifference(offsetDeltaMinutes),
      timezone: context.timezone,
      resolvedLabel: context.resolvedLabel,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('getDestinationLocalTimeInfo failed', context.label, error);
    }
    return null;
  }
}

export async function getDestinationWeatherForecast(destination: string): Promise<DestinationWeatherForecast | null> {
  const context = await resolveDestinationContext(destination);
  if (!context) {
    return null;
  }

  const cacheKey = `${context.label.toLowerCase()}:${context.latitude}:${context.longitude}:${context.timezone}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const url = new URL(FORECAST_URL);
    url.searchParams.set('latitude', String(context.latitude));
    url.searchParams.set('longitude', String(context.longitude));
    url.searchParams.set('timezone', context.timezone);
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');

    const payload = await fetchJson<OpenMeteoForecastResponse>(url.toString());
    const dates = payload.daily?.time ?? [];
    const weatherCodes = payload.daily?.weather_code ?? [];
    const maxTemps = payload.daily?.temperature_2m_max ?? [];
    const minTemps = payload.daily?.temperature_2m_min ?? [];

    const days = dates.slice(0, 7).map((dateValue, index) => ({
      date: dateValue,
      dayLabel: formatDayLabel(dateValue),
      weatherCode: typeof weatherCodes[index] === 'number' ? weatherCodes[index] : null,
      conditionLabel: describeWeatherCode(weatherCodes[index]),
      temperatureMaxC: typeof maxTemps[index] === 'number' ? maxTemps[index] : null,
      temperatureMinC: typeof minTemps[index] === 'number' ? minTemps[index] : null,
    }));

    const forecast =
      days.length > 0
        ? {
            resolvedLabel: context.resolvedLabel,
            timezone: context.timezone,
            days,
          }
        : null;

    weatherCache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      value: forecast,
    });

    return forecast;
  } catch (error) {
    if (__DEV__) {
      console.error('getDestinationWeatherForecast failed', context.label, error);
    }
    weatherCache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      value: null,
    });
    return null;
  }
}

export function getAirportSetOffInfo(
  travelSegments: TravelSegment[],
  airportTravelDurationMinutes: number | null | undefined
): AirportSetOffInfo {
  const outboundFlight = [...travelSegments]
    .filter((segment) => segment.transportType === 'flight' && segment.travelDirection === 'outbound')
    .sort((left, right) => compareIsoDates(left.departureTime, right.departureTime))[0];

  if (!outboundFlight) {
    return {
      status: 'unavailable',
      timeLabel: 'Set-off time unavailable',
      helperLabel: 'Add an outbound flight to calculate when to leave.',
    };
  }

  if (airportTravelDurationMinutes === null || airportTravelDurationMinutes === undefined || airportTravelDurationMinutes < 0) {
    return {
      status: 'unavailable',
      timeLabel: 'Set-off time unavailable',
      helperLabel: 'Add airport travel time to calculate when to leave.',
    };
  }

  const departureTime = parseIsoDate(outboundFlight.departureTime);
  if (!departureTime) {
    return {
      status: 'unavailable',
      timeLabel: 'Set-off time unavailable',
      helperLabel: 'The outbound departure time is invalid.',
    };
  }

  const setOffTime = new Date(departureTime.getTime() - (120 + airportTravelDurationMinutes) * 60_000);

  return {
    status: 'available',
    timeLabel: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(setOffTime),
    helperLabel: `Leave ${airportTravelDurationMinutes} min before a 2h pre-flight arrival window.`,
    departureLabel: `Departure ${formatDateTime(outboundFlight.departureTime)}`,
  };
}
