import type { DocumentDraft, PassportData } from '@/types/models';
import { ensurePassportDraftData } from '@/utils/passport';

export type PassportOcrSource = 'mrz' | 'text';

export interface PassportOcrResult {
  source: PassportOcrSource;
  rawText: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  holderName: string;
  passportData: Partial<PassportData>;
}

function normalizeLine(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9< /.-]/g, '');
}

function compactMrzLine(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9<]/g, '');
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function titleCasePassportName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .toLowerCase()
        .split('-')
        .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
        .join('-')
    )
    .join(' ');
}

function parseMrzDate(value: string, kind: 'birth' | 'expiry') {
  if (!/^\d{6}$/.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const currentYear = new Date().getUTCFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  let fullYear =
    kind === 'birth'
      ? year > currentYear % 100
        ? currentCentury - 100 + year
        : currentCentury + year
      : currentCentury + year;

  if (kind === 'expiry' && fullYear > currentYear + 20) {
    fullYear -= 100;
  }

  return `${String(fullYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeExtractedDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dayFirstMatch = trimmed.match(/\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/);
  if (dayFirstMatch) {
    return `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`;
  }

  return null;
}

function parseLabelValue(rawText: string, labels: string[]) {
  const pattern = labels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const match = rawText.match(new RegExp(`(?:${pattern})\\s*[:.-]?\\s*([^\\n]+)`, 'i'));
  return match?.[1]?.trim() || '';
}

function extractMrz(rawText: string) {
  const candidates = rawText
    .split('\n')
    .map(compactMrzLine)
    .filter((line) => line.length >= 40 && line.includes('<'));

  for (let index = 0; index < candidates.length - 1; index += 1) {
    const lineOne = candidates[index] ?? '';
    const lineTwo = candidates[index + 1] ?? '';
    if (!lineOne.startsWith('P<') || lineTwo.length < 40) {
      continue;
    }

    return [lineOne.padEnd(44, '<').slice(0, 44), lineTwo.padEnd(44, '<').slice(0, 44)] as const;
  }

  return null;
}

function parseMrz(rawText: string): PassportOcrResult | null {
  const mrz = extractMrz(rawText);
  if (!mrz) {
    return null;
  }

  const [lineOne, lineTwo] = mrz;
  const [surnameRaw = '', givenRaw = ''] = lineOne.slice(5).split('<<');
  const surname = titleCasePassportName(surnameRaw.replace(/</g, ' '));
  const givenNames = titleCasePassportName(givenRaw.replace(/</g, ' '));
  const holderName = [givenNames, surname].filter(Boolean).join(' ').trim();
  const documentNumber = lineTwo.slice(0, 9).replace(/</g, '');
  const countryCode = lineOne.slice(2, 5).replace(/</g, '');
  const nationality = lineTwo.slice(10, 13).replace(/</g, '') || countryCode;

  return {
    source: 'mrz',
    rawText,
    documentNumber,
    issueDate: null,
    expiryDate: parseMrzDate(lineTwo.slice(21, 27), 'expiry'),
    holderName,
    passportData: {
      passportType: lineOne.slice(0, 1).replace(/</g, '') || 'P',
      countryCode,
      surname,
      givenNames,
      nationality,
      dateOfBirth: parseMrzDate(lineTwo.slice(13, 19), 'birth'),
    },
  };
}

function parseFallbackText(rawText: string): PassportOcrResult | null {
  const normalized = rawText
    .split('\n')
    .map(normalizeLine)
    .join('\n');

  const surname = parseLabelValue(normalized, ['SURNAME', 'LAST NAME', 'NOM']);
  const givenNames = parseLabelValue(normalized, ['GIVEN NAMES', 'GIVEN NAME', 'FIRST NAME', 'PRENOMS']);
  const countryCode = parseLabelValue(normalized, ['COUNTRY CODE', 'ISSUING STATE', 'COUNTRY']).replace(/[^A-Z]/g, '').slice(0, 3);
  const nationality = parseLabelValue(normalized, ['NATIONALITY']).replace(/[^A-Z ]/g, '');
  const placeOfBirth = parseLabelValue(normalized, ['PLACE OF BIRTH']);
  const documentNumber = parseLabelValue(normalized, ['PASSPORT NO', 'PASSPORT NUMBER', 'DOCUMENT NO', 'DOCUMENT NUMBER']).replace(
    /[^A-Z0-9]/g,
    ''
  );
  const issueDate = normalizeExtractedDate(parseLabelValue(normalized, ['DATE OF ISSUE', 'ISSUE DATE']));
  const expiryDate = normalizeExtractedDate(parseLabelValue(normalized, ['DATE OF EXPIRY', 'EXPIRY DATE', 'EXPIRATION DATE', 'VALID UNTIL']));
  const dateOfBirth = normalizeExtractedDate(parseLabelValue(normalized, ['DATE OF BIRTH', 'BIRTH DATE']));

  if (!surname && !givenNames && !documentNumber && !expiryDate) {
    return null;
  }

  return {
    source: 'text',
    rawText,
    documentNumber,
    issueDate,
    expiryDate,
    holderName: titleCasePassportName([givenNames, surname].filter(Boolean).join(' ')),
    passportData: {
      passportType: parseLabelValue(normalized, ['TYPE']).slice(0, 2) || 'P',
      countryCode,
      surname: titleCasePassportName(surname),
      givenNames: titleCasePassportName(givenNames),
      nationality: titleCase(nationality),
      dateOfBirth,
      placeOfBirth: titleCase(placeOfBirth),
    },
  };
}

export function parsePassportOcrText(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  return parseMrz(trimmed) ?? parseFallbackText(trimmed);
}

export function hasPassportImageForOcr(document: Pick<DocumentDraft, 'localFileUri' | 'mimeType' | 'previewUri' | 'documentType'>) {
  if (document.documentType !== 'passport') {
    return false;
  }

  if (!document.localFileUri) {
    return false;
  }

  if (document.mimeType?.startsWith('image/')) {
    return true;
  }
  if (document.mimeType === 'application/pdf') {
    return true;
  }

  const candidate = document.previewUri ?? document.localFileUri;
  return /\.(pdf|png|jpe?g|webp|heic|heif)$/i.test(candidate);
}

export function applyPassportOcrToDraft(draft: DocumentDraft, result: PassportOcrResult) {
  const merged = ensurePassportDraftData(draft);
  if (!merged.passportData) {
    return merged;
  }

  const nextPassportData: PassportData = {
    ...merged.passportData,
    ...result.passportData,
    passportType: result.passportData.passportType || merged.passportData.passportType || 'P',
  };

  return {
    ...merged,
    holderName: result.holderName || merged.holderName,
    documentNumber: result.documentNumber || merged.documentNumber,
    issueDate: result.issueDate || merged.issueDate,
    expiryDate: result.expiryDate || merged.expiryDate,
    passportData: nextPassportData,
  };
}
