import { Platform } from 'react-native';

import { parsePassportOcrText } from '@/utils/passportOcr';

function createUnsupportedError(message: string) {
  const error = new Error(message);
  error.name = 'PassportOcrUnavailableError';
  return error;
}

export async function recognizePassportScan(localFileUri: string) {
  if (Platform.OS === 'web') {
    throw createUnsupportedError('Passport OCR is available in the Android app, not the web companion.');
  }

  try {
    const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');
    const result = await recognizeText(localFileUri);
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
  }
}
