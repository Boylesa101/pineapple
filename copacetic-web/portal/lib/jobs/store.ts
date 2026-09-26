import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Job, JobStore } from './types';

// The worker's database access, as the service role (secret key).
export function supabaseJobStore(db: SupabaseClient, providers: string[] = ['asana', 'website']): JobStore {
  const must = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
    if (error) throw new Error(`Database: ${error.message}`);
    return data;
  };
  const orgName = (row: { organisations?: unknown }) =>
    (row.organisations as { name?: string } | null)?.name ?? 'Client';

  return {
    async claim(limit) {
      return (must(await db.rpc('claim_integration_events', { p_limit: limit, p_providers: providers })) ?? []) as Job[];
    },
    async complete(id) {
      must(await db.from('integration_events')
        .update({ status: 'done', done_at: new Date().toISOString(), locked_at: null, last_error: null, updated_at: new Date().toISOString() })
        .eq('id', id));
    },
    async reschedule(id, at, error) {
      const res = await db.from('integration_events')
        .update({ status: 'pending', next_attempt_at: at.toISOString(), locked_at: null, last_error: error, updated_at: new Date().toISOString() })
        .eq('id', id);
      // A newer job for the same thing is already waiting and will redo this work: retire this one.
      if (res.error?.code === '23505') {
        must(await db.from('integration_events')
          .update({ status: 'done', done_at: new Date().toISOString(), locked_at: null, last_error: 'Superseded by a newer job' })
          .eq('id', id));
        return;
      }
      must(res);
    },
    async fail(id, error) {
      must(await db.from('integration_events')
        .update({ status: 'failed', locked_at: null, last_error: error, updated_at: new Date().toISOString() })
        .eq('id', id));
    },

    async site(id) {
      const row = must(await db.from('sites')
        .select('id, org_id, name, asana_project_gid, asana_sections, organisations (name)').eq('id', id).maybeSingle());
      if (!row) return null;
      return {
        id: row.id, orgId: row.org_id, name: row.name, orgName: orgName(row),
        projectGid: row.asana_project_gid, sections: (row.asana_sections ?? {}) as Record<string, string>,
      };
    },
    async saveSiteAsana(id, projectGid, sections) {
      must(await db.from('sites').update({ asana_project_gid: projectGid, asana_sections: sections }).eq('id', id));
    },
    async orgProject(orgId) {
      const row = must(await db.from('sites')
        .select('asana_project_gid, asana_sections').eq('org_id', orgId).not('asana_project_gid', 'is', null)
        .order('created_at').limit(1).maybeSingle());
      return row ? { projectGid: row.asana_project_gid as string, sections: (row.asana_sections ?? {}) as Record<string, string> } : null;
    },
    async section(id) {
      const row = must(await db.from('content_sections')
        .select('id, org_id, type, title, status, asana_task_gid, submitted_at, organisations (name)').eq('id', id).maybeSingle());
      if (!row) return null;
      return {
        id: row.id, orgId: row.org_id, orgName: orgName(row), type: row.type, title: row.title,
        status: row.status, taskGid: row.asana_task_gid, submittedAt: row.submitted_at,
      };
    },
    async setSectionTask(id, gid) {
      must(await db.from('content_sections').update({ asana_task_gid: gid }).eq('id', id));
    },
    async briefing(orgId) {
      const row = must(await db.from('briefings')
        .select('org_id, status, asana_task_gid, submitted_at, organisations (name)').eq('org_id', orgId).maybeSingle());
      if (!row) return null;
      return { orgId: row.org_id, orgName: orgName(row), status: row.status, taskGid: row.asana_task_gid, submittedAt: row.submitted_at };
    },
    async setBriefingTask(orgId, gid) {
      must(await db.from('briefings').update({ asana_task_gid: gid }).eq('org_id', orgId));
    },

    async siteTarget(siteId) {
      const rows = must(await db.rpc('site_revalidate_target', { p_site: siteId })) as { url: string; secret: string }[] | null;
      return rows?.[0] ?? null;
    },

    async webhook(projectGid) {
      const secret = must(await db.rpc('asana_webhook_secret', { p_project: projectGid })) as string | null;
      const gid = must(await db.rpc('asana_webhook_gid', { p_project: projectGid })) as string | null;
      if (secret == null && gid == null) return null;
      return { webhookGid: gid, hasSecret: !!secret };
    },
    async openHandshake(projectGid) {
      return must(await db.rpc('open_asana_handshake', { p_project: projectGid })) as string;
    },
    async setWebhookGid(projectGid, webhookGid) {
      must(await db.rpc('set_asana_webhook_gid', { p_project: projectGid, p_webhook: webhookGid }));
    },
  };
}
