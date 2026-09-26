import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { asanaClient, AsanaError } from '@/lib/asana/client';
import { escapeHtml, hasMarker, marker, sectionTask } from '@/lib/asana/content';
import { completedTaskChanges, statusFromTask, validSignature } from '@/lib/asana/webhook';
import { handle } from '@/lib/jobs/handlers';
import { nextAttemptAt, runJobs } from '@/lib/jobs/run';
import type { BriefingInfo, Job, JobConfig, JobStore, SectionInfo, SiteInfo } from '@/lib/jobs/types';

// ------------------------------------------------------------ fake Asana ---
type Task = { gid: string; name: string; html_notes: string; notes: string; completed: boolean; project: string; section: string; assignee?: string; stories: string[] };

function fakeAsana() {
  let next = 1000;
  const id = () => String(next++);
  const state = {
    projects: [] as { gid: string; name: string; notes: string; team: string; owner?: string }[],
    sections: [] as { gid: string; name: string; project: string }[],
    tasks: [] as Task[],
    webhooks: [] as { gid: string; resource: string; target: string }[],
    calls: [] as string[],
    failNext: [] as { match: RegExp; status: number; retryAfter?: number; afterwards?: () => void }[],
    // Called during POST /webhooks, like Asana's handshake request.
    onHandshake: null as null | ((target: string) => void),
  };
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/api/1.0', '');
    const method = init?.method ?? 'GET';
    state.calls.push(`${method} ${path}`);
    const fail = state.failNext.findIndex((f) => f.match.test(`${method} ${path}`));
    if (fail >= 0) {
      const [f] = state.failNext.splice(fail, 1);
      f.afterwards?.();
      return json(f.status, { errors: [{ message: 'boom' }] }, f.retryAfter ? { 'retry-after': String(f.retryAfter) } : {});
    }
    const data = init?.body ? (JSON.parse(String(init.body)).data as Record<string, unknown>) : {};
    let m: RegExpMatchArray | null;

    if (method === 'GET' && (m = path.match(/^\/teams\/(\d+)\/projects$/))) {
      return json(200, { data: state.projects.filter((p) => p.team === m![1]).map(({ gid, notes }) => ({ gid, notes })), next_page: null });
    }
    if (method === 'POST' && path === '/projects') {
      const p = { gid: id(), name: String(data.name), notes: String(data.notes), team: String(data.team), owner: data.owner as string };
      state.projects.push(p);
      return json(201, { data: { gid: p.gid } });
    }
    if (method === 'GET' && (m = path.match(/^\/projects\/(\d+)\/sections$/))) {
      return json(200, { data: state.sections.filter((s) => s.project === m![1]).map(({ gid, name }) => ({ gid, name })) });
    }
    if (method === 'POST' && (m = path.match(/^\/projects\/(\d+)\/sections$/))) {
      const s = { gid: id(), name: String(data.name), project: m[1] };
      state.sections.push(s);
      return json(201, { data: { gid: s.gid } });
    }
    if (method === 'GET' && (m = path.match(/^\/projects\/(\d+)\/tasks$/))) {
      return json(200, { data: state.tasks.filter((t) => t.project === m![1]).map(({ gid, notes }) => ({ gid, notes })), next_page: null });
    }
    if (method === 'POST' && path === '/tasks') {
      const mem = (data.memberships as { project: string; section: string }[])[0];
      const html = String(data.html_notes);
      const t: Task = {
        gid: id(), name: String(data.name), html_notes: html, notes: html.replace(/<[^>]+>/g, ' '),
        completed: !!data.completed, project: mem.project, section: mem.section, assignee: data.assignee as string, stories: [],
      };
      state.tasks.push(t);
      return json(201, { data: { gid: t.gid } });
    }
    if ((m = path.match(/^\/tasks\/(\d+)$/))) {
      const t = state.tasks.find((x) => x.gid === m![1]);
      if (!t) return json(404, { errors: [{ message: 'Not found' }] });
      if (method === 'PUT') {
        if (data.name !== undefined) t.name = String(data.name);
        if (data.html_notes !== undefined) { t.html_notes = String(data.html_notes); t.notes = t.html_notes.replace(/<[^>]+>/g, ' '); }
        if (data.completed !== undefined) t.completed = !!data.completed;
      }
      return json(200, { data: { gid: t.gid, completed: t.completed } });
    }
    if (method === 'POST' && (m = path.match(/^\/tasks\/(\d+)\/stories$/))) {
      state.tasks.find((x) => x.gid === m![1])!.stories.push(String(data.text));
      return json(201, { data: { gid: id() } });
    }
    if (method === 'POST' && path === '/webhooks') {
      state.onHandshake?.(String(data.target));
      if (state.webhooks.some((w) => w.resource === data.resource && w.target.split('&')[0] === String(data.target).split('&')[0])) {
        return json(403, { errors: [{ message: 'Duplicate webhook' }] });
      }
      const w = { gid: id(), resource: String(data.resource), target: String(data.target) };
      state.webhooks.push(w);
      return json(201, { data: { gid: w.gid } });
    }
    if (method === 'GET' && path === '/webhooks') {
      return json(200, { data: state.webhooks.map(({ gid, target }) => ({ gid, target })), next_page: null });
    }
    if (method === 'DELETE' && (m = path.match(/^\/webhooks\/(\d+)$/))) {
      state.webhooks = state.webhooks.filter((w) => w.gid !== m![1]);
      return json(200, { data: {} });
    }
    return json(404, { errors: [{ message: `unhandled ${method} ${path}` }] });
  }) as typeof fetch;

  return { state, asana: asanaClient('test-token', fetchImpl) };
}

