const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';
const RESULTS_PER_BUCKET = 5;

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

function pickImageUrl(payload) {
  const candidates = [
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

  return candidates.find((candidate) => cleanText(candidate)) ?? null;
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

function mapTripadvisorItem(searchItem, detail, vibeCategory, area) {
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
    imageUrl: pickImageUrl(detail) ?? pickImageUrl(searchItem),
  };
}

async function fetchTripadvisorCategory(area, vibeCategory, apiKey, allowedDomain) {
  const config = vibeSearchMap[vibeCategory];
  const payload = await tripadvisorRequest(
    '/location/search',
    {
      searchQuery: `${area} ${config.searchSuffix}`,
      category: config.category,
    },
    apiKey,
    allowedDomain,
  );

  const items = Array.isArray(payload?.data) ? payload.data : [];
  const trimmed = items.filter((item) => item?.location_id && item?.name).slice(0, RESULTS_PER_BUCKET + 2);
  const details = await Promise.all(trimmed.map((item) => fetchLocationDetails(item.location_id, apiKey, allowedDomain)));
  const seen = new Set();

  return trimmed
    .map((item, index) => mapTripadvisorItem(item, details[index], vibeCategory, area))
    .filter((item) => item?.id && item?.name)
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    })
    .slice(0, RESULTS_PER_BUCKET);
}

async function handleVibes(request, env) {
  const apiKey = env.TRIPADVISOR_API_KEY?.trim();
  const allowedDomain = sanitizeAllowedDomain(env.TRIPADVISOR_ALLOWED_DOMAIN?.trim());

  if (!apiKey) {
    return json(
      {
        error:
          'Tripadvisor is not configured on the Pineapple Cloudflare site yet. Add the TRIPADVISOR_API_KEY Pages secret to enable Vibes.',
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

  const area = buildAreaQuery(destination, hotelCity, hotelCountry);

  try {
    const [eat, drink, visit, doItems] = await Promise.all([
      fetchTripadvisorCategory(area, 'eat', apiKey, allowedDomain),
      fetchTripadvisorCategory(area, 'drink', apiKey, allowedDomain),
      fetchTripadvisorCategory(area, 'visit', apiKey, allowedDomain),
      fetchTripadvisorCategory(area, 'do', apiKey, allowedDomain),
    ]);

    return json({
      area,
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
          error: `Tripadvisor request failed (${status}). Check the Cloudflare domain allowlist and API key configuration.`,
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
