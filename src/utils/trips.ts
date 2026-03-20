import type { DestinationImageAttribution, DestinationImageSource, DestinationType, HeroImageStatus, Trip } from '@/types/models';

export function normalizeDestinationType(value: unknown): DestinationType {
  return value === 'country' || value === 'place' ? value : 'unknown';
}

export function normalizeHeroImageStatus(value: unknown): HeroImageStatus {
  return value === 'loading' || value === 'ready' || value === 'failed' ? value : 'idle';
}

export function normalizeDestinationImageSource(value: unknown): DestinationImageSource {
  return value === 'curated' || value === 'pexels' || value === 'wikimedia' || value === 'fallback' ? value : 'fallback';
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
    source: normalizeDestinationImageSource(candidate.source),
    photographer: typeof candidate.photographer === 'string' ? candidate.photographer : undefined,
    photographerUrl: typeof candidate.photographerUrl === 'string' ? candidate.photographerUrl : undefined,
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    author: typeof candidate.author === 'string' ? candidate.author : undefined,
    license: typeof candidate.license === 'string' ? candidate.license : undefined,
    sourceUrl: typeof candidate.sourceUrl === 'string' ? candidate.sourceUrl : undefined,
    sourceLabel: typeof candidate.sourceLabel === 'string' ? candidate.sourceLabel : undefined,
  };
}

export function normalizeTripRecord(record: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'destination' | 'startDate' | 'endDate' | 'status' | 'createdAt' | 'updatedAt'>): Trip {
  const destinationImageLocalPath = record.destinationImageLocalPath ?? record.coverImageUri ?? null;
  const destinationImageRemoteUrl = record.destinationImageRemoteUrl ?? record.heroImageRemoteUrl ?? null;

  return {
    ...record,
    destinationType: normalizeDestinationType(record.destinationType),
    destinationImageLocalPath,
    destinationImageRemoteUrl,
    destinationImageSource: normalizeDestinationImageSource(record.destinationImageSource),
    attributionText: record.attributionText ?? null,
    attributionMeta: normalizeAttributionMeta(record.attributionMeta),
    coverImageUri: destinationImageLocalPath,
    heroImageRemoteUrl: destinationImageRemoteUrl,
    heroImageStatus: normalizeHeroImageStatus(record.heroImageStatus),
    notes: record.notes ?? '',
    transferSummary: record.transferSummary ?? '',
  };
}

export function normalizeDestinationLabel(destination: string) {
  return destination
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ');
}
