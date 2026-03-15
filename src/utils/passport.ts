import type { Document, DocumentDraft, PassportData, PassportVerificationStatus, Traveller } from '@/types/models';
import { getVerificationLabel } from '@/utils/verification';

function normalizeLetters(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9< ]/g, '')
    .trim();
}

function padMrz(value: string, length: number) {
  const normalized = normalizeLetters(value).replace(/\s+/g, '<');
  return normalized.slice(0, length).padEnd(length, '<');
}

function splitHolderName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { surname: '', givenNames: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { surname: parts[0], givenNames: '' };
  }

  return {
    surname: parts[parts.length - 1] ?? '',
    givenNames: parts.slice(0, -1).join(' '),
  };
}

function compactDate(value: string | null | undefined) {
  if (!value) {
    return '<<<<<<';
  }

  const digits = value.replace(/-/g, '');
  if (digits.length < 8) {
    return '<<<<<<';
  }

  return `${digits.slice(2, 4)}${digits.slice(4, 6)}${digits.slice(6, 8)}`;
}

export function createEmptyPassportData(): PassportData {
  return {
    passportType: 'P',
    countryCode: '',
    surname: '',
    givenNames: '',
    nationality: '',
    dateOfBirth: null,
    placeOfBirth: '',
  };
}

export function normalizePassportData(passportData: PassportData | null | undefined) {
  if (!passportData) {
    return null;
  }

  return {
    ...createEmptyPassportData(),
    ...passportData,
  };
}

export function derivePassportData(document: Pick<Document, 'holderName' | 'issueDate' | 'expiryDate' | 'documentNumber' | 'passportData'>, traveller?: Traveller | null) {
  const fallbackName = splitHolderName(document.holderName || traveller?.fullName || '');
  const existing = normalizePassportData(document.passportData);

  return {
    ...createEmptyPassportData(),
    ...existing,
    surname: existing?.surname || fallbackName.surname,
    givenNames: existing?.givenNames || fallbackName.givenNames,
    nationality: existing?.nationality || traveller?.passportNationality || '',
    dateOfBirth: existing?.dateOfBirth || traveller?.dateOfBirth || null,
  } satisfies PassportData;
}

export function ensurePassportDraftData(draft: DocumentDraft, traveller?: Traveller | null) {
  if (draft.documentType !== 'passport') {
    return {
      ...draft,
      passportData: null,
    };
  }

  return {
    ...draft,
    passportData: derivePassportData(draft as Document, traveller),
  };
}

export function getPassportVerificationStatus(document: Pick<Document, 'localFileUri' | 'passportData'>, traveller?: Traveller | null): PassportVerificationStatus {
  const data = derivePassportData(document as Document, traveller);
  const filledFields = [
    data.countryCode,
    data.surname,
    data.givenNames,
    data.nationality,
    data.dateOfBirth,
    data.placeOfBirth,
  ].filter(Boolean).length;

  if (Boolean(document.localFileUri) && filledFields >= 5) {
    return 'verified';
  }

  if (filledFields >= 3) {
    return 'review';
  }

  return 'unverified';
}

export function getPassportVerificationLabel(status: PassportVerificationStatus) {
  return getVerificationLabel(status);
}

export function buildPassportMrz(document: Pick<Document, 'documentNumber' | 'expiryDate' | 'passportData'>, traveller?: Traveller | null) {
  const data = derivePassportData(document as Document, traveller);
  const surname = normalizeLetters(data.surname).replace(/\s+/g, '<');
  const givenNames = normalizeLetters(data.givenNames).replace(/\s+/g, '<');
  const lineOne = padMrz(`${data.passportType || 'P'}<${data.countryCode}${surname}<<${givenNames}`, 44);
  const lineTwo = padMrz(
    `${document.documentNumber}${data.countryCode}${compactDate(data.dateOfBirth)}<${compactDate(document.expiryDate)}<<<<<<<<<<<<`,
    44
  );

  return [lineOne, lineTwo] as const;
}

export function buildPassportCopyPayload(document: Pick<Document, 'documentNumber' | 'issueDate' | 'expiryDate' | 'holderName' | 'passportData'>, traveller?: Traveller | null) {
  const data = derivePassportData(document as Document, traveller);

  return [
    'Passport',
    `Holder: ${document.holderName || traveller?.fullName || 'Not set'}`,
    `Passport type: ${data.passportType || 'Not set'}`,
    `Country code: ${data.countryCode || 'Not set'}`,
    `Passport number: ${document.documentNumber || 'Not set'}`,
    `Surname: ${data.surname || 'Not set'}`,
    `Given names: ${data.givenNames || 'Not set'}`,
    `Nationality: ${data.nationality || 'Not set'}`,
    `Date of birth: ${data.dateOfBirth || 'Not set'}`,
    `Place of birth: ${data.placeOfBirth || 'Not set'}`,
    `Date of issue: ${document.issueDate || 'Not set'}`,
    `Expiry date: ${document.expiryDate || 'Not set'}`,
  ].join('\n');
}
