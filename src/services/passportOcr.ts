import { Platform } from 'react-native';

import { deleteLocalFile } from '@/utils/fileStorage';
import { parsePassportOcrText } from '@/utils/passportOcr';

function createUnsupportedError(message: string) {
  const error = new Error(message);
  error.name = 'PassportOcrUnavailableError';
  return error;
}

async function resolveOcrSource(localFileUri: string, mimeType?: string | null) {
  if (mimeType !== 'application/pdf' && !localFileUri.toLowerCase().endsWith('.pdf')) {
    return { imageUri: localFileUri, generated: false };
  }

  const PdfPageImage = (await import('react-native-pdf-page-image')).default;
  const pageImage = await PdfPageImage.generate(localFileUri, 1, 2);
  return { imageUri: pageImage.uri, generated: true };
}

export async function recognizePassportScan(localFileUri: string, mimeType?: string | null) {
  if (Platform.OS === 'web') {
    throw createUnsupportedError('Passport OCR is available in the Android app, not the web companion.');
  }

  let generatedImageUri: string | null = null;
  try {
    const source = await resolveOcrSource(localFileUri, mimeType);
    generatedImageUri = source.generated ? source.imageUri : null;
    const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');
    const result = await recognizeText(source.imageUri);
    const parsed = parsePassportOcrText(result.text);

    if (!parsed) {
      throw new Error('Pineapple could not confidently read passport fields from that scan.');
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'PassportOcrUnavailableError') {
        throw error;
      }

      if (
        error.message.includes('RNMLKitTextRecognition') ||
        error.message.includes('RNPdfPageImage') ||
        error.message.includes('native module') ||
        error.message.includes('Cannot find native module')
      ) {
        throw createUnsupportedError(
          'Passport OCR needs the Android build of Pineapple. Expo Go and the web app can still edit passport fields manually.'
        );
      }

      throw error;
    }

    throw new Error('Passport OCR is unavailable right now.');
  } finally {
    if (generatedImageUri) {
      await deleteLocalFile(generatedImageUri);
    }
  }
}
