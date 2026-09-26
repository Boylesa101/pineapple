import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Asana sync state for the agency pages. RLS lets only the agency read integration jobs.

export const asanaTaskUrl = (gid: string) => `https://app.asana.com/0/0/${gid}/f`;
export const asanaProjectUrl = (gid: string) => `https://app.asana.com/0/${gid}/board`;

export type SyncJob = {
  id: number; action: string; entity_id: string; status: 'pending' | 'processing' | 'done' | 'failed';
  attempts: number; last_error: string | null; next_attempt_at: string; updated_at: string; org_id: string | null;
};

export const ACTION_LABELS: Record<string, string> = {
  ensure_project: 'Set up Asana project',
  upsert_briefing_task: 'Briefing task',
  upsert_section_task: 'Content task',
  section_reopened: 'Reopened note',
  briefing_reopened: 'Briefing reopened note',
  revalidate_site: 'Website refresh',
};

const JOB_COLUMNS = 'id, action, entity_id, status, attempts, last_error, next_attempt_at, updated_at, org_id';

export async function loadClientSync(orgId: string) {
  const supabase = await createClient();
  const [{ data: sections }, { data: briefing }, { data: jobs }] = await Promise.all([
    supabase.from('content_sections').select('id, asana_task_gid').eq('org_id', orgId),
    supabase.from('briefings').select('asana_task_gid').eq('org_id', orgId).maybeSingle(),
    supabase.from('integration_events').select(JOB_COLUMNS).eq('org_id', orgId)
      .order('id', { ascending: false }).limit(50),
  ]);
  const all = (jobs ?? []) as SyncJob[];
  const stateFor = (entityId: string, taskGid: string | null | undefined): SyncBadge => {
    // A failure only counts until a later job for the same thing has gone through.
    const lastDone = Math.max(0, ...all.filter((j) => j.entity_id === entityId && j.status === 'done').map((j) => j.id));
    const mine = all.filter((j) => j.entity_id === entityId && j.status !== 'done' && !(j.status === 'failed' && j.id < lastDone));
    if (mine.some((j) => j.status === 'failed')) return { kind: 'failed', taskGid };
    if (mine.length) return { kind: 'waiting', taskGid };
    return taskGid ? { kind: 'synced', taskGid } : { kind: 'none' };
  };
  const taskOf = new Map((sections ?? []).map((s) => [s.id as string, s.asana_task_gid as string | null]));
  return {
    jobs: (jobs ?? []) as SyncJob[],
    section: (id: string) => stateFor(id, taskOf.get(id)),
    briefing: stateFor(orgId, briefing?.asana_task_gid),
  };
}

export type SyncBadge = { kind: 'synced' | 'waiting' | 'failed' | 'none'; taskGid?: string | null };

export async function loadSyncProblems() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integration_events')
    .select(`${JOB_COLUMNS}, organisations (name)`)
    .in('status', ['failed', 'pending', 'processing'])
    .order('id', { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as (SyncJob & { organisations: { name: string } | null })[];
}
