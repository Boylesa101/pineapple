import type { Document, DocumentDraft, DocumentType, FormalDocumentData, Traveller, VerificationStatus } from '@/types/models';
import { manualTravelDocumentTypes } from './documentTypes';

export const FORMAL_DOCUMENT_TYPES: DocumentType[] = [...manualTravelDocumentTypes];

export function isFormalDocumentType(documentType: DocumentType) {
  return FORMAL_DOCUMENT_TYPES.includes(documentType);
}

export function createEmptyFormalDocumentData(): FormalDocumentData {
  return {
    title: '',
    issuer: '',
    referenceCode: '',
    location: '',
    status: 'Stored',
    summary: '',
    railClass: '',
    ticketType: '',
    coach: '',
    seat: '',
    travellerName: '',
    fare: '',
  };
}

export function normalizeFormalDocumentData(value: FormalDocumentData | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    ...createEmptyFormalDocumentData(),
    ...value,
  };
}

function defaultTitleForType(documentType: DocumentType) {
  switch (documentType) {
    case 'insurance':
      return 'Insurance record';
    case 'boarding_pass':
      return 'Boarding pass';
    case 'hotel_booking':
      return 'Hotel confirmation';
    case 'excursion_ticket':
      return 'Excursion confirmation';
    case 'hire_car_booking':
      return 'Car hire voucher';
    case 'airport_lounge_pass':
      return 'Lounge access pass';
    case 'loyalty_card':
      return 'Airline loyalty card';
    case 'rail_ticket':
      return 'Rail ticket';
    case 'visa':
      return 'Visa record';
    default:
      return 'Formal document';
  }
}

export function deriveFormalDocumentData(
  document: Pick<Document, 'documentType' | 'holderName' | 'documentNumber' | 'notes' | 'formalDocumentData'>,
  _traveller?: Traveller | null
) {
  const existing = normalizeFormalDocumentData(document.formalDocumentData);

  return {
    ...createEmptyFormalDocumentData(),
    ...existing,
    title: existing?.title || defaultTitleForType(document.documentType),
    referenceCode: existing?.referenceCode || document.documentNumber || '',
    summary: existing?.summary || document.notes || '',
  } satisfies FormalDocumentData;
}

export function ensureFormalDocumentDraftData(draft: DocumentDraft, traveller?: Traveller | null) {
  if (!isFormalDocumentType(draft.documentType)) {
    return {
      ...draft,
      formalDocumentData: null,
    };
  }

  return {
    ...draft,
    formalDocumentData: deriveFormalDocumentData(draft as Document, traveller),
  };
}

export function getFormalDocumentVerificationStatus(
  document: Pick<Document, 'localFileUri' | 'mimeType' | 'formalDocumentData' | 'documentNumber' | 'notes'>
): VerificationStatus {
  const data = deriveFormalDocumentData(document as Document);
  const filledFields = [data.title, data.issuer, data.referenceCode, data.location, data.summary].filter(Boolean).length;

  if (Boolean(document.localFileUri) && filledFields >= 3) {
    return 'verified';
  }

  if (filledFields >= 2 || (Boolean(document.localFileUri) && Boolean(document.mimeType))) {
    return 'review';
  }

  return 'unverified';
}

export function buildFormalDocumentCopyPayload(
  document: Pick<Document, 'holderName' | 'documentNumber' | 'issueDate' | 'expiryDate' | 'notes' | 'formalDocumentData' | 'documentType'>,
  traveller?: Traveller | null
) {
  const data = deriveFormalDocumentData(document as Document, traveller);

  return [
    data.title || defaultTitleForType(document.documentType),
    `Holder: ${document.holderName || traveller?.fullName || 'Not set'}`,
    `Issuer: ${data.issuer || 'Not set'}`,
    `Reference: ${data.referenceCode || document.documentNumber || 'Not set'}`,
    `Issue date: ${document.issueDate || 'Not set'}`,
    `Expiry date: ${document.expiryDate || 'Not set'}`,
    `Location: ${data.location || 'Not set'}`,
    `Status: ${data.status || 'Not set'}`,
    `Class: ${data.railClass || 'Not set'}`,
    `Ticket type: ${data.ticketType || 'Not set'}`,
    `Coach: ${data.coach || 'Not set'}`,
    `Seat: ${data.seat || 'Not set'}`,
    `Traveller: ${data.travellerName || document.holderName || traveller?.fullName || 'Not set'}`,
    `Fare: ${data.fare || 'Not set'}`,
    `Summary: ${data.summary || document.notes || 'Not set'}`,
  ].join('\n');
}
