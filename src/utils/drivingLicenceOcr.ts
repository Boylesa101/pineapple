import type { DocumentDraft, DrivingLicenceData } from '@/types/models';
import { ensureDrivingLicenceDraftData } from '@/utils/drivingLicence';

export interface DrivingLicenceOcrResult {
  rawText: string;
  holderName: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  drivingLicenceData: Partial<DrivingLicenceData>;
}

function normalizeLine(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
        .join('-')
    )
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

function extractSingleLineValue(lines: string[], patterns: string[]) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(new RegExp(`^${pattern}[\\s:.-]+(.+)$`));
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

function extractAddress(lines: string[]) {
  const addressStart = lines.findIndex((line) => /^(8|ADDRESS)[\s:.-]+/.test(line));
  if (addressStart === -1) {
    return '';
  }

  const firstLine = lines[addressStart]?.replace(/^(8|ADDRESS)[\s:.-]+/, '').trim() ?? '';
  const collected = [firstLine];
  for (let index = addressStart + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^\d+[A-Z]?[.: -]/.test(line) || /^[A-Z ]+:[ ]*/.test(line)) {
      break;
    }
    if (line) {
      collected.push(line);
    }
  }

  return titleCase(collected.filter(Boolean).join(', '));
}

export function parseDrivingLicenceOcrText(rawText: string) {
  const lines = rawText
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);

  const surname = extractSingleLineValue(lines, ['1', '1\\.', 'SURNAME', 'LAST NAME']);
  const givenNames = extractSingleLineValue(lines, ['2', '2\\.', 'GIVEN NAMES', 'FIRST NAMES', 'FIRST NAME']);
  const holderName = titleCase([givenNames, surname].filter(Boolean).join(' '));
  const documentNumber =
    extractSingleLineValue(lines, ['5', '5\\.', 'LICENCE NO', 'LICENCE NUMBER', 'LICENSE NUMBER']).replace(/[^A-Z0-9]/g, '') ||
    '';
  const dateOfBirth = normalizeDate(extractSingleLineValue(lines, ['3', '3\\.', 'DATE OF BIRTH', 'BIRTH DATE']));
  const issueDate = normalizeDate(extractSingleLineValue(lines, ['4A', '4A\\.', '4 A', 'DATE OF ISSUE', 'ISSUE DATE']));
  const expiryDate = normalizeDate(extractSingleLineValue(lines, ['4B', '4B\\.', '4 B', 'DATE OF EXPIRY', 'EXPIRY DATE']));
  const issuingAuthority = titleCase(
    extractSingleLineValue(lines, ['4C', '4C\\.', '4 C', 'ISSUING AUTHORITY', 'ISSUER'])
  );
  const categories = extractSingleLineValue(lines, ['9', '9\\.', 'CATEGORIES', 'CATEGORY']);
  const address = extractAddress(lines);

  if (!holderName && !documentNumber && !dateOfBirth && !expiryDate && !address) {
    return null;
  }

  return {
    rawText,
    holderName,
    documentNumber,
    issueDate,
    expiryDate,
    drivingLicenceData: {
      address,
      dateOfBirth,
      categories,
      issuingAuthority,
    },
  } satisfies DrivingLicenceOcrResult;
}

export function canRunDrivingLicenceOcr(
  document: Pick<DocumentDraft, 'documentType' | 'localFileUri' | 'previewUri' | 'mimeType'>
) {
  if (document.documentType !== 'driving_licence' || !document.localFileUri) {
    return false;
  }

  if (document.mimeType?.startsWith('image/') || document.mimeType === 'application/pdf') {
    return true;
  }

  const candidate = document.previewUri ?? document.localFileUri;
  return /\.(pdf|png|jpe?g|webp|heic|heif)$/i.test(candidate);
}

export function applyDrivingLicenceOcrToDraft(draft: DocumentDraft, result: DrivingLicenceOcrResult) {
  const merged = ensureDrivingLicenceDraftData(draft);
  if (!merged.drivingLicenceData) {
    return merged;
  }

  return {
    ...merged,
    holderName: result.holderName || merged.holderName,
    documentNumber: result.documentNumber || merged.documentNumber,
    issueDate: result.issueDate || merged.issueDate,
    expiryDate: result.expiryDate || merged.expiryDate,
    drivingLicenceData: {
      ...merged.drivingLicenceData,
      ...result.drivingLicenceData,
      status: merged.drivingLicenceData.status || 'Valid',
    },
  };
}
