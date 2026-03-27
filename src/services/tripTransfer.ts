import * as ExpoLinking from 'expo-linking';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const TRIP_TRANSFER_PATH = 'trip-transfer';
const MAX_QR_HREF_LENGTH = 2600;

export type TripTransferTarget = {
  href: `/${string}`;
  payload: string;
};

let pendingTripTransferTarget: TripTransferTarget | null = null;

function normalizePath(path: string | null | undefined) {
  if (!path) {
    return '';
  }

  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildInternalHref(payload: string) {
  return `/${TRIP_TRANSFER_PATH}?payload=${encodeURIComponent(payload)}` as const;
}

function parsePayload(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }
  return typeof value === 'string' && value.length ? value : null;
}

export function buildTripTransferQrPayload(contents: string) {
  const payload = compressToEncodedURIComponent(contents);
  const externalUrl = ExpoLinking.createURL(`/${TRIP_TRANSFER_PATH}`, {
    queryParams: { payload },
  });

  return {
    payload,
    externalUrl,
    internalHref: buildInternalHref(payload),
    fitsQr: externalUrl.length <= MAX_QR_HREF_LENGTH,
  };
}

export function decodeTripTransferPayload(payload: string) {
  const decoded = decompressFromEncodedURIComponent(payload);
  if (!decoded) {
    throw new Error('That trip transfer QR code is invalid or incomplete.');
  }
  return decoded;
}

function parseTripTransferUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const parsed = ExpoLinking.parse(url);
  if (normalizePath(parsed.path) !== TRIP_TRANSFER_PATH) {
    return null;
  }

  const payload = parsePayload(parsed.queryParams?.payload);
  if (!payload) {
    return null;
  }

  return {
    href: buildInternalHref(payload),
    payload,
  } satisfies TripTransferTarget;
}

function rememberTripTransferTarget(target: TripTransferTarget | null) {
  if (target) {
    pendingTripTransferTarget = target;
  }
}

export function consumePendingTripTransferTarget() {
  const target = pendingTripTransferTarget;
  pendingTripTransferTarget = null;
  return target;
}

export async function getInitialTripTransferTarget() {
  const url = await ExpoLinking.getInitialURL();
  const target = parseTripTransferUrl(url);
  rememberTripTransferTarget(target);
  return pendingTripTransferTarget;
}

export function addTripTransferUrlListener(onReceive: (target: TripTransferTarget) => void) {
  const subscription = ExpoLinking.addEventListener('url', ({ url }) => {
    const target = parseTripTransferUrl(url);
    rememberTripTransferTarget(target);
    if (target) {
      onReceive(target);
    }
  });

  return () => subscription.remove();
}
