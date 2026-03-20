const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';
const TRIPADVISOR_API_KEY = process.env.EXPO_PUBLIC_TRIPADVISOR_API_KEY ?? null;

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

type TripadvisorSearchResult = {
  location_id?: string | number;
  name?: string;
  web_url?: string;
  distance_string?: string;
  ranking?: string;
  rating?: string | number;
  address_obj?: {
    address_string?: string;
  };
  address_string?: string;
};

const vibeSearchMap: Record<VibeCategory, { category: string; searchSuffix: string }> = {
  eat: { category: 'restaurants', searchSuffix: 'restaurants' },
  visit: { category: 'attractions', searchSuffix: 'landmarks' },
  do: { category: 'attractions', searchSuffix: 'things to do' },
};

function assertApiKey() {
  if (!TRIPADVISOR_API_KEY) {
    throw new Error('TRIPADVISOR_API_KEY_MISSING');
  }
}

function buildAreaQuery(destination: string, city?: string | null, country?: string | null) {
  return [city, destination, country].filter(Boolean).join(', ');
}

async function fetchTripadvisorCategory(area: string, vibeCategory: VibeCategory): Promise<VibeItem[]> {
  assertApiKey();
  const config = vibeSearchMap[vibeCategory];
  const params = new URLSearchParams({
    key: TRIPADVISOR_API_KEY as string,
    language: 'en',
    searchQuery: `${area} ${config.searchSuffix}`,
    category: config.category,
  });

  const response = await fetch(`${TRIPADVISOR_BASE_URL}/location/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`TRIPADVISOR_REQUEST_FAILED:${response.status}`);
  }

  const payload = (await response.json()) as { data?: TripadvisorSearchResult[] };
  const items = Array.isArray(payload.data) ? payload.data : [];

  return items
    .filter((item) => item.location_id && item.name)
    .slice(0, 5)
    .map((item) => ({
      id: String(item.location_id),
      name: item.name as string,
      category: vibeCategory,
      address: item.address_obj?.address_string || item.address_string || item.distance_string || 'Address not listed',
      rating: item.rating ? String(item.rating) : null,
      ranking: item.ranking ?? null,
      webUrl: item.web_url ?? null,
    }));
}

export async function fetchTripVibes(input: {
  destination: string;
  hotelCity?: string | null;
  hotelCountry?: string | null;
}) {
  const area = buildAreaQuery(input.destination, input.hotelCity, input.hotelCountry);

  const [eat, visit, doItems] = await Promise.all([
    fetchTripadvisorCategory(area, 'eat'),
    fetchTripadvisorCategory(area, 'visit'),
    fetchTripadvisorCategory(area, 'do'),
  ]);

  return {
    area,
    eat,
    visit,
    do: doItems,
    source: 'tripadvisor' as const,
  };
}

export function hasTripadvisorKey() {
  return Boolean(TRIPADVISOR_API_KEY);
}
