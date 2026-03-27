import type { VibeCategory } from '@/types/models';

const DEFAULT_VIBES_BASE_URL = 'https://pinapple-dev.pages.dev';
const VIBES_BASE_URL = (process.env.EXPO_PUBLIC_VIBES_API_BASE_URL ?? DEFAULT_VIBES_BASE_URL).replace(/\/+$/, '');
const CATEGORY_ORDER: VibeCategory[] = ['eat', 'drink', 'visit', 'do'];

export type VibeLinkType = 'website' | 'tripadvisor';

export type VibeItem = {
  id: string;
  name: string;
  category: VibeCategory;
  displayCategory: string;
  address: string;
  rating: string | null;
  ranking: string | null;
  tripadvisorUrl: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
};

export type TripVibesResult = {
  area: string;
  source: 'tripadvisor';
  fetchedAt: string;
  eat: VibeItem[];
  drink: VibeItem[];
  visit: VibeItem[];
  do: VibeItem[];
  items: VibeItem[];
};

export type { VibeCategory } from '@/types/models';

type VibesResponse = {
  area?: string;
  fetchedAt?: string;
  eat?: VibeItem[];
  drink?: VibeItem[];
  visit?: VibeItem[];
  do?: VibeItem[];
  source?: string;
  error?: string;
};

export type FetchTripVibesInput = {
  destination: string;
  hotelCity?: string | null;
  hotelCountry?: string | null;
};

function normalizeItem(input: Partial<VibeItem>, category: VibeCategory): VibeItem | null {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    category,
    displayCategory:
      typeof input.displayCategory === 'string' && input.displayCategory.trim()
        ? input.displayCategory.trim()
        : categoryLabel(category),
    address:
      typeof input.address === 'string' && input.address.trim()
        ? input.address.trim()
        : 'Address not listed',
    rating: typeof input.rating === 'string' && input.rating.trim() ? input.rating.trim() : null,
    ranking: typeof input.ranking === 'string' && input.ranking.trim() ? input.ranking.trim() : null,
    tripadvisorUrl:
      typeof input.tripadvisorUrl === 'string' && input.tripadvisorUrl.trim() ? input.tripadvisorUrl.trim() : null,
    websiteUrl: typeof input.websiteUrl === 'string' && input.websiteUrl.trim() ? input.websiteUrl.trim() : null,
    imageUrl: typeof input.imageUrl === 'string' && input.imageUrl.trim() ? input.imageUrl.trim() : null,
  };
}

function normalizeCategoryItems(payload: VibesResponse | null, category: VibeCategory) {
  const items = payload?.[category];
  if (!Array.isArray(items)) {
    return [] as VibeItem[];
  }

  return items
    .map((item) => normalizeItem(item, category))
    .filter((item): item is VibeItem => Boolean(item));
}

export function categoryLabel(category: VibeCategory) {
  switch (category) {
    case 'eat':
      return 'Restaurant';
    case 'drink':
      return 'Bar';
    case 'visit':
      return 'See';
    case 'do':
      return 'Do';
    default:
      return 'Place';
  }
}

export function buildVibeQueryKey(input: FetchTripVibesInput & { tripId: string }) {
  return [
    input.tripId.trim(),
    input.destination.trim().toLowerCase(),
    (input.hotelCity ?? '').trim().toLowerCase(),
    (input.hotelCountry ?? '').trim().toLowerCase(),
  ].join('::');
}

export function interleaveVibeItems(groups: Pick<TripVibesResult, VibeCategory>) {
  const queues = CATEGORY_ORDER.map((category) => [...groups[category]]);
  const seen = new Set<string>();
  const items: VibeItem[] = [];

  while (queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const item = queue.shift();
      if (!item || seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
}

export function serializeTripVibes(result: Omit<TripVibesResult, 'items'>) {
  return JSON.stringify(result);
}

export function parseTripVibes(payloadJson: string): TripVibesResult | null {
  if (!payloadJson.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(payloadJson) as VibesResponse;
    const eat = normalizeCategoryItems(parsed, 'eat');
    const drink = normalizeCategoryItems(parsed, 'drink');
    const visit = normalizeCategoryItems(parsed, 'visit');
    const doItems = normalizeCategoryItems(parsed, 'do');
    return {
      area: typeof parsed.area === 'string' && parsed.area.trim() ? parsed.area.trim() : 'Destination',
      fetchedAt: typeof parsed.fetchedAt === 'string' && parsed.fetchedAt.trim() ? parsed.fetchedAt : new Date().toISOString(),
      source: parsed.source === 'tripadvisor' ? 'tripadvisor' : 'tripadvisor',
      eat,
      drink,
      visit,
      do: doItems,
      items: interleaveVibeItems({ eat, drink, visit, do: doItems }),
    };
  } catch {
    return null;
  }
}

export function getPrimaryVibeUrl(item: Pick<VibeItem, 'websiteUrl' | 'tripadvisorUrl'>) {
  return item.websiteUrl ?? item.tripadvisorUrl ?? null;
}

export async function fetchTripVibes(input: FetchTripVibesInput): Promise<TripVibesResult> {
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

  const eat = normalizeCategoryItems(payload, 'eat');
  const drink = normalizeCategoryItems(payload, 'drink');
  const visit = normalizeCategoryItems(payload, 'visit');
  const doItems = normalizeCategoryItems(payload, 'do');

  return {
    area: payload?.area?.trim() || input.destination,
    fetchedAt: payload?.fetchedAt?.trim() || new Date().toISOString(),
    source: payload?.source === 'tripadvisor' ? 'tripadvisor' : 'tripadvisor',
    eat,
    drink,
    visit,
    do: doItems,
    items: interleaveVibeItems({ eat, drink, visit, do: doItems }),
  };
}

export function getVibesBaseUrl() {
  return VIBES_BASE_URL;
}
