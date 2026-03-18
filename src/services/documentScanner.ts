import { Platform } from 'react-native';

type ScanStatus = 'success' | 'cancel';

export type LiveDocumentScanResult = {
  status: ScanStatus;
  scannedImages: string[];
};

type NativeScannerModule = {
  default: {
    scanDocument: (options?: { croppedImageQuality?: number; maxNumDocuments?: number }) => Promise<{
      scannedImages?: string[];
      status?: ScanStatus;
    }>;
  };
};

function getScannerModule(): NativeScannerModule | null {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('react-native-document-scanner-plugin') as NativeScannerModule;
  } catch {
    return null;
  }
}

export function isLiveDocumentScannerAvailable() {
  return Boolean(getScannerModule()?.default?.scanDocument);
}

export async function scanDocumentWithLiveEdges(options?: { croppedImageQuality?: number; maxNumDocuments?: number }): Promise<LiveDocumentScanResult> {
  const scannerModule = getScannerModule();

  if (!scannerModule?.default?.scanDocument) {
    throw new Error('Live document scanner unavailable');
  }

  const response = await scannerModule.default.scanDocument({
    croppedImageQuality: 95,
    maxNumDocuments: 1,
    ...options,
  });

  return {
    status: response.status ?? ((response.scannedImages?.length ?? 0) > 0 ? 'success' : 'cancel'),
    scannedImages: response.scannedImages ?? [],
  };
}
