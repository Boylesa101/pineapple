import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Acts as the service role and bypasses RLS. Only the job worker and the Asana webhook use it;
// never import this from anything that renders for a signed-in user.
let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  if (!env.SUPABASE_SECRET_KEY) return null;
  client ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