// ------------------------------------------------------------ fake store ---
function fakeStore() {
  const s = {
    jobs: [] as (Job & { status: string; next?: Date; error?: string })[],
    sites: new Map<string, SiteInfo>(),
    sections: new Map<string, SectionInfo>(),
    briefings: new Map<string, BriefingInfo>(),
    hooks: new Map<string, { webhookGid: string | null; secret: string | null; open: boolean; nonce?: string }>(),
    targets: new Map<string, { url: string; secret: string }>(),
  };
  const store: JobStore = {
    async claim(limit) {
      const due = s.jobs.filter((j) => j.status === 'pending').slice(0, limit);
      due.forEach((j) => { j.status = 'processing'; j.attempts++; });
      return due.map(({ id, action, org_id, entity_id, attempts }) => ({ id, action, org_id, entity_id, attempts }));
    },
    async complete(id) { s.jobs.find((j) => j.id === id)!.status = 'done'; },
    async reschedule(id, at, error) { Object.assign(s.jobs.find((j) => j.id === id)!, { status: 'waiting', next: at, error }); },
    async fail(id, error) { Object.assign(s.jobs.find((j) => j.id === id)!, { status: 'failed', error }); },
    async site(id) { const x = s.sites.get(id); return x ? structuredClone(x) : null; },
    async saveSiteAsana(id, projectGid, sections) { Object.assign(s.sites.get(id)!, { projectGid, sections: { ...sections } }); },
    async orgProject(orgId) {
      const site = [...s.sites.values()].find((x) => x.orgId === orgId && x.projectGid);
      return site ? { projectGid: site.projectGid!, sections: site.sections } : null;
    },
    async section(id) { const x = s.sections.get(id); return x ? { ...x } : null; },
    async setSectionTask(id, gid) { s.sections.get(id)!.taskGid = gid; },
    async briefing(orgId) { const x = s.briefings.get(orgId); return x ? { ...x } : null; },
    async setBriefingTask(orgId, gid) { s.briefings.get(orgId)!.taskGid = gid; },
    async siteTarget(id) { return s.targets.get(id) ?? null; },
    async webhook(p) { const h = s.hooks.get(p); return h ? { webhookGid: h.webhookGid, hasSecret: !!h.secret } : null; },
    async openHandshake(p) {
      const nonce = `n${p}`;
      s.hooks.set(p, { ...(s.hooks.get(p) ?? { webhookGid: null, secret: null }), open: true, nonce });
      return nonce;
    },
    async setWebhookGid(p, g) { s.hooks.get(p)!.webhookGid = g; },
  };
  return { s, store };
}

