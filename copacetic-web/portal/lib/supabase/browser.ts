import { createBrowserClient } from '@supabase/ssr';

// Only the publishable key reaches the browser; everything it can do is limited by RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
