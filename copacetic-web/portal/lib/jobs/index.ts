import 'server-only';
import { after } from 'next/server';
import { asanaClient } from '@/lib/asana/client';
import { env } from '@/lib/env';
import { serviceClient } from '@/lib/supabase/service';
import { runJobs, type RunResult } from './run';
import { supabaseJobStore } from './store';

export const asanaConfigured = () =>
  !!(env.SUPABASE_SECRET_KEY && env.ASANA_TOKEN && env.ASANA_TEAM_GID && env.ASANA_WORKSPACE_GID);

// Asana can't deliver webhooks to localhost, so two-way sync only switches on for a real address.
const webhookUrl = () => {
  const u = new URL('/api/webhooks/asana', env.PORTAL_URL);
  return u.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname) ? u.toString() : undefined;
};

// Runs due Asana jobs. Safe to call from anywhere and any number of times at once: each job is
// claimed by exactly one caller. Never throws.
export async function runDueJobs(opts?: { budgetMs?: number }): Promise<RunResult | null> {
  const db = serviceClient();
  if (!db || !asanaConfigured()) return null;
  try {
    return await runJobs(
      {
        store: supabaseJobStore(db),
        asana: asanaClient(env.ASANA_TOKEN!),
        config: {
          teamGid: env.ASANA_TEAM_GID!,
          workspaceGid: env.ASANA_WORKSPACE_GID!,
          assigneeGid: env.ASANA_ASSIGNEE_GID,
          portalUrl: env.PORTAL_URL.replace(/\/$/, ''),
          webhookUrl: webhookUrl(),
        },
      },
      opts,
    );
  } catch (e) {
    console.error('[jobs] run failed', e instanceof Error ? e.message : e);
    return null;
  }
}

// Call after a change that queued jobs (a submission, a new client): runs them once the response
// has been sent, so Asana usually updates within seconds. The every-minute schedule catches the rest.
export function syncSoon() {
  if (asanaConfigured()) after(() => runDueJobs({ budgetMs: 15_000 }));
}
