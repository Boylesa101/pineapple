import type { DocumentDraft, HealthCardData } from '@/types/models';
import { ensureHealthCardDraftData } from '@/utils/healthCard';

export interface HealthCardOcrResult {
  rawText: string;
  holderName: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  healthCardData: Partial<HealthCardData>;
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

function collectNormalizedDates(rawText: string) {
  const matches = rawText.match(/\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b/g) ?? [];
  return Array.from(new Set(matches.map(normalizeDate).filter((value): value is string => Boolean(value))));
}

function collectNumberCandidates(rawText: string) {
  const matches = rawText.match(/\b[A-Z0-9]{8,20}\b/g) ?? [];
  return Array.from(new Set(matches.filter((value) => /\d/.test(value))));
}

function buildHealthCardWarnings(rawText: string, documentNumber: string) {
  const warnings: string[] = [];
  const dates = collectNormalizedDates(rawText);
  const numbers = collectNumberCandidates(rawText);

  if (dates.length > 2) {
    warnings.push('Multiple date candidates were detected. Review the health-card dates before saving.');
  }

  if (numbers.length > 1 && documentNumber && numbers.some((value) => value !== documentNumber)) {
    warnings.push('Multiple card-number candidates were detected. Confirm the extracted health-card number before saving.');
  }

  return warnings;
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

export function parseHealthCardOcrText(rawText: string) {
  const lines = rawText.split('\n').map(normalizeLine).filter(Boolean);

  const holderName = titleCase(extractValue(lines, ['Name', 'Holder', 'Cardholder', 'Insured Person']));
  const documentNumber = extractValue(lines, [
    'Card Number',
    'Number',
    'Personal Identification Number',
    'Identification Number',
    'ID Number',
  ]).replace(/\s+/g, '');
  const issueDate = normalizeDate(extractValue(lines, ['Issue Date', 'Issued', 'Date of Issue']));
  const expiryDate = normalizeDate(extractValue(lines, ['Expiry Date', 'Valid Until', 'Date of Expiry', 'Expires']));
  const issuer = titleCase(extractValue(lines, ['Issuer', 'Issuing Authority', 'Authority']));
  const countryCode = extractValue(lines, ['Country Code', 'Country', 'Code']).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const emergencyLine = extractValue(lines, ['Emergency', 'Emergency Line', 'Emergency Number', 'Help Line', 'Helpline']);

  if (!holderName && !documentNumber && !expiryDate && !issuer) {
    return null;
  }

  return {
    rawText,
    holderName,
    documentNumber,
    issueDate,
    expiryDate,
    healthCardData: {
      issuer,
      countryCode,
      emergencyLine,
    },
    warnings: buildHealthCardWarnings(rawText, documentNumber),
  } satisfies HealthCardOcrResult;
}

export function canRunHealthCardOcr(
  document: Pick<DocumentDraft, 'documentType' | 'localFileUri' | 'previewUri' | 'mimeType'>
) {
  if (document.documentType !== 'ghic' || !document.localFileUri) {
    return false;
  }

  if (document.mimeType?.startsWith('image/') || document.mimeType === 'application/pdf') {
    return true;
  }

  const candidate = document.previewUri ?? document.localFileUri;
  return /\.(pdf|png|jpe?g|webp|heic|heif)$/i.test(candidate);
}

export function applyHealthCardOcrToDraft(draft: DocumentDraft, result: HealthCardOcrResult) {
  const merged = ensureHealthCardDraftData(draft);
  if (!merged.healthCardData) {
    return merged;
  }

  return {
    ...merged,
    holderName: result.holderName || merged.holderName,
    documentNumber: result.documentNumber || merged.documentNumber,
    issueDate: result.issueDate || merged.issueDate,
    expiryDate: result.expiryDate || merged.expiryDate,
    healthCardData: {
      ...merged.healthCardData,
      ...result.healthCardData,
      status: result.warnings.length ? 'Pending review' : merged.healthCardData.status || 'Active',
    },
  };
}
