import { Platform } from 'react-native';

export type HotelSearchResult = {
  hotelName: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
};

type NominatimResult = Array<{
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
  };
}>;

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const searchCache = new Map<string, HotelSearchResult[]>();

function resolveCity(address?: NominatimResult[number]['address']) {
  return address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.county ?? address?.state ?? '';
}

function resolveStreet(address?: NominatimResult[number]['address']) {
  const street = [address?.house_number, address?.road].filter(Boolean).join(' ');
  return street || address?.suburb || '';
}

export async function searchHotelAddresses(query: string) {
  const normalized = query.trim();
  if (normalized.length < 3) {
    return [];
  }

  const cacheKey = normalized.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) ?? [];
  }

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('q', normalized);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  if (Platform.OS === 'web') {
    url.searchParams.set('accept-language', 'en');
  }

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Pineapple/1.6 hotel search',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as NominatimResult;
  const results = payload.map((item) => {
    const city = resolveCity(item.address);
    const country = item.address?.country ?? '';
    const street = resolveStreet(item.address);
    const hotelName = item.name?.trim() || normalized;
    const address = [street, city, country].filter(Boolean).join(', ') || item.display_name || normalized;
    return {
      hotelName,
      address,
      city,
      country,
      latitude: item.lat ? Number(item.lat) : null,
      longitude: item.lon ? Number(item.lon) : null,
      label: item.display_name || address || hotelName,
    };
  });

  searchCache.set(cacheKey, results);
  return results;
}
