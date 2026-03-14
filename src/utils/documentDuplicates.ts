import type { Document, DocumentDraft } from '@/types/models';

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function findPotentialDocumentDuplicate(documents: Document[], draft: DocumentDraft) {
  const holderName = normalizeValue(draft.holderName);
  const documentNumber = normalizeValue(draft.documentNumber);
  const localFileUri = normalizeValue(draft.localFileUri);

  return (
    documents.find((document) => {
      if (draft.id && document.id === draft.id) {
        return false;
      }

      if (document.tripId !== draft.tripId || document.documentType !== draft.documentType) {
        return false;
      }

      const sameFile = Boolean(localFileUri) && normalizeValue(document.localFileUri) === localFileUri;
      const sameHolderAndNumber =
        Boolean(holderName) &&
        Boolean(documentNumber) &&
        normalizeValue(document.holderName) === holderName &&
        normalizeValue(document.documentNumber) === documentNumber;

      return sameFile || sameHolderAndNumber;
    }) ?? null
  );
}
