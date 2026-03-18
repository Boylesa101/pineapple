import { countryNameSet } from '@/data/countries';
import type { DestinationType } from '@/types/models';
import { normalizeDestinationLabel } from '@/utils/trips';

function isCountryName(value: string) {
  return countryNameSet.has(value.trim().toLowerCase());
}

export function resolveDestinationType(destination: string): DestinationType {
  const normalized = normalizeDestinationLabel(destination);
  if (!normalized) {
    return 'unknown';
  }

  const segments = normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 1 && isCountryName(segments[0])) {
    return 'country';
  }

  if (segments.length > 1 && isCountryName(segments.at(-1) ?? '')) {
    return 'place';
  }

  return isCountryName(normalized) ? 'country' : 'place';
}
