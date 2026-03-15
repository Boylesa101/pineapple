import type { Document, DocumentDraft, HealthCardData, Traveller, VerificationStatus } from '@/types/models';

export function createEmptyHealthCardData(): HealthCardData {
  return {
    issuer: '',
    countryCode: '',
    emergencyLine: '',
    status: 'Active',
  };
}

export function normalizeHealthCardData(value: HealthCardData | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    ...createEmptyHealthCardData(),
    ...value,
  };
}

export function deriveHealthCardData(
  document: Pick<Document, 'holderName' | 'healthCardData'>,
  traveller?: Traveller | null
) {
  const existing = normalizeHealthCardData(document.healthCardData);

  return {
    ...createEmptyHealthCardData(),
    ...existing,
    countryCode: existing?.countryCode || 'GBR',
  } satisfies HealthCardData;
}

export function ensureHealthCardDraftData(draft: DocumentDraft, traveller?: Traveller | null) {
  if (draft.documentType !== 'ghic') {
    return {
      ...draft,
      healthCardData: null,
    };
  }

  return {
    ...draft,
    healthCardData: deriveHealthCardData(draft as Document, traveller),
  };
}

export function getHealthCardVerificationStatus(
  document: Pick<Document, 'localFileUri' | 'healthCardData'>,
  traveller?: Traveller | null
): VerificationStatus {
  const data = deriveHealthCardData(document as Document, traveller);
  const filledFields = [data.issuer, data.countryCode, data.emergencyLine, data.status].filter(Boolean).length;

  if (Boolean(document.localFileUri) && filledFields >= 3) {
    return 'verified';
  }

  if (filledFields >= 2) {
    return 'review';
  }

  return 'unverified';
}

export function buildHealthCardCopyPayload(
  document: Pick<Document, 'holderName' | 'documentNumber' | 'issueDate' | 'expiryDate' | 'healthCardData'>,
  traveller?: Traveller | null
) {
  const data = deriveHealthCardData(document as Document, traveller);

  return [
    'Health card',
    `Holder: ${document.holderName || traveller?.fullName || 'Not set'}`,
    `Card number: ${document.documentNumber || 'Not set'}`,
    `Issuer: ${data.issuer || 'Not set'}`,
    `Issue date: ${document.issueDate || 'Not set'}`,
    `Expiry date: ${document.expiryDate || 'Not set'}`,
    `Country code: ${data.countryCode || 'Not set'}`,
    `Emergency line: ${data.emergencyLine || 'Not set'}`,
    `Status: ${data.status || 'Not set'}`,
  ].join('\n');
}