const ORG = '10000000-0000-0000-0000-00000000000a';
const SITE = '20000000-0000-0000-0000-00000000000a';
const SEC = '30000000-0000-0000-0000-0000000000a1';
const config: JobConfig = {
  teamGid: '42', workspaceGid: '7', assigneeGid: '99', portalUrl: 'https://portal.test',
  webhookUrl: 'https://portal.test/api/webhooks/asana',
};

function setup() {
  const { state, asana } = fakeAsana();
  const { s, store } = fakeStore();
  s.sites.set(SITE, { id: SITE, orgId: ORG, orgName: 'Firm A LLP', name: 'firm-a.co.uk', projectGid: null, sections: {} });
  s.sections.set(SEC, {
    id: SEC, orgId: ORG, orgName: 'Firm A LLP', type: 'service', title: 'Family law',
    status: 'submitted', taskGid: null, submittedAt: '2026-09-26T10:00:00Z',
  });
  s.briefings.set(ORG, { orgId: ORG, orgName: 'Firm A LLP', status: 'submitted', taskGid: null, submittedAt: '2026-09-26T10:00:00Z' });
  // Asana's handshake reaches our endpoint during webhook creation; accept it only while the window is open.
  state.onHandshake = (target) => {
    const url = new URL(target);
    const project = url.searchParams.get('project')!;
    const h = s.hooks.get(project);
    if (h?.open && h.nonce === url.searchParams.get('nonce')) Object.assign(h, { secret: 'shh', open: false });
  };
  let n = 1;
  const queue = (action: Job['action'], entity: string) =>
    s.jobs.push({ id: n++, action, org_id: ORG, entity_id: entity, attempts: 0, status: 'pending' });
  return { state, asana, s, store, queue, deps: { store, asana, config } };
}

