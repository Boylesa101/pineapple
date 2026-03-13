import { differenceInCalendarDays, differenceInCalendarMonths, parseISO, startOfDay } from 'date-fns';

import type { DocumentType } from '@/types/models';

export type DocumentExpiryBucket =
  | 'missing'
  | 'expired'
  | 'within_7_days'
  | 'within_30_days'
  | 'within_3_months'
  | 'within_6_months'
  | 'valid';

type ExpiryTone = 'default' | 'success' | 'gold' | 'coral' | 'danger';

const PROMPT_EXPIRY_TYPES: DocumentType[] = ['passport', 'ghic', 'insurance', 'visa'];
const WARNING_TYPES: DocumentType[] = ['passport', 'ghic', 'insurance', 'visa', 'custom'];

export function documentTypeSupportsExpiryWarnings(documentType: DocumentType) {
  return WARNING_TYPES.includes(documentType);
}

export function documentTypeNeedsExpiryPrompt(documentType: DocumentType) {
  return PROMPT_EXPIRY_TYPES.includes(documentType);
}

function getDaysUntilExpiry(expiryDate: string) {
  return differenceInCalendarDays(startOfDay(parseISO(expiryDate)), startOfDay(new Date()));
}

export function getDocumentExpiryBucket(documentType: DocumentType, expiryDate: string | null | undefined): DocumentExpiryBucket {
  if (!expiryDate) {
    return documentTypeNeedsExpiryPrompt(documentType) ? 'missing' : 'valid';
  }

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'within_7_days';
  if (daysUntilExpiry <= 30) return 'within_30_days';
  if (daysUntilExpiry <= 90) return 'within_3_months';
  if (daysUntilExpiry <= 180) return 'within_6_months';
  return 'valid';
}

export function getDocumentExpiryTone(documentType: DocumentType, expiryDate: string | null | undefined): ExpiryTone {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  if (bucket === 'missing') return 'gold';
  if (bucket === 'expired') return 'danger';
  if (documentType === 'passport' && bucket === 'within_6_months') return 'danger';
  if (bucket === 'within_7_days' || bucket === 'within_30_days') return 'coral';
  if (bucket === 'within_3_months' || bucket === 'within_6_months') return 'gold';
  return 'success';
}

export function getDocumentExpiryBadgeLabel(documentType: DocumentType, expiryDate: string | null | undefined) {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  switch (bucket) {
    case 'missing':
      return 'Add expiry date';
    case 'expired':
      return 'Expired';
    case 'within_7_days':
      return 'Expires in 7 days';
    case 'within_30_days':
      return 'Expires in 30 days';
    case 'within_3_months':
      return 'Expires in 3 months';
    case 'within_6_months':
      return 'Expires in 6 months';
    default:
      return 'Valid';
  }
}

export function getDocumentExpiryRelativeLabel(expiryDate: string | null | undefined) {
  if (!expiryDate) {
    return 'Add expiry date';
  }

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry < 0) {
    return 'Expired';
  }

  if (daysUntilExpiry === 0) {
    return 'Expires today';
  }

  if (daysUntilExpiry === 1) {
    return 'Expires in 1 day';
  }

  if (daysUntilExpiry <= 30) {
    return `Expires in ${daysUntilExpiry} days`;
  }

  const monthsUntilExpiry = Math.max(1, differenceInCalendarMonths(parseISO(expiryDate), new Date()));
  return `Expires in ${monthsUntilExpiry} month${monthsUntilExpiry === 1 ? '' : 's'}`;
}

export function getDocumentExpiryLeadDays(documentType: DocumentType) {
  switch (documentType) {
    case 'passport':
      return 180;
    case 'visa':
      return 7;
    case 'insurance':
    case 'ghic':
    case 'custom':
      return 30;
    default:
      return null;
  }
}

export function getDocumentExpiryInfo(documentType: DocumentType, expiryDate: string | null | undefined) {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  return {
    bucket,
    tone: getDocumentExpiryTone(documentType, expiryDate),
    badgeLabel: getDocumentExpiryBadgeLabel(documentType, expiryDate),
    relativeLabel: getDocumentExpiryRelativeLabel(expiryDate),
    passportSixMonthWarning: documentType === 'passport' && bucket === 'within_6_months',
    needsExpiryPrompt: bucket === 'missing',
    isExpired: bucket === 'expired',
    isExpiring: ['within_7_days', 'within_30_days', 'within_3_months', 'within_6_months'].includes(bucket),
  };
}
