import { differenceInCalendarDays, differenceInCalendarMonths, isValid, parseISO, startOfDay } from 'date-fns';

import type {
  AppPreferences,
  Document,
  DocumentDraft,
  DrivingLicenceData,
  DocumentType,
  ExpiryReminderLeadTime,
  ExpiryReminderSchedule,
} from '@/types/models';
import { normalizeDrivingLicenceData } from './drivingLicence';
import { normalizePassportData } from './passport';

export type DocumentExpiryBucket =
  | 'missing'
  | 'expired'
  | 'within_1_day'
  | 'within_7_days'
  | 'within_14_days'
  | 'within_30_days'
  | 'within_90_days'
  | 'within_180_days'
  | 'valid';

type ExpiryTone = 'default' | 'success' | 'gold' | 'coral' | 'danger';

export const DEFAULT_EXPIRY_REMINDER_SCHEDULE: ExpiryReminderSchedule = [90, 30, 7, 1, 0];
export const EXPIRY_WARNING_THRESHOLDS: ExpiryReminderLeadTime[] = [180, 90, 30, 14, 7, 1];
const EXPIRY_PROMPT_TYPES: DocumentType[] = ['passport', 'ghic', 'insurance', 'visa', 'driving_licence', 'id_card'];
const EXPIRY_WARNING_TYPES: DocumentType[] = ['passport', 'ghic', 'insurance', 'visa', 'driving_licence', 'id_card', 'custom'];

function isIsoDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return isValid(parseISO(value));
}

export function defaultAppExpiryPreferences() {
  return {
    expiryRemindersEnabled: true,
    expiryReminderSchedule: DEFAULT_EXPIRY_REMINDER_SCHEDULE,
    expiryReminderSilent: false,
  } as const;
}

export function documentTypeSupportsExpiryWarnings(documentType: DocumentType) {
  return EXPIRY_WARNING_TYPES.includes(documentType);
}

export function documentTypeNeedsExpiryPrompt(documentType: DocumentType) {
  return EXPIRY_PROMPT_TYPES.includes(documentType);
}

export function normalizeExpiryReminderSchedule(value: unknown): ExpiryReminderSchedule {
  const validValues: ExpiryReminderLeadTime[] = [180, 90, 30, 14, 7, 1, 0];
  const fromArray = Array.isArray(value) ? value : typeof value === 'string' ? safeParseSchedule(value) : null;
  const normalized = (fromArray ?? [])
    .map((entry) => Number(entry))
    .filter((entry): entry is ExpiryReminderLeadTime => validValues.includes(entry as ExpiryReminderLeadTime))
    .sort((left, right) => right - left);

  return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_EXPIRY_REMINDER_SCHEDULE;
}

function safeParseSchedule(value: string) {
  try {
    return JSON.parse(value) as number[];
  } catch {
    return null;
  }
}

export function serializeExpiryReminderSchedule(value: ExpiryReminderSchedule) {
  return JSON.stringify(normalizeExpiryReminderSchedule(value));
}

function getDaysUntilExpiry(expiryDate: string) {
  return differenceInCalendarDays(startOfDay(parseISO(expiryDate)), startOfDay(new Date()));
}

export function getDocumentExpiryBucket(documentType: DocumentType, expiryDate: string | null | undefined): DocumentExpiryBucket {
  if (!expiryDate) {
    return documentTypeNeedsExpiryPrompt(documentType) ? 'missing' : 'valid';
  }

  if (!isIsoDate(expiryDate)) {
    return 'missing';
  }

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 1) return 'within_1_day';
  if (daysUntilExpiry <= 7) return 'within_7_days';
  if (daysUntilExpiry <= 14) return 'within_14_days';
  if (daysUntilExpiry <= 30) return 'within_30_days';
  if (daysUntilExpiry <= 90) return 'within_90_days';
  if (daysUntilExpiry <= 180) return 'within_180_days';
  return 'valid';
}

export function getDocumentExpiryTone(documentType: DocumentType, expiryDate: string | null | undefined): ExpiryTone {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  if (bucket === 'missing') return 'gold';
  if (bucket === 'expired') return 'danger';
  if (documentType === 'passport' && bucket === 'within_180_days') return 'danger';
  if (bucket === 'within_1_day' || bucket === 'within_7_days' || bucket === 'within_14_days' || bucket === 'within_30_days') return 'coral';
  if (bucket === 'within_90_days' || bucket === 'within_180_days') return 'gold';
  return 'success';
}

export function getDocumentExpiryBadgeLabel(documentType: DocumentType, expiryDate: string | null | undefined) {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  switch (bucket) {
    case 'missing':
      return 'Add expiry date';
    case 'expired':
      return 'Expired';
    case 'within_1_day':
      return 'Expires in 1 day';
    case 'within_7_days':
      return 'Expires in 7 days';
    case 'within_14_days':
      return 'Expires in 14 days';
    case 'within_30_days':
      return 'Expires in 30 days';
    case 'within_90_days':
      return 'Expires in 3 months';
    case 'within_180_days':
      return 'Expires in 6 months';
    default:
      return 'Valid';
  }
}

