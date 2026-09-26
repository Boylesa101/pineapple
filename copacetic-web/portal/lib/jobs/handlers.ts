import { AsanaError, isGid, type Asana } from '@/lib/asana/client';
import { ASANA_SECTIONS, briefingTask, hasMarker, marker, projectFields, sectionTask } from '@/lib/asana/content';
import type { Job, JobConfig, JobStore } from './types';

export type Deps = { store: JobStore; asana: Asana; config: JobConfig; fetchImpl?: typeof fetch };

// Thrown when a job has to wait for another (e.g. a task before its project exists). Always retried.
export class NotReady extends Error {}

type Gid = { gid: string };
type WithNotes = Gid & { notes?: string };

const clientLink = (c: JobConfig, orgId: string, path = '') => `${c.portalUrl}/admin/clients/${orgId}${path}`;
const is404 = (e: unknown) => e instanceof AsanaError && e.status === 404;

// ------------------------------------------------------------------ project --
async function ensureProject(job: Job, { store, asana, config }: Deps) {
  const site = await store.site(job.entity_id);
  if (!site) return; // deleted since

  let project = site.projectGid;
  let sections = { ...site.sections };
  if (!project) {
    const m = marker('site', site.id);
    // A create that timed out may still have worked: look for it before making another.
    const existing = await asana.find<WithNotes>(
      `/teams/${config.teamGid}/projects?archived=false&opt_fields=notes`, (p) => hasMarker(p.notes, m));
    project = existing?.gid ?? (await asana.post<Gid>('/projects', {
      ...projectFields({ orgName: site.orgName, siteName: site.name, siteId: site.id, portalLink: clientLink(config, site.orgId) }),
      team: config.teamGid,
      default_view: 'board',
      ...(config.assigneeGid ? { owner: config.assigneeGid } : {}),
    })).gid;
    sections = {};
    await store.saveSiteAsana(site.id, project, sections);
  }

  const missing = ASANA_SECTIONS.filter((n) => !isGid(sections[n]));
  if (missing.length) {
    const existing = await asana.get<(Gid & { name: string })[]>(`/projects/${project}/sections?opt_fields=name`);
    for (const name of missing) {
      sections[name] = existing.find((s) => s.name === name)?.gid
        ?? (await asana.post<Gid>(`/projects/${project}/sections`, { name })).gid;
    }
    await store.saveSiteAsana(site.id, project, sections);
  }

  if (config.webhookUrl) await ensureWebhook(project, { store, asana, config });
}

async function ensureWebhook(project: string, { store, asana, config }: Deps) {
  const hook = await store.webhook(project);
  if (hook?.webhookGid && hook.hasSecret) return;
  const target = `${config.webhookUrl}?project=${project}`;
  const create = async () => {
    // Asana calls our endpoint with the secret while this request is in flight; the window lets
    // the endpoint accept it once.
    await store.openHandshake(project);
    return asana.post<Gid>('/webhooks', {
      resource: project,
      target,
      filters: [{ resource_type: 'task', action: 'changed', fields: ['completed'] }],
    });
  };
  let created: Gid;
  try {
    created = await create();
  } catch (e) {
    // One already exists for this target (e.g. we lost its secret): replace it.
    const old = await asana.find<Gid & { target?: string }>(
      `/webhooks?workspace=${config.workspaceGid}&resource=${project}&opt_fields=target`, (w) => w.target === target);
    if (!old) throw e;
    await asana.del(`/webhooks/${old.gid}`);
    created = await create();
  }
  await store.setWebhookGid(project, created.gid);
}

// -------------------------------------------------------------------- tasks --
async function upsertTask(
  asana: Asana,
  o: {
    projectGid: string; sectionGid: string; existingGid: string | null; marker: string;
    fields: { name: string; html_notes: string }; completed: boolean; assigneeGid?: string;
  },
): Promise<{ gid: string; created: boolean }> {
  const update = { ...o.fields, completed: o.completed };
  if (o.existingGid) {
    try {
      await asana.put(`/tasks/${o.existingGid}`, update);
      return { gid: o.existingGid, created: false };
    } catch (e) {
      if (!is404(e)) throw e; // deleted in Asana: make a new one below
    }
  }
  const found = await asana.find<WithNotes>(`/projects/${o.projectGid}/tasks?opt_fields=notes`, (t) => hasMarker(t.notes, o.marker));
  if (found) {
    await asana.put(`/tasks/${found.gid}`, update);
    return { gid: found.gid, created: false };
  }
  const task = await asana.post<Gid>('/tasks', {
    ...update,
    memberships: [{ project: o.projectGid, section: o.sectionGid }],
    ...(o.assigneeGid ? { assignee: o.assigneeGid } : {}),
  });
  return { gid: task.gid, created: true };
}