// ----------------------------------------------------------------- tests ---
describe('Asana project set-up', () => {
  it('creates the project in the team, the five sections and the webhook', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    expect(await runJobs(t.deps)).toEqual({ done: 1, retrying: 0, failed: 0 });

    expect(t.state.projects).toHaveLength(1);
    const p = t.state.projects[0];
    expect(p).toMatchObject({ team: '42', owner: '99', name: 'Firm A LLP · firm-a.co.uk' });
    expect(hasMarker(p.notes, marker('site', SITE))).toBe(true);
    expect(t.state.sections.map((x) => x.name)).toEqual(['Briefing', 'Content', 'Build', 'Review', 'Launch']);
    expect(Object.keys(t.s.sites.get(SITE)!.sections)).toHaveLength(5);
    expect(t.state.webhooks).toEqual([
      expect.objectContaining({ resource: p.gid, target: `https://portal.test/api/webhooks/asana?project=${p.gid}&nonce=n${p.gid}` }),
    ]);
    expect(t.s.hooks.get(p.gid)).toMatchObject({ secret: 'shh', open: false });
  });

  it('is safe to run again, and finds a project whose create response was lost', async () => {
    const t = setup();
    // The create succeeds in Asana but we never hear back.
    t.state.failNext.push({
      match: /^POST \/projects$/, status: 503,
      afterwards: () => t.state.projects.push({ gid: '555', name: 'x', notes: `… ${marker('site', SITE)}`, team: '42' }),
    });
    t.queue('ensure_project', SITE);
    expect(await runJobs(t.deps)).toMatchObject({ retrying: 1 });
    t.s.jobs[0].status = 'pending';
    expect(await runJobs(t.deps)).toMatchObject({ done: 1 });
    expect(t.state.projects).toHaveLength(1);
    expect(t.s.sites.get(SITE)!.projectGid).toBe('555');

    t.queue('ensure_project', SITE);
    await runJobs(t.deps);
    expect(t.state.projects).toHaveLength(1);
    expect(t.state.sections).toHaveLength(5);
    expect(t.state.webhooks).toHaveLength(1);
  });

  it('replaces a webhook whose secret was lost, and ignores handshakes without the nonce', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    await runJobs(t.deps);
    const p = t.s.sites.get(SITE)!.projectGid!;
    const first = t.state.webhooks[0].gid;
    t.s.hooks.set(p, { webhookGid: null, secret: null, open: false }); // secret lost
    t.queue('ensure_project', SITE);
    await runJobs(t.deps);
    expect(t.state.webhooks).toHaveLength(1);
    expect(t.state.webhooks[0].gid).not.toBe(first);
    expect(t.s.hooks.get(p)).toMatchObject({ secret: 'shh' });

    // A handshake that doesn't carry the nonce Asana was given is refused.
    t.s.hooks.set(p, { webhookGid: null, secret: null, open: true, nonce: 'real' });
    t.state.onHandshake!(`https://portal.test/api/webhooks/asana?project=${p}&nonce=guess`);
    expect(t.s.hooks.get(p)!.secret).toBeNull();
  });

  it('skips the webhook when the portal has no public address', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    await runJobs({ ...t.deps, config: { ...config, webhookUrl: undefined } });
    expect(t.state.webhooks).toHaveLength(0);
  });
});

describe('Asana tasks', () => {
  it('waits for the project, then files the task in Content, assigned and marked', async () => {
    const t = setup();
    t.queue('upsert_section_task', SEC);
    expect(await runJobs(t.deps)).toMatchObject({ retrying: 1 });
    expect(t.s.jobs[0].error).toMatch(/isn’t set up yet/);

    t.queue('ensure_project', SITE);
    t.s.jobs[0].status = 'pending';
    t.s.jobs.reverse(); // project first, as the queue orders them by age
    await runJobs(t.deps);

    expect(t.state.tasks).toHaveLength(1);
    const task = t.state.tasks[0];
    const content = t.state.sections.find((x) => x.name === 'Content')!;
    expect(task).toMatchObject({ name: 'Firm A LLP: Services: Family law', section: content.gid, assignee: '99', completed: false });
    expect(task.html_notes).toContain('https://portal.test/admin/clients/' + ORG + '/content');
    expect(hasMarker(task.notes, marker('section', SEC))).toBe(true);
    expect(t.s.sections.get(SEC)!.taskGid).toBe(task.gid);
    expect(task.stories).toEqual([]);
  });

  it('updates the same task on resubmission, reopens it and says so', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    const task = t.state.tasks[0];
    task.completed = true;

    t.s.sections.get(SEC)!.title = 'Family and divorce';
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    expect(t.state.tasks).toHaveLength(1);
    expect(task).toMatchObject({ name: 'Firm A LLP: Services: Family and divorce', completed: false });
    expect(task.stories).toEqual(['Resubmitted in the client portal.']);
  });

  it('never duplicates a task whose create response was lost', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    await runJobs(t.deps);
    const project = t.s.sites.get(SITE)!.projectGid!;
    t.state.failNext.push({
      match: /^POST \/tasks$/, status: 504,
      afterwards: () => t.state.tasks.push({
        gid: '777', name: 'x', html_notes: '', notes: `x ${marker('section', SEC)}`, completed: false,
        project, section: '1', stories: [],
      }),
    });
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    t.s.jobs[1].status = 'pending';
    await runJobs(t.deps);
    expect(t.state.tasks).toHaveLength(1);
    expect(t.s.sections.get(SEC)!.taskGid).toBe('777');
  });

  it('recreates a task someone deleted in Asana', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    t.state.tasks = [];
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    expect(t.state.tasks).toHaveLength(1);
    expect(t.s.sections.get(SEC)!.taskGid).toBe(t.state.tasks[0].gid);
  });

  it('files the briefing under Briefing and comments when a section is reopened', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    t.queue('upsert_briefing_task', ORG);
    t.queue('upsert_section_task', SEC);
    await runJobs(t.deps);
    const briefing = t.state.sections.find((x) => x.name === 'Briefing')!;
    expect(t.state.tasks.find((x) => x.section === briefing.gid)?.name).toBe('Firm A LLP: briefing');

    const task = t.state.tasks.find((x) => x.gid === t.s.sections.get(SEC)!.taskGid)!;
    task.completed = true;
    t.s.sections.get(SEC)!.status = 'draft';
    t.queue('section_reopened', SEC);
    await runJobs(t.deps);
    expect(task.completed).toBe(false);
    expect(task.stories).toEqual(['The section was reopened for changes in the client portal.']);
  });

  it('does nothing for a section reopened before it was sent', async () => {
    const t = setup();
    t.s.sections.get(SEC)!.status = 'draft';
    t.queue('upsert_section_task', SEC);
    t.queue('section_reopened', SEC);
    expect(await runJobs(t.deps)).toEqual({ done: 2, retrying: 0, failed: 0 });
    expect(t.state.calls).toEqual([]);
  });
});

