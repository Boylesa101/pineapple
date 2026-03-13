import { formatShortDate } from './date';

import type { RelationshipType } from '@/types/models';

export function maskSensitive(value: string, keep = 4) {
  if (!value) {
    return 'Not set';
  }

  if (value.length <= keep) {
    return value;
  }

  return `${'•'.repeat(Math.max(0, value.length - keep))}${value.slice(-keep)}`;
}

export function percent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function tripDateRange(startDate: string, endDate: string) {
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

export function relationshipLabel(value: RelationshipType) {
  switch (value) {
    case 'adult':
      return 'Adult';
    case 'child':
      return 'Child';
    case 'infant':
      return 'Infant';
    default:
      return 'Other';
  }
}
