import { recognizeDocumentText } from '@/services/documentTextOcr';
import { parseDrivingLicenceOcrText } from '@/utils/drivingLicenceOcr';

export async function recognizeDrivingLicenceScan(localFileUri: string, mimeType?: string | null) {
  const rawText = await recognizeDocumentText(localFileUri, mimeType, 'Driving licence');
  const parsed = parseDrivingLicenceOcrText(rawText);

  if (!parsed) {
    throw new Error('Pineapple could not confidently read driving licence fields from that scan.');
  }

  return parsed;
}
