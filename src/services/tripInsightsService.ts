import type { TravelSegment } from '@/types/models';
import { compareIsoDates, formatDateTime, parseIsoDate } from '@/utils/date';
import { isAirTransportType } from '@/utils/transport';
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
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m?: number[];
  };
};

type RestCountriesEntry = {
  name?: {
    common?: string;
    official?: string;
  };
  currencies?: Record<string, { name?: string; symbol?: string }>;
  languages?: Record<string, string>;
  cca2?: string;
};

type EmergencyNumberApiResponse = {
  data?: {
    ambulance?: { all?: string[] | null };
    fire?: { all?: string[] | null };
    police?: { all?: string[] | null };
    dispatch?: { all?: string[] | null };
    member_112?: boolean;
    nodata?: boolean;
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

export type DestinationQuickFacts = {
  resolvedLabel: string;
  countryLabel: string;
  languageLabel: string | null;
  currencyLabel: string | null;
  plugLabel: string | null;
  emergencyLabel: string | null;
};

export type DestinationWeatherHour = {
  time: string;
  timeLabel: string;
  weatherCode: number | null;
  conditionLabel: string;
  temperatureC: number | null;
};

export type DestinationWeatherDetail = {
  resolvedLabel: string;
  timezone: string;
  date: string;
  dateLabel: string;
  weatherCode: number | null;
  conditionLabel: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  sunriseLabel: string | null;
  sunsetLabel: string | null;
  hours: DestinationWeatherHour[];
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
const REST_COUNTRIES_NAME_URL = 'https://restcountries.com/v3.1/name';
const EMERGENCY_NUMBER_URL = 'https://emergencynumberapi.com/api/country';
const POWER_PLUGS_URL = 'https://www.power-plugs-sockets.com';
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 30;
const QUICK_FACTS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const geocodeCache = new Map<string, { expiresAt: number; value: ResolvedDestinationContext | null }>();
const weatherCache = new Map<string, { expiresAt: number; value: DestinationWeatherForecast | null }>();
const quickFactsCache = new Map<string, { expiresAt: number; value: DestinationQuickFacts | null }>();
const weatherDetailCache = new Map<string, { expiresAt: number; value: DestinationWeatherDetail | null }>();

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

function formatFullDayLabel(dateValue: string) {
  const parsed = parseIsoDate(`${dateValue}T12:00:00`);
  if (!parsed) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parsed);
}

function formatHourlyLabel(dateValue: string, timeZone: string) {
  const parsed = parseIsoDate(dateValue);
  if (!parsed) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

function formatSunEventLabel(dateValue: string | null | undefined, timeZone: string) {
  if (!dateValue) {
    return null;
  }

  const parsed = parseIsoDate(dateValue);
  if (!parsed) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-');
}

function slugifyCountryLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listFirstNonEmpty(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null;
}

function formatLanguageLabel(languages: RestCountriesEntry['languages']) {
  const values = Object.values(languages ?? {}).filter(Boolean);
  if (!values.length) {
    return null;
  }
  if (values.length <= 2) {
    return values.join(', ');
  }
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

function formatCurrencyLabel(currencies: RestCountriesEntry['currencies']) {
  const entries = Object.entries(currencies ?? {});
  if (!entries.length) {
    return null;
  }

  return entries
    .map(([code, details]) => {
      const name = details?.name?.trim();
      const symbol = details?.symbol?.trim();
      if (name && symbol) {
        return `${code} ${symbol}`;
      }
      if (name) {
        return `${name} (${code})`;
      }
      return code;
    })
    .join(', ');
}

function formatEmergencyLabel(payload: EmergencyNumberApiResponse) {
  const data = payload.data;
  if (!data || data.nodata) {
    return null;
  }

  if (data.member_112) {
    return '112';
  }

  const dispatch = listFirstNonEmpty(data.dispatch?.all ?? []);
  if (dispatch) {
    return dispatch;
  }

  const groupedNumbers = new Map<string, string[]>();
  const roleEntries = [
    { label: 'Police', number: listFirstNonEmpty(data.police?.all ?? []) },
    { label: 'Ambulance', number: listFirstNonEmpty(data.ambulance?.all ?? []) },
    { label: 'Fire', number: listFirstNonEmpty(data.fire?.all ?? []) },
  ].filter((entry) => entry.number) as Array<{ label: string; number: string }>;

  for (const entry of roleEntries) {
    const existing = groupedNumbers.get(entry.number) ?? [];
    groupedNumbers.set(entry.number, [...existing, entry.label]);
  }

  if (!groupedNumbers.size) {
    return null;
  }

  return Array.from(groupedNumbers.entries())
    .slice(0, 3)
    .map(([number, labels]) => `${labels.join('/')} ${number}`)
    .join(' • ');
}

function parsePlugLabelFromHtml(html: string) {
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (!metaMatch?.[1]) {
    return null;
  }

  const description = decodeHtmlEntities(metaMatch[1]);
  const plugMatch = description.match(/type\s+([A-Z](?:,\s*[A-Z])*(?:\s+and\s+[A-Z])?)/i);
  if (!plugMatch?.[1]) {
    return null;
  }

  return `Type ${plugMatch[1].replace(/\s+and\s+/gi, ', ')}`;
}

async function fetchDestinationCountryProfile(country: string) {
  const urls = [
    `${REST_COUNTRIES_NAME_URL}/${encodeURIComponent(country)}?fullText=true&fields=name,currencies,languages,cca2`,
    `${REST_COUNTRIES_NAME_URL}/${encodeURIComponent(country)}?fields=name,currencies,languages,cca2`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchJson<RestCountriesEntry[]>(url);
      const match = payload.find((entry) => entry.cca2) ?? payload[0];
      if (match) {
        return match;
      }
    } catch (error) {
      if (__DEV__) {
        console.error('fetchDestinationCountryProfile failed', country, error);
      }
    }
  }

  return null;
}

async function fetchDestinationPlugLabel(country: string) {
  const slug = slugifyCountryLabel(country);
  if (!slug) {
    return null;
  }

  try {
    const response = await fetch(`${POWER_PLUGS_URL}/${slug}/`);
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return parsePlugLabelFromHtml(html);
  } catch (error) {
    if (__DEV__) {
      console.error('fetchDestinationPlugLabel failed', country, error);
    }
    return null;
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

export async function getDestinationWeatherDetail(destination: string, date: string): Promise<DestinationWeatherDetail | null> {
  const context = await resolveDestinationContext(destination);
  if (!context || !parseIsoDate(`${date}T12:00:00`)) {
    return null;
  }

  const cacheKey = `${context.label.toLowerCase()}:${date}:detail`;
  const cached = weatherDetailCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const url = new URL(FORECAST_URL);
    url.searchParams.set('latitude', String(context.latitude));
    url.searchParams.set('longitude', String(context.longitude));
    url.searchParams.set('timezone', context.timezone);
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset');
    url.searchParams.set('hourly', 'weather_code,temperature_2m');

    const payload = await fetchJson<OpenMeteoForecastResponse>(url.toString());
    const dailyCodes = payload.daily?.weather_code ?? [];
    const dailyMaxTemps = payload.daily?.temperature_2m_max ?? [];
    const dailyMinTemps = payload.daily?.temperature_2m_min ?? [];
    const sunrises = payload.daily?.sunrise ?? [];
    const sunsets = payload.daily?.sunset ?? [];
    const hourlyTimes = payload.hourly?.time ?? [];
    const hourlyCodes = payload.hourly?.weather_code ?? [];
    const hourlyTemps = payload.hourly?.temperature_2m ?? [];

    const hours = hourlyTimes.map((timeValue, index) => ({
      time: timeValue,
      timeLabel: formatHourlyLabel(timeValue, context.timezone),
      weatherCode: typeof hourlyCodes[index] === 'number' ? hourlyCodes[index] : null,
      conditionLabel: describeWeatherCode(hourlyCodes[index]),
      temperatureC: typeof hourlyTemps[index] === 'number' ? hourlyTemps[index] : null,
    }));

    const detail =
      hours.length > 0
        ? {
            resolvedLabel: context.resolvedLabel,
            timezone: context.timezone,
            date,
            dateLabel: formatFullDayLabel(date),
            weatherCode: typeof dailyCodes[0] === 'number' ? dailyCodes[0] : null,
            conditionLabel: describeWeatherCode(dailyCodes[0]),
            temperatureMinC: typeof dailyMinTemps[0] === 'number' ? dailyMinTemps[0] : null,
            temperatureMaxC: typeof dailyMaxTemps[0] === 'number' ? dailyMaxTemps[0] : null,
            sunriseLabel: formatSunEventLabel(sunrises[0], context.timezone),
            sunsetLabel: formatSunEventLabel(sunsets[0], context.timezone),
            hours,
          }
        : null;

    weatherDetailCache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      value: detail,
    });

    return detail;
  } catch (error) {
    if (__DEV__) {
      console.error('getDestinationWeatherDetail failed', context.label, date, error);
    }
    weatherDetailCache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      value: null,
    });
    return null;
  }
}

