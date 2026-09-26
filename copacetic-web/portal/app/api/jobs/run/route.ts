import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { runDueJobs } from '@/lib/jobs';

// Called every minute by Supabase (pg_cron + pg_net) when jobs are due, with the shared JOBS_SECRET.
export const maxDuration = 60;

const digest = (s: string) => createHash('sha256').update(s).digest();

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // Hash both sides so the comparison is constant-time whatever the lengths.
  if (!env.JOBS_SECRET || !token || !timingSafeEqual(digest(token), digest(env.JOBS_SECRET))) {
    return new Response(null, { status: 401 });
  }
  const result = await runDueJobs({ budgetMs: 45_000 });
  return Response.json(result ?? { skipped: 'Asana sync is not configured' });
}
