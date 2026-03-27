const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';
const RESULTS_PER_BUCKET = 25;

const vibeSearchMap = {
  eat: { category: 'restaurants', searchSuffix: 'restaurants' },
  drink: { category: 'restaurants', searchSuffix: 'bars cafes cocktails' },
  visit: { category: 'attractions', searchSuffix: 'landmarks museums beaches' },
  do: { category: 'attractions', searchSuffix: 'things to do experiences' },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

function buildAreaQuery(destination, city, country) {
  return [city, destination, country].filter(Boolean).join(', ');
}

function buildAreaContext(destination, city, country) {
  const area = buildAreaQuery(destination, city, country);
  const primaryLabel = cleanText(destination)?.split(',')[0]?.trim().toLowerCase() ?? '';
  const tokens = Array.from(
    new Set(
      [destination, city, country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );

  return {
    area,
    primaryLabel,
    tokens,
  };
}

function sanitizeAllowedDomain(value) {
  return (value || 'pinapple-dev.pages.dev').replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function cleanText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pickFirstString(...values) {
  for (const value of values) {
    const normalized = cleanText(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAbsoluteHttpUrl(value, baseUrl = null) {
  const normalized = cleanText(value);
  if (!normalized) {
    return null;
  }

  try {
    const resolved = baseUrl ? new URL(normalized, baseUrl) : new URL(normalized);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function pickImageUrl(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const nestedEntries = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.photos)
      ? payload.photos
      : [];
  const candidates = [
    payload?.images?.large?.url,
    payload?.images?.original?.url,
    payload?.images?.medium?.url,
    payload?.images?.small?.url,
    payload?.images?.thumbnail?.url,
    payload?.images?.large?.url_template,
    payload?.images?.original?.url_template,
    payload?.images?.medium?.url_template,
    payload?.images?.small?.url_template,
    payload?.images?.thumbnail?.url_template,
    payload?.photo?.images?.large?.url,
    payload?.photo?.images?.original?.url,
    payload?.photo?.images?.medium?.url,
    payload?.photo?.images?.small?.url,
    payload?.photo?.images?.thumbnail?.url,
    payload?.hero?.images?.large?.url,
    payload?.hero?.images?.original?.url,
    payload?.hero?.images?.medium?.url,
    payload?.hero?.images?.small?.url,
    payload?.image?.url,
  ];

  for (const entry of nestedEntries.slice(0, 5)) {
    candidates.push(
      entry?.images?.large?.url,
      entry?.images?.original?.url,
      entry?.images?.medium?.url,
      entry?.images?.small?.url,
      entry?.images?.thumbnail?.url,
      entry?.photo?.images?.large?.url,
      entry?.photo?.images?.original?.url,
      entry?.photo?.images?.medium?.url,
      entry?.photo?.images?.small?.url,
      entry?.photo?.images?.thumbnail?.url,
      entry?.image?.url,
      entry?.url,
    );
  }

  return candidates.find((candidate) => cleanText(candidate)) ?? null;
}

function extractMetaTagContent(html, attribute, key) {
  const escapedAttribute = escapeRegex(attribute);
  const escapedKey = escapeRegex(key);
  const patterns = [
    new RegExp(
      `<meta[^>]+${escapedAttribute}=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${escapedAttribute}=["']${escapedKey}["'][^>]*>`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function extractWebsitePreviewImage(html, responseUrl) {
  const metaCandidates = [
    extractMetaTagContent(html, 'property', 'og:image:secure_url'),
    extractMetaTagContent(html, 'property', 'og:image:url'),
    extractMetaTagContent(html, 'property', 'og:image'),
    extractMetaTagContent(html, 'name', 'twitter:image'),
    extractMetaTagContent(html, 'name', 'twitter:image:src'),
  ];

  for (const candidate of metaCandidates) {
    const normalized = normalizeAbsoluteHttpUrl(candidate, responseUrl);
    if (normalized) {
      return normalized;
    }
  }

  const imageTagPattern = /<img[^>]+(?:data-lazy-src|data-src|src)=["']([^"']+)["'][^>]*>/gi;
  let imageMatch = imageTagPattern.exec(html);
  while (imageMatch) {
    const normalized = normalizeAbsoluteHttpUrl(imageMatch[1], responseUrl);
    const lowered = normalized?.toLowerCase() ?? '';
    if (
      normalized &&
      !lowered.startsWith('data:') &&
      !lowered.endsWith('.svg') &&
      !lowered.includes('/logo') &&
      !lowered.includes('logo-') &&
      !lowered.includes('/icon') &&
      !lowered.includes('placeholder')
    ) {
      return normalized;
    }
    imageMatch = imageTagPattern.exec(html);
  }

  return null;
}

const previewImageCache = new Map();

async function fetchPreviewImageFromPage(url) {
  const normalizedUrl = normalizeAbsoluteHttpUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  const existing = previewImageCache.get(normalizedUrl);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      const response = await fetch(normalizedUrl, {
        redirect: 'follow',
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'Pineapple/1.0 (+https://pinapple-dev.pages.dev)',
        },
      });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('html')) {
        return null;
      }

      const html = await response.text();
      return extractWebsitePreviewImage(html, response.url || normalizedUrl);
    } catch {
      return null;
    }
  })();

  previewImageCache.set(normalizedUrl, task);
  return task;
}

function getRawCategoryLabel(detail, searchItem) {
  const nestedNames = [];
  for (const entry of [...(detail?.subcategory ?? []), ...(searchItem?.subcategory ?? [])]) {
    if (entry?.name) {
      nestedNames.push(entry.name);
    }
  }

  return (
    pickFirstString(
      nestedNames[0],
      detail?.category?.name,
      searchItem?.category?.name,
      searchItem?.subcategory?.[0]?.name,
    ) ?? null
  );
}

function mapDisplayCategory(vibeCategory, rawLabel) {
  const normalized = cleanText(rawLabel)?.toLowerCase() ?? '';

  if (normalized.includes('museum')) return 'Museum';
  if (normalized.includes('beach')) return 'Beach';
  if (normalized.includes('landmark')) return 'Landmark';
  if (normalized.includes('gallery')) return 'Gallery';
  if (normalized.includes('park')) return 'Park';
  if (normalized.includes('cafe') || normalized.includes('coffee')) return 'Cafe';
  if (normalized.includes('bar') || normalized.includes('pub') || normalized.includes('cocktail')) return 'Bar';
  if (normalized.includes('restaurant') || normalized.includes('dining')) return 'Restaurant';
  if (normalized.includes('tour') || normalized.includes('cruise') || normalized.includes('experience')) return 'Experience';
  if (normalized.includes('activity')) return 'Activity';

  switch (vibeCategory) {
    case 'eat':
      return 'Restaurant';
    case 'drink':
      return 'Bar';
    case 'visit':
      return 'Attraction';
    case 'do':
      return 'Experience';
    default:
      return 'Place';
  }
}

async function tripadvisorRequest(path, params, apiKey, allowedDomain) {
  const requestParams = new URLSearchParams({
    key: apiKey,
    language: 'en',
    ...params,
  });

  const response = await fetch(`${TRIPADVISOR_BASE_URL}${path}?${requestParams.toString()}`, {
    headers: {
      accept: 'application/json',
      origin: `https://${allowedDomain}`,
      referer: `https://${allowedDomain}/`,
    },
  });

  if (!response.ok) {
    throw new Error(`TRIPADVISOR_REQUEST_FAILED:${response.status}`);
  }

  return response.json();
}

async function fetchLocationDetails(locationId, apiKey, allowedDomain) {
  try {
    return await tripadvisorRequest(`/location/${locationId}/details`, { currency: 'GBP' }, apiKey, allowedDomain);
  } catch {
    return null;
  }
}

async function fetchLocationPhotos(locationId, apiKey, allowedDomain) {
  try {
    return await tripadvisorRequest(`/location/${locationId}/photos`, { limit: '5' }, apiKey, allowedDomain);
  } catch {
    return null;
  }
}

function buildCandidateTexts(searchItem, detail) {
  return {
    nameText: [searchItem?.name, detail?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    addressText: [
      searchItem?.address_obj?.address_string,
      detail?.address_obj?.address_string,
      searchItem?.address_string,
      detail?.address_string,
      detail?.location_string,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function scoreTripadvisorCandidate(searchItem, detail, areaContext) {
  const { nameText, addressText } = buildCandidateTexts(searchItem, detail);
  let score = 0;
  let addressMatches = 0;

  if (areaContext.primaryLabel && addressText.includes(areaContext.primaryLabel)) {
    score += 90;
    addressMatches += 1;
  } else if (areaContext.primaryLabel && nameText.includes(areaContext.primaryLabel)) {
    score += 12;
  }

  for (const token of areaContext.tokens) {
    if (addressText.includes(token)) {
      score += token === areaContext.primaryLabel ? 30 : 18;
      addressMatches += 1;
    } else if (nameText.includes(token)) {
      score += token === areaContext.primaryLabel ? 4 : 2;
    }
  }

  if (searchItem?.address_obj?.address_string || detail?.address_obj?.address_string) {
    score += 12;
  }

  if (searchItem?.rating || detail?.rating) {
    score += 8;
  }

  if (addressText && addressMatches === 0 && areaContext.tokens.length) {
    score -= 40;
  }

  return score;
}

function mapTripadvisorItem(searchItem, detail, photosPayload, vibeCategory, area) {
  const rawCategoryLabel = getRawCategoryLabel(detail, searchItem);
  const ranking =
    pickFirstString(detail?.ranking_data?.ranking_string, detail?.ranking, searchItem?.ranking) ?? null;

  return {
    id: String(searchItem.location_id),
    name: cleanText(detail?.name) ?? cleanText(searchItem.name),
    category: vibeCategory,
    displayCategory: mapDisplayCategory(vibeCategory, rawCategoryLabel),
    address:
      pickFirstString(
        detail?.address_obj?.address_string,
        detail?.address_string,
        searchItem?.address_obj?.address_string,
        searchItem?.address_string,
        searchItem?.distance_string,
      ) ?? area,
    rating: pickFirstString(detail?.rating, searchItem?.rating),
    ranking,
    tripadvisorUrl: pickFirstString(detail?.web_url, searchItem?.web_url),
    websiteUrl: pickFirstString(detail?.website),
    imageUrl: pickImageUrl(detail) ?? pickImageUrl(searchItem) ?? pickImageUrl(photosPayload?.data?.[0]) ?? pickImageUrl(photosPayload),
  };
}

async function fetchTripadvisorCategory(areaContext, vibeCategory, apiKey, allowedDomain) {
  const config = vibeSearchMap[vibeCategory];
  const payload = await tripadvisorRequest(
    '/location/search',
    {
      searchQuery: `${areaContext.area} ${config.searchSuffix}`,
      category: config.category,
    },
    apiKey,
    allowedDomain,
  );

  const items = Array.isArray(payload?.data) ? payload.data : [];
  const scoredItems = items
    .filter((item) => item?.location_id && item?.name)
    .map((item) => ({
      item,
      score: scoreTripadvisorCandidate(item, null, areaContext),
    }))
    .sort((left, right) => right.score - left.score);
  const primaryCandidates = scoredItems.filter((entry) => entry.score > 0);
  const trimmed = (primaryCandidates.length ? primaryCandidates : scoredItems)
    .slice(0, RESULTS_PER_BUCKET + 4)
    .map((entry) => entry.item);
  const details = await Promise.all(trimmed.map((item) => fetchLocationDetails(item.location_id, apiKey, allowedDomain)));
  const photos = await Promise.all(
    trimmed.map((item, index) =>
      pickImageUrl(details[index]) || pickImageUrl(item)
        ? Promise.resolve(null)
        : fetchLocationPhotos(item.location_id, apiKey, allowedDomain),
    ),
  );
  const seen = new Set();

  const rankedItems = trimmed
    .map((item, index) => ({
      score: scoreTripadvisorCandidate(item, details[index], areaContext),
      item: mapTripadvisorItem(item, details[index], photos[index], vibeCategory, areaContext.area),
    }))
    .sort((left, right) => right.score - left.score)
    .filter((entry, index) => entry.score >= 30 || index < RESULTS_PER_BUCKET)
    .map((entry) => entry.item)
    .filter((item) => item?.id && item?.name)
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    })
    .slice(0, RESULTS_PER_BUCKET);

  const websiteFallbackTargets = rankedItems
    .filter((item) => !item.imageUrl && (item.websiteUrl || item.tripadvisorUrl))
    .slice(0, 8);
  await Promise.all(
    websiteFallbackTargets.map(async (item) => {
      const previewImage =
        (item.websiteUrl ? await fetchPreviewImageFromPage(item.websiteUrl) : null) ||
        (item.tripadvisorUrl ? await fetchPreviewImageFromPage(item.tripadvisorUrl) : null);
      if (previewImage) {
        item.imageUrl = previewImage;
      }
    }),
  );

  return rankedItems;
}

async function handleVibes(request, env) {
  const apiKey = env.TRIPADVISOR_API_KEY?.trim();
  const allowedDomain = sanitizeAllowedDomain(env.TRIPADVISOR_ALLOWED_DOMAIN?.trim());

  if (!apiKey) {
    return json(
      {
        error: 'Vibes is not configured for live suggestions yet.',
      },
      503,
    );
  }

  const url = new URL(request.url);
  const destination = url.searchParams.get('destination')?.trim() || '';
  const hotelCity = url.searchParams.get('hotelCity')?.trim() || null;
  const hotelCountry = url.searchParams.get('hotelCountry')?.trim() || null;

  if (!destination) {
    return json({ error: 'Destination is required for live Vibes suggestions.' }, 400);
  }

  const areaContext = buildAreaContext(destination, hotelCity, hotelCountry);

  try {
    const [eat, drink, visit, doItems] = await Promise.all([
      fetchTripadvisorCategory(areaContext, 'eat', apiKey, allowedDomain),
      fetchTripadvisorCategory(areaContext, 'drink', apiKey, allowedDomain),
      fetchTripadvisorCategory(areaContext, 'visit', apiKey, allowedDomain),
      fetchTripadvisorCategory(areaContext, 'do', apiKey, allowedDomain),
    ]);

    return json({
      area: areaContext.area,
      fetchedAt: new Date().toISOString(),
      eat,
      drink,
      visit,
      do: doItems,
      source: 'tripadvisor',
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('TRIPADVISOR_REQUEST_FAILED:')) {
      const status = Number.parseInt(error.message.split(':')[1] || '502', 10);
      return json(
        {
          error: 'Live suggestions are temporarily unavailable.',
        },
        status >= 400 && status < 600 ? status : 502,
      );
    }

    return json({ error: 'Unable to load live Vibes suggestions right now.' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/api/vibes') {
      return json({}, 204);
    }

    if (request.method === 'GET' && url.pathname === '/api/vibes') {
      return handleVibes(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
