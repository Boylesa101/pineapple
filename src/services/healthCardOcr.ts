import { recognizeDocumentText } from '@/services/documentTextOcr';
import { parseHealthCardOcrText } from '@/utils/healthCardOcr';

export async function recognizeHealthCardScan(localFileUri: string, mimeType?: string | null) {
  const ocr = await recognizeDocumentText(localFileUri, mimeType, 'Health card');
  const parsed = parseHealthCardOcrText(ocr.rawText);

  if (!parsed) {
    throw new Error('Pineapple could not confidently read health-card fields from that scan.');
  }

  return parsed;
}
