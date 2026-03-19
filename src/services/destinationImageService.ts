import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import type { DestinationType, HeroImageStatus } from '@/types/models';
import { resolveDestinationType } from '@/utils/destinationImage';
import { cleanupImportedSource, copyIntoAppStorage } from '@/utils/fileStorage';
import { normalizeDestinationLabel } from '@/utils/trips';

type DestinationImageResult = {
  destinationType: DestinationType;
  heroImageRemoteUrl: string | null;
  coverImageUri: string | null;
  heroImageStatus: HeroImageStatus;
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      title: string;
    }>;
  };
};

type WikipediaSummaryResponse = {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

const WIKIPEDIA_SEARCH_URL = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIMEDIA_HEADERS =
  Platform.OS === 'web'
    ? undefined
    : {
        'User-Agent': 'Pineapple/1.6 travel organiser',
      };

function getDestinationQueries(destination: string, destinationType: DestinationType) {
  const normalized = normalizeDestinationLabel(destination);
  const segments = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const firstSegment = segments[0] ?? normalized;
  const lastSegment = segments.at(-1) ?? normalized;

  if (destinationType === 'country') {
    return Array.from(new Set([`${normalized} tourism`, `${normalized} travel`, normalized, firstSegment]));
  }

  return Array.from(
    new Set(
      [normalized, firstSegment, `${firstSegment} ${lastSegment}`, `${firstSegment} travel`].filter(Boolean)
    )
  );
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: WIKIMEDIA_HEADERS,
  });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const retry = await fetch(url, {
      headers: WIKIMEDIA_HEADERS,
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

async function searchWikipediaTitles(query: string) {
  const url = new URL(WIKIPEDIA_SEARCH_URL);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('srlimit', '5');
  url.searchParams.set('srsearch', query);
  if (Platform.OS === 'web') {
    url.searchParams.set('origin', '*');
  }

  const payload = await fetchJson<WikipediaSearchResponse>(url.toString());
  return (payload.query?.search ?? []).map((item) => item.title).filter(Boolean);
}

async function fetchWikipediaImage(title: string) {
  const payload = await fetchJson<WikipediaSummaryResponse>(`${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`);
  const original = payload.originalimage?.source ?? null;
  const thumbnail = payload.thumbnail?.source ?? null;

  if (original && !original.toLowerCase().includes('.svg')) {
    return original;
  }

  if (thumbnail && !thumbnail.toLowerCase().includes('.svg')) {
    return thumbnail;
  }

  return null;
}

function inferMimeTypeFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

export async function fetchDestinationImage(destination: string, type: DestinationType) {
  const queries = getDestinationQueries(destination, type);

  for (const query of queries) {
    try {
      const titles = await searchWikipediaTitles(query);
      const candidateTitles = Array.from(new Set([query, ...titles]));

      for (const title of candidateTitles) {
        try {
          const imageUrl = await fetchWikipediaImage(title);
          if (imageUrl) {
            return {
              pageTitle: title,
              remoteUrl: imageUrl,
            };
          }
        } catch {
          // Continue through candidate titles until one resolves cleanly.
        }
      }
    } catch {
      // Continue to the next query candidate.
    }
  }

  return null;
}

export async function cacheTripHeroImage(remoteUrl: string) {
  if (Platform.OS === 'web') {
    return remoteUrl;
  }

  const tempUri = `${FileSystem.cacheDirectory ?? ''}pineapple-trip-${Date.now()}`;
  const downloaded = await FileSystem.downloadAsync(remoteUrl, tempUri);
  const cachedUri = await copyIntoAppStorage(downloaded.uri, 'trips', inferMimeTypeFromUrl(remoteUrl), {
    encryptAtRest: true,
  });
  await cleanupImportedSource(downloaded.uri);
  return cachedUri;
}

export async function resolveTripHeroImage(destination: string): Promise<DestinationImageResult> {
  const destinationType = resolveDestinationType(destination);
  if (destinationType === 'unknown') {
    return {
      destinationType,
      heroImageRemoteUrl: null,
      coverImageUri: null,
      heroImageStatus: 'failed',
    };
  }

  try {
    const image = await fetchDestinationImage(destination, destinationType);
    if (!image) {
      return {
        destinationType,
        heroImageRemoteUrl: null,
        coverImageUri: null,
        heroImageStatus: 'failed',
      };
    }

    const coverImageUri = await cacheTripHeroImage(image.remoteUrl);
    return {
      destinationType,
      heroImageRemoteUrl: image.remoteUrl,
      coverImageUri,
      heroImageStatus: 'ready',
    };
  } catch {
    return {
      destinationType,
      heroImageRemoteUrl: null,
      coverImageUri: null,
      heroImageStatus: 'failed',
    };
  }
}
