const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';

const vibeSearchMap = {
  eat: { category: 'restaurants', searchSuffix: 'restaurants' },
  visit: { category: 'attractions', searchSuffix: 'landmarks' },
  do: { category: 'attractions', searchSuffix: 'things to do' },
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

async function fetchTripadvisorCategory(area, vibeCategory, apiKey, allowedDomain) {
  const config = vibeSearchMap[vibeCategory];
  const params = new URLSearchParams({
    key: apiKey,
    language: 'en',
    searchQuery: `${area} ${config.searchSuffix}`,
    category: config.category,
  });

  const response = await fetch(`${TRIPADVISOR_BASE_URL}/location/search?${params.toString()}`, {
    headers: {
      accept: 'application/json',
      origin: `https://${allowedDomain}`,
      referer: `https://${allowedDomain}/`,
      'user-agent': 'Pineapple Vibes Proxy/1.0 (+https://pinapple-dev.pages.dev)',
    },
  });

  if (!response.ok) {
    throw new Error(`TRIPADVISOR_REQUEST_FAILED:${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items
    .filter((item) => item.location_id && item.name)
    .slice(0, 5)
    .map((item) => ({
      id: String(item.location_id),
      name: item.name,
      category: vibeCategory,
      address: item.address_obj?.address_string || item.address_string || item.distance_string || 'Address not listed',
      rating: item.rating ? String(item.rating) : null,
      ranking: item.ranking ?? null,
      webUrl: item.web_url ?? null,
    }));
}

async function handleVibes(request, env) {
  const apiKey = env.TRIPADVISOR_API_KEY?.trim();
  const allowedDomain = env.TRIPADVISOR_ALLOWED_DOMAIN?.trim() || 'pinapple-dev.pages.dev';

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
    const [eat, visit, doItems] = await Promise.all([
      fetchTripadvisorCategory(area, 'eat', apiKey, allowedDomain),
      fetchTripadvisorCategory(area, 'visit', apiKey, allowedDomain),
      fetchTripadvisorCategory(area, 'do', apiKey, allowedDomain),
    ]);

    return json({
      area,
      eat,
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
