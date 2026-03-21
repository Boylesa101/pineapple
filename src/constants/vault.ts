export const PERSONAL_DOCUMENTS_TRIP_ID = '__personal_documents__';
export const PERSONAL_DOCUMENTS_LABEL = 'Personal docs';

export function isPersonalDocumentsTripId(tripId: string | null | undefined) {
  return tripId === PERSONAL_DOCUMENTS_TRIP_ID;
}
