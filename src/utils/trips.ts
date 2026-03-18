import type { DestinationType, HeroImageStatus, Trip } from '@/types/models';

export function normalizeDestinationType(value: unknown): DestinationType {
  return value === 'country' || value === 'place' ? value : 'unknown';
}

export function normalizeHeroImageStatus(value: unknown): HeroImageStatus {
  return value === 'loading' || value === 'ready' || value === 'failed' ? value : 'idle';
}

export function normalizeTripRecord(record: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'destination' | 'startDate' | 'endDate' | 'status' | 'createdAt' | 'updatedAt'>): Trip {
  return {
    ...record,
    destinationType: normalizeDestinationType(record.destinationType),
    coverImageUri: record.coverImageUri ?? null,
    heroImageRemoteUrl: record.heroImageRemoteUrl ?? null,
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
