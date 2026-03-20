import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import type {
  DestinationImageAttribution,
  DestinationImageSource,
  DestinationType,
  HeroImageStatus,
} from '@/types/models';
import { resolveDestinationType as resolveDestinationKind } from '@/utils/destinationImage';
import { cleanupImportedSource, readBase64File, writeBase64File } from '@/utils/fileStorage';
import { normalizeDestinationLabel } from '@/utils/trips';

type CuratedDestinationImage = {
  destinationType?: DestinationType;
  matches: string[];
  attributionText: string;
  attribution: DestinationImageAttribution;
};

type ExternalImageResult = {
  imageUrl: string;
  attributionText: string;
  attribution: DestinationImageAttribution;
  source: Exclude<DestinationImageSource, 'curated' | 'fallback'>;
};

type PexelsSearchResponse = {
  photos?: Array<{
    id: number;
    photographer?: string;
    photographer_url?: string;
    url?: string;
    src?: {
      original?: string;
      large2x?: string;
      large?: string;
      landscape?: string;
      medium?: string;
    };
  }>;
};

type WikimediaSearchResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          descriptionurl?: string;
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
            ObjectName?: { value?: string };
            ImageDescription?: { value?: string };
            Credit?: { value?: string };
          };
        }>;
      }
    >;
  };
};

export type DestinationImageResult = {
  destinationType: DestinationType;
  localPath: string | null;
  remoteUrl: string | null;
  source: DestinationImageSource;
  attributionText: string;
  attribution: DestinationImageAttribution;
  heroImageStatus: HeroImageStatus;
};

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
const WIKIMEDIA_SEARCH_URL = 'https://commons.wikimedia.org/w/api.php';
const PEXELS_API_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY?.trim() ?? '';
const WIKIMEDIA_HEADERS =
  Platform.OS === 'web'
    ? undefined
    : {
        'User-Agent': 'Pineapple/1.6 travel organiser',
      };
const curatedDestinationImages: CuratedDestinationImage[] = [];

function createFallbackAttribution(): DestinationImageAttribution {
  return {
    source: 'fallback',
    sourceLabel: 'Default trip background',
  };
}

function buildFallbackResult(destinationType: DestinationType): DestinationImageResult {
  return {
    destinationType,
    localPath: null,
    remoteUrl: null,
    source: 'fallback',
    attributionText: 'Default trip background',
    attribution: createFallbackAttribution(),
    heroImageStatus: 'failed',
  };
}

function stripHtml(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function inferMimeTypeFromUrl(url: string) {
  const lower = url.split('?')[0]?.toLowerCase() ?? '';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function isUsableImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  const lower = url.toLowerCase();
  return (
    (lower.startsWith('https://') || lower.startsWith('http://')) &&
    !lower.includes('.svg') &&
    !lower.includes('/audio/') &&
    !lower.includes('/video/')
  );
}

function getDestinationQueries(destination: string, destinationType: DestinationType) {
  const normalized = normalizeDestinationLabel(destination);
  const segments = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const firstSegment = segments[0] ?? normalized;
  const lastSegment = segments.at(-1) ?? normalized;

  if (destinationType === 'country') {
    return Array.from(
      new Set([
        `${normalized} landscape travel`,
        `${normalized} travel`,
        `${normalized} tourism`,
        normalized,
        firstSegment,
      ])
    );
  }

  return Array.from(
    new Set(
      [normalized, `${firstSegment} skyline`, `${firstSegment} travel`, `${firstSegment} landmark`, `${firstSegment} ${lastSegment}`].filter(Boolean)
    )
  );
}

async function fetchJson<T>(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, {
    headers: {
      ...(WIKIMEDIA_HEADERS ?? {}),
      ...(headers ?? {}),
    },
  });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const retry = await fetch(url, {
      headers: {
        ...(WIKIMEDIA_HEADERS ?? {}),
        ...(headers ?? {}),
      },
    });
    if (!retry.ok) {
      throw new Error(`Destination image lookup failed with ${retry.status}.`);
    }
    return (await retry.json()) as T;
  }
  if (!response.ok) {
    throw new Error(`Destination image lookup failed with ${response.status}.`);
  }
  return (await response.json()) as T;
}

function findCuratedDestinationImage(destination: string, destinationType: DestinationType) {
  const normalized = normalizeDestinationLabel(destination).toLowerCase();
  return (
    curatedDestinationImages.find((candidate) => {
      if (candidate.destinationType && candidate.destinationType !== destinationType) {
        return false;
      }

      return candidate.matches.some((match) => normalized === match || normalized.includes(match));
    }) ?? null
  );
}

export function resolveDestinationType(destination: string) {
  return resolveDestinationKind(destination);
}

export async function fetchFromPexels(destination: string): Promise<ExternalImageResult | null> {
  if (!PEXELS_API_KEY) {
    return null;
  }

  const destinationType = resolveDestinationType(destination);
  const queries = getDestinationQueries(destination, destinationType === 'unknown' ? 'place' : destinationType);

  for (const query of queries) {
    try {
      const url = new URL(PEXELS_SEARCH_URL);
      url.searchParams.set('query', query);
      url.searchParams.set('orientation', 'landscape');
      url.searchParams.set('size', 'large');
      url.searchParams.set('per_page', '6');
      const payload = await fetchJson<PexelsSearchResponse>(url.toString(), {
        Authorization: PEXELS_API_KEY,
      });

      for (const photo of payload.photos ?? []) {
        const imageUrl =
          photo.src?.large2x ?? photo.src?.large ?? photo.src?.landscape ?? photo.src?.original ?? photo.src?.medium ?? null;
        if (!isUsableImageUrl(imageUrl)) {
          continue;
        }
        const usableImageUrl = imageUrl as string;

        const photographer = photo.photographer?.trim() || 'Unknown photographer';
        return {
          imageUrl: usableImageUrl,
          attributionText: `Photo by ${photographer} on Pexels`,
          attribution: {
            source: 'pexels',
            photographer,
            photographerUrl: photo.photographer_url ?? undefined,
            sourceUrl: photo.url ?? undefined,
            sourceLabel: 'Pexels',
          },
          source: 'pexels',
        };
      }
    } catch {
      // Continue through the query list and fall back safely.
    }
  }

  return null;
}

