// A small Asana REST client. Kept free of server-only imports so tests can drive it with a fake fetch.
// Only the job worker and the webhook route use it, both on the server with ASANA_TOKEN.

const BASE = 'https://app.asana.com/api/1.0';

export class AsanaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AsanaError';
  }
  // 400s mean the request itself is wrong; retrying won't help. Everything else (401/403 while a token
  // is being fixed, 404 during a race, 429, 5xx, network) is worth another try.
  get permanent() {
    return this.status === 400;
  }
}

type Json = Record<string, unknown>;
type Page<T> = { data: T[]; next_page?: { offset: string } | null };

export type Asana = ReturnType<typeof asanaClient>;

export function asanaClient(token: string, fetchImpl: typeof fetch = fetch) {
  // Returns the whole JSON envelope ({ data, next_page }) or undefined for 204.
  async function request<T>(method: string, path: string, body?: Json): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify({ data: body }) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new AsanaError(`Asana unreachable: ${e instanceof Error ? e.message : 'network error'}`, 0);
    }
    if (!res.ok) {
      const retry = Number(res.headers.get('retry-after'));
      let detail = '';
      try {
        const j = (await res.json()) as { errors?: { message?: string }[] };
        detail = j.errors?.map((x) => x.message).filter(Boolean).join('; ') ?? '';
      } catch {
        // not JSON
      }
      throw new AsanaError(
        `Asana ${method} ${path.split('?')[0]} failed (${res.status})${detail ? `: ${detail}` : ''}`.slice(0, 500),
        res.status,
        Number.isFinite(retry) && retry > 0 ? retry : undefined,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const call = async <T>(method: string, path: string, body?: Json) =>
    (await request<{ data: T } | undefined>(method, path, body))?.data as T;

  // Follows Asana's offset pagination until `match` returns true for an item or the pages run out.
  async function find<T>(path: string, match: (item: T) => boolean): Promise<T | undefined> {
    let offset: string | undefined;
    for (let page = 0; page < 50; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const res = await request<Page<T>>('GET', `${path}${sep}limit=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`);
      const hit = res.data.find(match);
      if (hit) return hit;
      offset = res.next_page?.offset;
      if (!offset) return undefined;
    }
    return undefined;
  }

  return {
    get: <T>(path: string) => call<T>('GET', path),
    post: <T>(path: string, body: Json) => call<T>('POST', path, body),
    put: <T>(path: string, body: Json) => call<T>('PUT', path, body),
    del: (path: string) => call<void>('DELETE', path),
    find,
  };
}

export const isGid = (v: unknown): v is string => typeof v === 'string' && /^[0-9]{1,30}$/.test(v);
