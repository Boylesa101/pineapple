import { recognizeDocumentText } from '@/services/documentTextOcr';
import { parseFormalDocumentOcrText } from '@/utils/formalDocumentOcr';

export async function recognizeFormalDocumentScan(localFileUri: string, mimeType?: string | null) {
  const ocr = await recognizeDocumentText(localFileUri, mimeType, 'Formal document');
  const parsed = parseFormalDocumentOcrText(ocr.rawText);

  if (!parsed) {
    throw new Error('Pineapple could not confidently read document details from that scan.');
  }

  return parsed;
}
