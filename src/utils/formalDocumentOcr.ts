import type { DocumentDraft, FormalDocumentData } from '@/types/models';
import { ensureFormalDocumentDraftData, isFormalDocumentType } from '@/utils/formalDocument';

export interface FormalDocumentOcrResult {
  rawText: string;
  holderName: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  formalDocumentData: Partial<FormalDocumentData>;
  warnings: string[];
}

function normalizeLine(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dayMatch = trimmed.match(/\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/);
  if (dayMatch) {
    return `${dayMatch[3]}-${dayMatch[2]}-${dayMatch[1]}`;
  }

  return null;
}

function extractValue(lines: string[], patterns: string[]) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(new RegExp(`^${pattern}[\\s:.-]+(.+)$`, 'i'));
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

function collectNormalizedDates(rawText: string) {
  const matches = rawText.match(/\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b/g) ?? [];
  return Array.from(new Set(matches.map(normalizeDate).filter((value): value is string => Boolean(value))));
}

function collectReferenceCandidates(rawText: string) {
  const matches = rawText.match(/\b[A-Z0-9-]{5,24}\b/g) ?? [];
  return Array.from(new Set(matches.filter((value) => /[A-Z]/.test(value) && /\d/.test(value))));
}

function buildWarnings(rawText: string, referenceCode: string) {
  const warnings: string[] = [];
  const dates = collectNormalizedDates(rawText);
  const references = collectReferenceCandidates(rawText);

  if (dates.length > 3) {
    warnings.push('Multiple date candidates were detected. Review the document dates before saving.');
  }

  if (references.length > 1 && referenceCode && references.some((value) => value !== referenceCode)) {
    warnings.push('Multiple reference candidates were detected. Confirm the extracted reference before saving.');
  }

  return warnings;
}

export function parseFormalDocumentOcrText(rawText: string) {
  const lines = rawText.split('\n').map(normalizeLine).filter(Boolean);

  const title = titleCase(extractValue(lines, ['Title', 'Document', 'Policy', 'Certificate', 'Confirmation', 'Pass']));
  const issuer = titleCase(extractValue(lines, ['Issuer', 'Provider', 'Company', 'Airline', 'Hotel', 'Authority']));
  const holderName = titleCase(extractValue(lines, ['Name', 'Holder', 'Traveller', 'Guest', 'Passenger']));
  const documentNumber = extractValue(lines, [
    'Reference Number',
    'Reference',
    'Policy Number',
    'Booking Reference',
    'Confirmation Number',
    'Document Number',
  ]).replace(/\s+/g, '');
  const issueDate = normalizeDate(extractValue(lines, ['Issue Date', 'Issued', 'Created']));
  const expiryDate = normalizeDate(extractValue(lines, ['Expiry Date', 'Renewal Date', 'Valid Until', 'Expires']));
  const location = titleCase(extractValue(lines, ['Location', 'Destination', 'Venue', 'Address']));
  const summary = extractValue(lines, ['Summary', 'Notes', 'Description', 'Cover', 'Reason']);
  const status = titleCase(extractValue(lines, ['Status']));

  if (!title && !issuer && !documentNumber && !summary) {
    return null;
  }

  return {
    rawText,
    holderName,
    documentNumber,
    issueDate,
    expiryDate,
    formalDocumentData: {
      title,
      issuer,
      referenceCode: documentNumber,
      location,
      status,
      summary,
    },
    warnings: buildWarnings(rawText, documentNumber),
  } satisfies FormalDocumentOcrResult;
}

export function canRunFormalDocumentOcr(
  document: Pick<DocumentDraft, 'documentType' | 'localFileUri' | 'previewUri' | 'mimeType'>
) {
  if (!isFormalDocumentType(document.documentType) || !document.localFileUri) {
    return false;
  }

  if (document.mimeType?.startsWith('image/') || document.mimeType === 'application/pdf') {
    return true;
  }

  const candidate = document.previewUri ?? document.localFileUri;
  return /\.(pdf|png|jpe?g|webp|heic|heif)$/i.test(candidate);
}

export function applyFormalDocumentOcrToDraft(draft: DocumentDraft, result: FormalDocumentOcrResult) {
  const merged = ensureFormalDocumentDraftData(draft);
  if (!merged.formalDocumentData) {
    return merged;
  }

  return {
    ...merged,
    holderName: result.holderName || merged.holderName,
    documentNumber: result.documentNumber || merged.documentNumber,
    issueDate: result.issueDate || merged.issueDate,
    expiryDate: result.expiryDate || merged.expiryDate,
    formalDocumentData: {
      ...merged.formalDocumentData,
      ...result.formalDocumentData,
      status: result.warnings.length ? 'Needs review' : result.formalDocumentData.status || merged.formalDocumentData.status || 'Stored',
    },
  };
}
