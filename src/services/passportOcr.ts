import { recognizeDocumentText } from '@/services/documentTextOcr';
import { parsePassportOcrText } from '@/utils/passportOcr';

export async function recognizePassportScan(localFileUri: string, mimeType?: string | null) {
  const ocr = await recognizeDocumentText(localFileUri, mimeType, 'Passport');
  const parsed = parsePassportOcrText(ocr.rawText);

  if (!parsed) {
    throw new Error('Pineapple could not confidently read passport fields from that scan.');
  }

  return parsed;
}
