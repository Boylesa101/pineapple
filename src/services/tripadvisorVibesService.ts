const DEFAULT_VIBES_BASE_URL = 'https://pinapple-dev.pages.dev';
const VIBES_BASE_URL = (process.env.EXPO_PUBLIC_VIBES_API_BASE_URL ?? DEFAULT_VIBES_BASE_URL).replace(/\/+$/, '');

export type VibeCategory = 'eat' | 'visit' | 'do';

export type VibeItem = {
  id: string;
  name: string;
  category: VibeCategory;
  address: string;
  rating: string | null;
  ranking: string | null;
  webUrl: string | null;
};

type VibesResponse = {
  area?: string;
  eat?: VibeItem[];
  visit?: VibeItem[];
  do?: VibeItem[];
  source?: string;
  error?: string;
};

export async function fetchTripVibes(input: {
  destination: string;
  hotelCity?: string | null;
  hotelCountry?: string | null;
}) {
  const params = new URLSearchParams({
    destination: input.destination,
  });

  if (input.hotelCity) {
    params.set('hotelCity', input.hotelCity);
  }

  if (input.hotelCountry) {
    params.set('hotelCountry', input.hotelCountry);
  }

  const response = await fetch(`${VIBES_BASE_URL}/api/vibes?${params.toString()}`);
  const payload = (await response.json().catch(() => null)) as VibesResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error || `TRIPADVISOR_PROXY_REQUEST_FAILED:${response.status}`);
  }

  return {
    area: payload?.area ?? input.destination,
    eat: Array.isArray(payload?.eat) ? payload.eat : [],
    visit: Array.isArray(payload?.visit) ? payload.visit : [],
    do: Array.isArray(payload?.do) ? payload.do : [],
    source: payload?.source === 'tripadvisor' ? ('tripadvisor' as const) : ('tripadvisor' as const),
  };
}

export function getVibesBaseUrl() {
  return VIBES_BASE_URL;
}
