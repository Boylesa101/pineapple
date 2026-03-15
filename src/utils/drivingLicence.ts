import type { Document, DocumentDraft, DrivingLicenceData, Traveller, VerificationStatus } from '@/types/models';

export function createEmptyDrivingLicenceData(): DrivingLicenceData {
  return {
    address: '',
    dateOfBirth: null,
    categories: '',
    issuingAuthority: '',
    status: 'Valid',
  };
}

export function normalizeDrivingLicenceData(value: DrivingLicenceData | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    ...createEmptyDrivingLicenceData(),
    ...value,
  };
}

export function deriveDrivingLicenceData(
  document: Pick<Document, 'holderName' | 'drivingLicenceData'>,
  traveller?: Traveller | null
) {
  const existing = normalizeDrivingLicenceData(document.drivingLicenceData);

  return {
    ...createEmptyDrivingLicenceData(),
    ...existing,
    dateOfBirth: existing?.dateOfBirth || traveller?.dateOfBirth || null,
  } satisfies DrivingLicenceData;
}

export function ensureDrivingLicenceDraftData(draft: DocumentDraft, traveller?: Traveller | null) {
  if (draft.documentType !== 'driving_licence') {
    return {
      ...draft,
      secondaryLocalFileUri: null,
      secondaryPreviewUri: null,
      secondaryMimeType: null,
      drivingLicenceData: null,
    };
  }

  return {
    ...draft,
    drivingLicenceData: deriveDrivingLicenceData(draft as Document, traveller),
  };
}

export function getDrivingLicenceVerificationStatus(
  document: Pick<Document, 'localFileUri' | 'secondaryLocalFileUri' | 'drivingLicenceData'>,
  traveller?: Traveller | null
): VerificationStatus {
  const data = deriveDrivingLicenceData(document as Document, traveller);
  const filledFields = [data.address, data.dateOfBirth, data.categories, data.issuingAuthority, data.status].filter(Boolean).length;

  if (Boolean(document.localFileUri) && Boolean(document.secondaryLocalFileUri) && filledFields >= 4) {
    return 'verified';
  }

  if ((Boolean(document.localFileUri) || Boolean(document.secondaryLocalFileUri)) && filledFields >= 2) {
    return 'review';
  }

  return 'unverified';
}

export function buildDrivingLicenceCopyPayload(
  document: Pick<Document, 'holderName' | 'documentNumber' | 'issueDate' | 'expiryDate' | 'drivingLicenceData'>,
  traveller?: Traveller | null
) {
  const data = deriveDrivingLicenceData(document as Document, traveller);

  return [
    'Driving licence',
    `Full name: ${document.holderName || traveller?.fullName || 'Not set'}`,
    `Licence number: ${document.documentNumber || 'Not set'}`,
    `Address: ${data.address || 'Not set'}`,
    `Date of birth: ${data.dateOfBirth || 'Not set'}`,
    `Date of issue: ${document.issueDate || 'Not set'}`,
    `Expiry date: ${document.expiryDate || 'Not set'}`,
    `Categories: ${data.categories || 'Not set'}`,
    `Issuing authority: ${data.issuingAuthority || 'Not set'}`,
    `Status: ${data.status || 'Not set'}`,
  ].join('\n');
}
