import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo, documentTypeNeedsExpiryPrompt, documentTypeSupportsExpiryWarnings } from '@/utils/documentExpiry';

export type DocumentWarningItem = {
  document: Document;
  traveller: Traveller | null;
  ownerLabel: string;
  info: ReturnType<typeof getDocumentExpiryInfo>;
};

export type TripDocumentWarningSummary = {
  expiredCount: number;
  expiringCount: number;
  missingExpiryCount: number;
  missingInsuranceTravellers: Traveller[];
  warningItems: DocumentWarningItem[];
};

function getTravellerForDocument(document: Document, travellers: Traveller[]) {
  return travellers.find((traveller) => traveller.id === document.travellerId) ?? null;
}

function getOwnerLabel(document: Document, travellers: Traveller[]) {
  const traveller = getTravellerForDocument(document, travellers);
  return document.holderName || traveller?.fullName || 'Trip-wide';
}

function warningSortValue(item: DocumentWarningItem) {
  if (item.info.isExpired) return 0;
  if (item.info.passportSixMonthWarning) return 1;
  if (item.info.bucket === 'within_1_day') return 2;
  if (item.info.bucket === 'within_7_days') return 3;
  if (item.info.bucket === 'within_14_days') return 4;
  if (item.info.bucket === 'within_30_days') return 5;
  if (item.info.bucket === 'within_90_days') return 6;
  if (item.info.bucket === 'within_180_days') return 7;
  if (item.info.needsExpiryPrompt) return 8;
  return 9;
}

function expirySortValue(document: Document) {
  if (!document.expiryDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  return new Date(document.expiryDate).getTime();
}

export function getDocumentWarningItems(documents: Document[], travellers: Traveller[]) {
  return documents
    .filter((document) => documentTypeSupportsExpiryWarnings(document.documentType))
    .map((document) => ({
      document,
      traveller: getTravellerForDocument(document, travellers),
      ownerLabel: getOwnerLabel(document, travellers),
      info: getDocumentExpiryInfo(document.documentType, document.expiryDate),
    }))
    .filter((item) => item.info.isExpired || item.info.isExpiring || item.info.needsExpiryPrompt)
    .sort((left, right) => {
      const severity = warningSortValue(left) - warningSortValue(right);
      if (severity !== 0) {
        return severity;
      }

      return expirySortValue(left.document) - expirySortValue(right.document);
    });
}

export function getMissingInsuranceTravellers(documents: Document[], travellers: Traveller[]) {
  const tripWideInsurance = documents.some((document) => document.documentType === 'insurance' && !document.travellerId);
  if (tripWideInsurance) {
    return [];
  }

  return travellers.filter(
    (traveller) => !documents.some((document) => document.documentType === 'insurance' && document.travellerId === traveller.id)
  );
}

export function getTripDocumentWarningSummary(documents: Document[], travellers: Traveller[]): TripDocumentWarningSummary {
  const warningItems = getDocumentWarningItems(documents, travellers);
  return {
    expiredCount: warningItems.filter((item) => item.info.isExpired).length,
    expiringCount: warningItems.filter((item) => item.info.isExpiring).length,
    missingExpiryCount: warningItems.filter(
      (item) => item.info.needsExpiryPrompt && documentTypeNeedsExpiryPrompt(item.document.documentType)
    ).length,
    missingInsuranceTravellers: getMissingInsuranceTravellers(documents, travellers),
    warningItems,
  };
}
