import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { uuid } from '@/lib/validation';

// Shared plumbing for the public feeds client websites read. They run as the anonymous role and can
// only reach the public_* database functions, which return published content only.

let anon: SupabaseClient | null = null;
export function publicDb(): SupabaseClient {
  anon ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return anon;
}

export const fileUrl = (mediaId: string) => new URL(`/api/public/v1/files/${mediaId}`, env.PORTAL_URL).toString();

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // Client sites cache these themselves and are told when to refresh; don't let a CDN serve stale data.
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Robots-Tag': 'noindex',
  'X-Content-Type-Options': 'nosniff',
};

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });
export const notFound = () => json({ error: 'Not found' }, 404);
export const preflight = () => new Response(null, { status: 204, headers: { ...HEADERS, 'Access-Control-Max-Age': '86400' } });

// Best-effort per-instance limit (a Vercel Firewall rule on /api/public gives a hard one).
const hits = new Map<string, number[]>();
export function limited(request: Request, perMinute = 120) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 60_000) hits.delete(k);
  return recent.length > perMinute ? json({ error: 'Too many requests' }, 429) : null;
}

export const validSite = (id: string) => uuid.safeParse(id).success;