describe('retries', () => {
  it('backs off 1m, 5m, 30m, 2h, 12h, and honours Retry-After', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const mins = (d: Date) => (d.getTime() - now.getTime()) / 60_000;
    expect([1, 2, 3, 4, 5, 6, 7].map((a) => mins(nextAttemptAt(a, now)))).toEqual([1, 5, 30, 120, 720, 720, 720]);
    expect(mins(nextAttemptAt(1, now, 600))).toBe(10);
  });

  it('marks a job failed after the last attempt, or at once for a bad request', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    t.s.jobs[0].attempts = 7;
    t.state.failNext.push({ match: /^GET \/teams/, status: 500 });
    expect(await runJobs(t.deps)).toMatchObject({ failed: 1 });
    expect(t.s.jobs[0].error).toMatch(/failed \(500\)/);

    const u = setup();
    u.queue('ensure_project', SITE);
    u.state.failNext.push({ match: /^POST \/projects$/, status: 400 });
    expect(await runJobs(u.deps)).toMatchObject({ failed: 1 });
  });

  it('uses Asana’s Retry-After when rate limited', async () => {
    const t = setup();
    t.queue('ensure_project', SITE);
    t.state.failNext.push({ match: /^GET \/teams/, status: 429, retryAfter: 3600 });
    const before = Date.now();
    await runJobs(t.deps);
    expect(t.s.jobs[0].next!.getTime() - before).toBeGreaterThanOrEqual(3_599_000);
  });

  it('reports Asana errors with status and message', async () => {
    const { state, asana } = fakeAsana();
    state.failNext.push({ match: /./, status: 403 });
    await expect(asana.get('/tasks/1')).rejects.toMatchObject({ status: 403, message: expect.stringContaining('boom') });
    expect(new AsanaError('x', 400).permanent).toBe(true);
    expect(new AsanaError('x', 429).permanent).toBe(false);
  });
});

