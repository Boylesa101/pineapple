import { Platform } from 'react-native';

import { deleteLocalFile, materializeReadableFile } from '@/utils/fileStorage';

const MAX_PDF_OCR_PAGES = 3;

function createUnavailableError(message: string) {
  const error = new Error(message);
  error.name = 'DocumentOcrUnavailableError';
  return error;
}

type OcrSource = {
  imageUris: string[];
  generatedUris: string[];
};

export type DocumentTextOcrResult = {
  rawText: string;
  pageCount: number;
  pageTexts: string[];
};

async function resolveOcrSource(localFileUri: string, mimeType?: string | null): Promise<OcrSource> {
  if (mimeType !== 'application/pdf' && !localFileUri.toLowerCase().endsWith('.pdf')) {
    return { imageUris: [localFileUri], generatedUris: [] };
  }

  const PdfPageImage = (await import('react-native-pdf-page-image')).default;
  const generatedUris: string[] = [];

  for (let pageNumber = 1; pageNumber <= MAX_PDF_OCR_PAGES; pageNumber += 1) {
    try {
      const pageImage = await PdfPageImage.generate(localFileUri, pageNumber, 2);
      if (pageImage?.uri) {
        generatedUris.push(pageImage.uri);
      }
    } catch (error) {
      if (pageNumber === 1) {
        throw error;
      }
      break;
    }
  }

  if (!generatedUris.length) {
    throw new Error('Pineapple could not render that PDF for OCR.');
  }

  return { imageUris: generatedUris, generatedUris };
}

export async function recognizeDocumentText(localFileUri: string, mimeType: string | null | undefined, label: string) {
  if (Platform.OS === 'web') {
    throw createUnavailableError(`${label} OCR is available in the Android app, not the web companion.`);
  }

  let generatedImageUris: string[] = [];
  let readableSourceUri = localFileUri;
  try {
    const materialized = await materializeReadableFile(localFileUri, mimeType);
    readableSourceUri = materialized.uri || localFileUri;
    const source = await resolveOcrSource(readableSourceUri, mimeType);
    generatedImageUris = source.generatedUris;
    const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');
    const pageTexts: string[] = [];

    for (const imageUri of source.imageUris) {
      const result = await recognizeText(imageUri);
      pageTexts.push(result.text || '');
    }

    return {
      rawText: pageTexts.filter(Boolean).join('\n'),
      pageCount: pageTexts.length,
      pageTexts,
    } satisfies DocumentTextOcrResult;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'DocumentOcrUnavailableError') {
        throw error;
      }

      if (
        error.message.includes('RNMLKitTextRecognition') ||
        error.message.includes('RNPdfPageImage') ||
        error.message.includes('native module') ||
        error.message.includes('Cannot find native module')
      ) {
        throw createUnavailableError(
          `${label} OCR needs the installed Android build of Pineapple. Unsupported runtimes can still edit those fields manually.`
        );
      }

      throw error;
    }

    throw new Error(`${label} OCR is unavailable right now.`);
  } finally {
    for (const generatedImageUri of generatedImageUris) {
      await deleteLocalFile(generatedImageUri);
    }
    if (readableSourceUri !== localFileUri) {
      await deleteLocalFile(readableSourceUri);
    }
  }
}