export async function getDestinationQuickFacts(destination: string): Promise<DestinationQuickFacts | null> {
  const context = await resolveDestinationContext(destination);
  if (!context?.country) {
    return null;
  }

  const cacheKey = context.country.toLowerCase();
  const cached = quickFactsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const countryProfile = await fetchDestinationCountryProfile(context.country);
    const countryCode = countryProfile?.cca2?.trim().toUpperCase() ?? null;

    const [plugLabel, emergencyPayload] = await Promise.all([
      fetchDestinationPlugLabel(context.country),
      countryCode ? fetchJson<EmergencyNumberApiResponse>(`${EMERGENCY_NUMBER_URL}/${encodeURIComponent(countryCode)}`).catch(() => null) : Promise.resolve(null),
    ]);

    const quickFacts: DestinationQuickFacts = {
      resolvedLabel: context.resolvedLabel,
      countryLabel: countryProfile?.name?.common?.trim() || context.country,
      languageLabel: formatLanguageLabel(countryProfile?.languages),
      currencyLabel: formatCurrencyLabel(countryProfile?.currencies),
      plugLabel,
      emergencyLabel: emergencyPayload ? formatEmergencyLabel(emergencyPayload) : null,
    };

    quickFactsCache.set(cacheKey, {
      expiresAt: Date.now() + QUICK_FACTS_CACHE_TTL_MS,
      value: quickFacts,
    });

    return quickFacts;
  } catch (error) {
    if (__DEV__) {
      console.error('getDestinationQuickFacts failed', context.label, error);
    }
    quickFactsCache.set(cacheKey, {
      expiresAt: Date.now() + QUICK_FACTS_CACHE_TTL_MS,
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
    .filter((segment) => isAirTransportType(segment.transportType) && segment.travelDirection === 'outbound')
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
