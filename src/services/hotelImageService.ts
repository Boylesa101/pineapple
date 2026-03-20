import { Platform } from 'react-native';

import type {
  DestinationImageAttribution,
  DestinationImageSource,
  HeroImageStatus,
  HotelStayDraft,
} from '@/types/models';
import {
  cacheImageLocally,
  fetchFromPexelsQueries,
  fetchFromWikimediaQueries,
  type ExternalImageResult,
} from './destinationImageService';

type GeocodeResult = {
  displayName: string;
  locality: string | null;
  country: string | null;
};

type NominatimSearchResponse = Array<{
  display_name?: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}>;

export type HotelImageResult = {
  localPath: string | null;
  remoteUrl: string | null;
  source: DestinationImageSource;
  attributionText: string;
  attribution: DestinationImageAttribution;
  status: HeroImageStatus;
};

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

function createFallbackResult(): HotelImageResult {
  return {
    localPath: null,
    remoteUrl: null,
    source: 'fallback',
    attributionText: 'Default hotel background',
    attribution: {
      source: 'fallback',
      sourceLabel: 'Default hotel background',
    },
    status: 'failed',
  };
}

async function geocodeHotelAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');
    if (Platform.OS === 'web') {
      url.searchParams.set('accept-language', 'en');
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Pineapple/1.6 hotel lookup',
      },
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as NominatimSearchResponse;
    const match = payload[0];
    if (!match) {
      return null;
    }

    return {
      displayName: match.display_name ?? trimmed,
      locality:
        match.address?.city ??
        match.address?.town ??
        match.address?.village ??
        match.address?.municipality ??
        match.address?.county ??
        match.address?.state ??
        null,
      country: match.address?.country ?? null,
    };
  } catch {
    return null;
  }
}

function buildHotelQueries(hotelName: string, address: string, geocode: GeocodeResult | null) {
  const locality = geocode?.locality;
  const country = geocode?.country;
  const areaLabel = [locality, country].filter(Boolean).join(', ');

  return Array.from(
    new Set(
      [
        [hotelName, areaLabel].filter(Boolean).join(' ').trim(),
        [hotelName, locality, 'hotel'].filter(Boolean).join(' ').trim(),
        [hotelName, country].filter(Boolean).join(' ').trim(),
        [address, 'hotel'].filter(Boolean).join(' ').trim(),
        locality ? `${locality} hotel exterior` : null,
        locality ? `${locality} boutique hotel` : null,
        areaLabel ? `${areaLabel} travel stay` : null,
      ].filter((value): value is string => Boolean(value))
    )
  );
}

async function resolveExternalHotelImage(queries: string[]) {
  return (await fetchFromPexelsQueries(queries)) ?? (await fetchFromWikimediaQueries(queries));
}

async function cacheHotelImage(external: ExternalImageResult, hotelId: string): Promise<HotelImageResult> {
  try {
    const localPath = await cacheImageLocally(external.imageUrl, hotelId, 'hotel');
    return {
      localPath,
      remoteUrl: external.imageUrl,
      source: external.source,
      attributionText: external.attributionText,
      attribution: external.attribution,
      status: 'ready',
    };
  } catch {
    return {
      localPath: null,
      remoteUrl: external.imageUrl,
      source: external.source,
      attributionText: external.attributionText,
      attribution: external.attribution,
      status: 'failed',
    };
  }
}

export async function resolveHotelImage(
  draft: Pick<HotelStayDraft, 'hotelName' | 'address'>,
  hotelId: string
): Promise<HotelImageResult> {
  const hotelName = draft.hotelName.trim();
  const address = draft.address.trim();
  if (!hotelName || !address) {
    return createFallbackResult();
  }

  const geocode = await geocodeHotelAddress(address);
  const queries = buildHotelQueries(hotelName, address, geocode);
  const external = await resolveExternalHotelImage(queries);

  if (!external) {
    return createFallbackResult();
  }

  return cacheHotelImage(external, hotelId);
}