export async function fetchFromWikimedia(destination: string): Promise<ExternalImageResult | null> {
  const destinationType = resolveDestinationType(destination);
  const queries = getDestinationQueries(destination, destinationType === 'unknown' ? 'place' : destinationType);

  for (const query of queries) {
    try {
      const url = new URL(WIKIMEDIA_SEARCH_URL);
      url.searchParams.set('action', 'query');
      url.searchParams.set('generator', 'search');
      url.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
      url.searchParams.set('gsrnamespace', '6');
      url.searchParams.set('gsrlimit', '8');
      url.searchParams.set('prop', 'imageinfo');
      url.searchParams.set('iiprop', 'url|extmetadata');
      url.searchParams.set('iiurlwidth', '1600');
      url.searchParams.set('format', 'json');
      if (Platform.OS === 'web') {
        url.searchParams.set('origin', '*');
      }

      const payload = await fetchJson<WikimediaSearchResponse>(url.toString());
      const pages = Object.values(payload.query?.pages ?? {});
      for (const page of pages) {
        const imageInfo = page.imageinfo?.[0];
        const imageUrl = imageInfo?.thumburl ?? imageInfo?.url ?? null;
        if (!isUsableImageUrl(imageUrl)) {
          continue;
        }
        const usableImageUrl = imageUrl as string;

        const title = stripHtml(imageInfo?.extmetadata?.ObjectName?.value) ?? stripHtml(page.title)?.replace(/^File:/i, '') ?? 'Wikimedia image';
        const author =
          stripHtml(imageInfo?.extmetadata?.Artist?.value) ??
          stripHtml(imageInfo?.extmetadata?.Credit?.value) ??
          'Wikimedia Commons';
        const license = stripHtml(imageInfo?.extmetadata?.LicenseShortName?.value) ?? 'See source';
        const sourceUrl = imageInfo?.descriptionurl ?? undefined;

        return {
          imageUrl: usableImageUrl,
          attributionText: `${title} · ${author}`,
          attribution: {
            source: 'wikimedia',
            title,
            author,
            license,
            sourceUrl,
            sourceLabel: 'Wikimedia Commons',
          },
          source: 'wikimedia',
        };
      }
    } catch {
      // Continue to the next query candidate and eventually fall back.
    }
  }

  return null;
}

export async function cacheImageLocally(imageUrl: string, tripId: string) {
  if (Platform.OS === 'web') {
    return imageUrl;
  }

  const tempUri = `${FileSystem.cacheDirectory ?? ''}pineapple-trip-${tripId}-${Date.now()}`;
  const downloaded = await FileSystem.downloadAsync(imageUrl, tempUri);
  const base64 = await readBase64File(downloaded.uri);
  const extension = inferMimeTypeFromUrl(imageUrl).split('/').pop() ?? 'jpg';
  const cachedUri = await writeBase64File('trips', `${tripId}-destination.${extension}`, base64, {
    encryptAtRest: true,
    mimeType: inferMimeTypeFromUrl(imageUrl),
    sourceFileName: `destination.${extension}`,
  });
  await cleanupImportedSource(downloaded.uri);
  return cachedUri;
}

export async function resolveDestinationImage(destination: string, tripId: string): Promise<DestinationImageResult> {
  const destinationType = resolveDestinationType(destination);
  if (destinationType === 'unknown') {
    return buildFallbackResult(destinationType);
  }

  const curated = findCuratedDestinationImage(destination, destinationType);
  if (curated) {
    return {
      destinationType,
      localPath: null,
      remoteUrl: null,
      source: 'curated',
      attributionText: curated.attributionText,
      attribution: curated.attribution,
      heroImageStatus: 'ready',
    };
  }

  const externalImage = (await fetchFromPexels(destination)) ?? (await fetchFromWikimedia(destination));
  if (!externalImage) {
    return buildFallbackResult(destinationType);
  }

  try {
    const localPath = await cacheImageLocally(externalImage.imageUrl, tripId);
    return {
      destinationType,
      localPath,
      remoteUrl: externalImage.imageUrl,
      source: externalImage.source,
      attributionText: externalImage.attributionText,
      attribution: externalImage.attribution,
      heroImageStatus: 'ready',
    };
  } catch {
    return {
      destinationType,
      localPath: null,
      remoteUrl: externalImage.imageUrl,
      source: externalImage.source,
      attributionText: externalImage.attributionText,
      attribution: externalImage.attribution,
      heroImageStatus: 'failed',
    };
  }
}

export async function resolveTripHeroImage(destination: string, tripId: string) {
  const resolved = await resolveDestinationImage(destination, tripId);
  return {
    destinationType: resolved.destinationType,
    heroImageRemoteUrl: resolved.remoteUrl,
    coverImageUri: resolved.localPath,
    destinationImageLocalPath: resolved.localPath,
    destinationImageRemoteUrl: resolved.remoteUrl,
    destinationImageSource: resolved.source,
    attributionText: resolved.attributionText,
    attributionMeta: resolved.attribution,
    heroImageStatus: resolved.heroImageStatus,
  };
}