describe('Asana webhook', () => {
  const body = JSON.stringify({ events: [] });
  const sign = (b: string, secret: string) => createHmac('sha256', secret).update(b).digest('hex');

  it('accepts only correctly signed deliveries', () => {
    expect(validSignature(body, 'shh', sign(body, 'shh'))).toBe(true);
    expect(validSignature(body, 'shh', sign(body, 'other'))).toBe(false);
    expect(validSignature(body + ' ', 'shh', sign(body, 'shh'))).toBe(false);
    expect(validSignature(body, 'shh', null)).toBe(false);
    expect(validSignature(body, 'shh', 'not-hex')).toBe(false);
  });

  it('picks out tasks whose completion changed', () => {
    const events = {
      events: [
        { action: 'changed', resource: { gid: '11', resource_type: 'task' }, change: { field: 'completed' } },
        { action: 'changed', resource: { gid: '11', resource_type: 'task' }, change: { field: 'completed' } },
        { action: 'changed', resource: { gid: '12', resource_type: 'task' }, change: { field: 'name' } },
        { action: 'added', resource: { gid: '13', resource_type: 'task' } },
        { action: 'changed', resource: { gid: '14', resource_type: 'project' } },
        { action: 'changed', resource: { gid: 'x; drop', resource_type: 'task' } },
      ],
    };
    expect(completedTaskChanges(events)).toEqual(['11']);
    expect(completedTaskChanges({})).toEqual([]);
    expect(completedTaskChanges(null)).toEqual([]);
  });

  it('maps completion to approval without touching drafts', () => {
    expect(statusFromTask('submitted', true)).toBe('approved');
    expect(statusFromTask('approved', false)).toBe('submitted');
    expect(statusFromTask('draft', true)).toBeNull();
    expect(statusFromTask('approved', true)).toBeNull();
  });
});

describe('task content', () => {
  it('escapes client text in Asana notes', () => {
    const t = sectionTask({
      id: SEC, orgName: 'Evil <script>', type: 'custom', title: '<img src=x onerror=alert(1)>',
      submittedAt: null, link: 'https://portal.test/x?a=1&b=2',
    });
    expect(t.html_notes).not.toMatch(/<script|<img/);
    expect(t.html_notes).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(t.html_notes).toContain('href="https://portal.test/x?a=1&amp;b=2"');
    expect(t.html_notes.startsWith('<body>')).toBe(true);
    expect(escapeHtml('"&')).toBe('&quot;&amp;');
  });

  it('keeps the handler honest about unknown jobs', async () => {
    const t = setup();
    await expect(handle({ id: 1, action: 'nope' as Job['action'], org_id: null, entity_id: 'x', attempts: 1 }, t.deps))
      .rejects.toThrow(/Unknown job/);
  });
});

describe('client website refresh', () => {
  it('posts the tags to the site with its secret', async () => {
    const t = setup();
    t.s.targets.set(SITE, { url: 'https://firm-a.co.uk/some/page', secret: 's'.repeat(40) });
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response('{"revalidated":true}', { status: 200 });
    }) as typeof fetch;
    t.s.jobs.push({ id: 99, action: 'revalidate_site', org_id: ORG, entity_id: SITE, attempts: 0, status: 'pending' });
    expect(await runJobs({ ...t.deps, fetchImpl })).toMatchObject({ done: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://firm-a.co.uk/api/revalidate');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Bearer ${'s'.repeat(40)}`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ tags: ['portal:posts', 'portal:opening-times', 'portal:documents'] });
  });

  it('retries when the site says no, and skips sites without a website set up', async () => {
    const t = setup();
    t.s.targets.set(SITE, { url: 'https://firm-a.co.uk', secret: 's'.repeat(40) });
    const fetchImpl = (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch;
    t.s.jobs.push({ id: 1, action: 'revalidate_site', org_id: ORG, entity_id: SITE, attempts: 0, status: 'pending' });
    expect(await runJobs({ ...t.deps, fetchImpl })).toMatchObject({ retrying: 1 });
    expect(t.s.jobs[0].error).toMatch(/401/);

    const u = setup();
    u.s.jobs.push({ id: 1, action: 'revalidate_site', org_id: ORG, entity_id: 'other-site', attempts: 0, status: 'pending' });
    expect(await runJobs({ ...u.deps, fetchImpl })).toMatchObject({ done: 1 });
  });
});
