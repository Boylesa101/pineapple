type EmptyTextArgs = {
  hasFile: boolean;
  isPdf: boolean;
};

export function isDocumentPdfSource(mimeType?: string | null, localFileUri?: string | null) {
  return mimeType === 'application/pdf' || Boolean(localFileUri && localFileUri.toLowerCase().endsWith('.pdf'));
}

export function getDocumentSourcePreviewUri(previewUri?: string | null, localFileUri?: string | null, mimeType?: string | null) {
  if (isDocumentPdfSource(mimeType, localFileUri)) {
    return null;
  }

  return previewUri || localFileUri || null;
}

export function getDocumentSourceCtaLabel(isPdf: boolean) {
  return isPdf ? 'Open PDF locally' : 'Open image locally';
}

export function getDocumentSourceEmptyText({ hasFile, isPdf }: EmptyTextArgs) {
  if (hasFile) {
    return isPdf ? 'PDF stored locally on this device.' : 'Source file stored locally on this device.';
  }

  return 'No source file attached yet.';
}