export function getDocumentExpiryRelativeLabel(expiryDate: string | null | undefined) {
  if (!expiryDate) {
    return 'Add expiry date';
  }

  if (!isIsoDate(expiryDate)) {
    return 'Add a valid expiry date';
  }

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry < 0) {
    return 'Expired';
  }
  if (daysUntilExpiry === 0) {
    return 'Expires today';
  }
  if (daysUntilExpiry === 1) {
    return 'Expires tomorrow';
  }
  if (daysUntilExpiry <= 30) {
    return `Expires in ${daysUntilExpiry} days`;
  }

  const monthsUntilExpiry = Math.max(1, differenceInCalendarMonths(parseISO(expiryDate), new Date()));
  return `Expires in ${monthsUntilExpiry} month${monthsUntilExpiry === 1 ? '' : 's'}`;
}

export function getDocumentExpiryInfo(documentType: DocumentType, expiryDate: string | null | undefined) {
  const bucket = getDocumentExpiryBucket(documentType, expiryDate);
  return {
    bucket,
    tone: getDocumentExpiryTone(documentType, expiryDate),
    badgeLabel: getDocumentExpiryBadgeLabel(documentType, expiryDate),
    relativeLabel: getDocumentExpiryRelativeLabel(expiryDate),
    passportSixMonthWarning: documentType === 'passport' && bucket === 'within_180_days',
    needsExpiryPrompt: bucket === 'missing' && documentTypeNeedsExpiryPrompt(documentType),
    isExpired: bucket === 'expired',
    isExpiring: ['within_1_day', 'within_7_days', 'within_14_days', 'within_30_days', 'within_90_days', 'within_180_days'].includes(bucket),
  };
}

export function getDocumentExpiryLeadCandidates(document: Pick<Document, 'documentType' | 'expiryReminderSchedule'>) {
  return normalizeExpiryReminderSchedule(document.expiryReminderSchedule);
}

export function normalizeDocumentRecord(document: Omit<Document, 'expiredStatus' | 'expiringSoonStatus' | 'expiryReminderEnabled' | 'expiryReminderSchedule'> & Partial<Pick<Document, 'expiryReminderEnabled' | 'expiryReminderSchedule' | 'expiredStatus' | 'expiringSoonStatus'>>) {
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  return {
    ...document,
    expiryReminderEnabled: document.expiryReminderEnabled ?? documentTypeSupportsExpiryWarnings(document.documentType),
    expiryReminderSchedule: normalizeExpiryReminderSchedule(document.expiryReminderSchedule),
    passportData: normalizePassportData(document.passportData),
    secondaryLocalFileUri: document.secondaryLocalFileUri ?? null,
    secondaryPreviewUri: document.secondaryPreviewUri ?? null,
    secondaryMimeType: document.secondaryMimeType ?? null,
    drivingLicenceData: normalizeDrivingLicenceData(document.drivingLicenceData as DrivingLicenceData | null | undefined),
    expiredStatus: expiryInfo.isExpired,
    expiringSoonStatus: expiryInfo.isExpiring,
  };
}

export function buildDocumentDraftDefaults(partial: Pick<DocumentDraft, 'tripId' | 'localFileUri' | 'previewUri' | 'mimeType'>): DocumentDraft {
  const normalized = normalizeDocumentRecord({
    id: undefined as never,
    tripId: partial.tripId,
    travellerId: null,
    holderName: '',
    documentType: 'custom',
    documentNumber: '',
    issueDate: null,
    expiryDate: null,
    notes: '',
    localFileUri: partial.localFileUri,
    previewUri: partial.previewUri,
    mimeType: partial.mimeType,
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    sensitive: true,
    createdAt: '',
    updatedAt: '',
  });

  return {
    tripId: normalized.tripId,
    travellerId: normalized.travellerId,
    holderName: normalized.holderName,
    documentType: normalized.documentType,
    documentNumber: normalized.documentNumber,
    issueDate: normalized.issueDate,
    expiryDate: normalized.expiryDate,
    expiryReminderEnabled: normalized.expiryReminderEnabled,
    expiryReminderSchedule: normalized.expiryReminderSchedule,
    expiredStatus: normalized.expiredStatus,
    expiringSoonStatus: normalized.expiringSoonStatus,
    notes: normalized.notes,
    localFileUri: normalized.localFileUri,
    previewUri: normalized.previewUri,
    mimeType: normalized.mimeType,
    passportData: normalized.passportData,
    secondaryLocalFileUri: normalized.secondaryLocalFileUri,
    secondaryPreviewUri: normalized.secondaryPreviewUri,
    secondaryMimeType: normalized.secondaryMimeType,
    drivingLicenceData: normalized.drivingLicenceData,
    sensitive: normalized.sensitive,
  };
}

export function normalizeAppPreferences(input: Partial<AppPreferences> & Pick<AppPreferences, 'id' | 'createdAt' | 'updatedAt' | 'notificationsEnabled' | 'syncEnabled' | 'syncMode' | 'syncStatus' | 'lastSyncAt' | 'lastBackupAt' | 'privacyMaskingMode'>): AppPreferences {
  const defaults = defaultAppExpiryPreferences();
  return {
    ...input,
    expiryRemindersEnabled: input.expiryRemindersEnabled ?? defaults.expiryRemindersEnabled,
    expiryReminderSchedule: normalizeExpiryReminderSchedule(input.expiryReminderSchedule),
    expiryReminderSilent: input.expiryReminderSilent ?? defaults.expiryReminderSilent,
  };
}
