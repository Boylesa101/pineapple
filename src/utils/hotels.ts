import type { DestinationImageAttribution, DestinationImageSource, HeroImageStatus, HotelStay } from '@/types/models';

function normalizeImageSource(value: unknown): DestinationImageSource {
  return value === 'curated' || value === 'pexels' || value === 'wikimedia' || value === 'fallback' ? value : 'fallback';
}

function normalizeImageStatus(value: unknown): HeroImageStatus {
  return value === 'loading' || value === 'ready' || value === 'failed' ? value : 'idle';
}

function normalizeAttributionMeta(value: unknown): DestinationImageAttribution | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return normalizeAttributionMeta(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    source: normalizeImageSource(candidate.source),
    photographer: typeof candidate.photographer === 'string' ? candidate.photographer : undefined,
    photographerUrl: typeof candidate.photographerUrl === 'string' ? candidate.photographerUrl : undefined,
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    author: typeof candidate.author === 'string' ? candidate.author : undefined,
    license: typeof candidate.license === 'string' ? candidate.license : undefined,
    sourceUrl: typeof candidate.sourceUrl === 'string' ? candidate.sourceUrl : undefined,
    sourceLabel: typeof candidate.sourceLabel === 'string' ? candidate.sourceLabel : undefined,
  };
}

export function normalizeHotelStayRecord(
  record: (Partial<HotelStay> & Pick<HotelStay, 'id' | 'tripId' | 'hotelName' | 'address' | 'checkIn' | 'checkOut' | 'createdAt' | 'updatedAt'>) & {
    hotelImageSource?: unknown;
    hotelImageAttributionMeta?: unknown;
    hotelImageStatus?: unknown;
  }
): HotelStay {
  return {
    ...record,
    city: record.city ?? '',
    country: record.country ?? '',
    latitude: typeof record.latitude === 'number' ? record.latitude : null,
    longitude: typeof record.longitude === 'number' ? record.longitude : null,
    hotelImageLocalPath: record.hotelImageLocalPath ?? null,
    hotelImageRemoteUrl: record.hotelImageRemoteUrl ?? null,
    hotelImageSource: normalizeImageSource(record.hotelImageSource),
    hotelImageAttributionText: record.hotelImageAttributionText ?? null,
    hotelImageAttributionMeta: normalizeAttributionMeta(record.hotelImageAttributionMeta),
    hotelImageStatus: normalizeImageStatus(record.hotelImageStatus),
    phone: record.phone ?? '',
    bookingRef: record.bookingRef ?? '',
    notes: record.notes ?? '',
  };
}