async function projectFor(orgId: string, sectionName: string, store: JobStore) {
  const p = await store.orgProject(orgId);
  const sectionGid = p?.sections[sectionName];
  if (!p || !isGid(sectionGid)) throw new NotReady('The client’s Asana project isn’t set up yet.');
  return { projectGid: p.projectGid, sectionGid };
}

async function upsertSectionTask(job: Job, { store, asana, config }: Deps) {
  const s = await store.section(job.entity_id);
  if (!s || s.status === 'draft') return; // deleted, or reopened again before we got to it
  const { projectGid, sectionGid } = await projectFor(s.orgId, 'Content', store);
  const res = await upsertTask(asana, {
    projectGid, sectionGid, existingGid: s.taskGid, marker: marker('section', s.id),
    fields: sectionTask({ ...s, link: clientLink(config, s.orgId, '/content') }),
    completed: s.status === 'approved',
    assigneeGid: config.assigneeGid,
  });
  if (res.gid !== s.taskGid) await store.setSectionTask(s.id, res.gid);
  if (s.taskGid && !res.created && s.status === 'submitted') {
    await asana.post(`/tasks/${res.gid}/stories`, { text: 'Resubmitted in the client portal.' });
  }
}

async function upsertBriefingTask(job: Job, { store, asana, config }: Deps) {
  const b = await store.briefing(job.entity_id);
  if (!b || b.status === 'draft') return;
  const { projectGid, sectionGid } = await projectFor(b.orgId, 'Briefing', store);
  const res = await upsertTask(asana, {
    projectGid, sectionGid, existingGid: b.taskGid, marker: marker('briefing', b.orgId),
    fields: briefingTask({ ...b, link: clientLink(config, b.orgId, '/briefing') }),
    completed: false,
    assigneeGid: config.assigneeGid,
  });
  if (res.gid !== b.taskGid) await store.setBriefingTask(b.orgId, res.gid);
  if (b.taskGid && !res.created) await asana.post(`/tasks/${res.gid}/stories`, { text: 'Resubmitted in the client portal.' });
}

async function reopened(taskGid: string | null, what: string, asana: Asana) {
  if (!taskGid) return; // never reached Asana: nothing to note
  try {
    await asana.put(`/tasks/${taskGid}`, { completed: false });
    await asana.post(`/tasks/${taskGid}/stories`, { text: `The ${what} was reopened for changes in the client portal.` });
  } catch (e) {
    if (!is404(e)) throw e;
  }
}

// ----------------------------------------------------------- client websites --
// Tell a client's site (Next.js) to refetch its portal content. The site's /api/revalidate checks
// the shared secret and calls revalidateTag for each tag.
export const SITE_TAGS = ['portal:posts', 'portal:opening-times', 'portal:documents'];

async function revalidateSite(job: Job, { store, fetchImpl = fetch }: Deps) {
  const target = await store.siteTarget(job.entity_id);
  if (!target) return; // no website set up (or removed since)
  const url = new URL('/api/revalidate', target.url);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${target.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: SITE_TAGS }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new Error(`Website unreachable: ${e instanceof Error ? e.message : 'network error'}`);
  }
  if (!res.ok) throw new Error(`Website refresh failed (${res.status}) at ${url.origin}`);
}

// ---------------------------------------------------------------- dispatch --
export async function handle(job: Job, deps: Deps) {
  switch (job.action) {
    case 'ensure_project':
      return ensureProject(job, deps);
    case 'upsert_section_task':
      return upsertSectionTask(job, deps);
    case 'upsert_briefing_task':
      return upsertBriefingTask(job, deps);
    case 'section_reopened': {
      const s = await deps.store.section(job.entity_id);
      return reopened(s?.taskGid ?? null, 'section', deps.asana);
    }
    case 'revalidate_site':
      return revalidateSite(job, deps);
    case 'briefing_reopened': {
      const b = await deps.store.briefing(job.entity_id);
      return reopened(b?.taskGid ?? null, 'briefing', deps.asana);
    }
    default:
      throw new Error(`Unknown job: ${String((job as Job).action)}`);
  }
}
