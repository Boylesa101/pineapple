import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InviteFlash } from '@/components/invite-flash';
import { Submit } from '@/components/submit';
import { takeInviteFlash } from '@/lib/invitations';
import { messageFor } from '@/lib/messages';
import { ROLE_LABELS, STAGES, stageInfo } from '@/lib/stages';
import { createClient } from '@/lib/supabase/server';
import { ACTION_LABELS, asanaProjectUrl, loadClientSync } from '@/lib/sync';
import { uuid } from '@/lib/validation';
import {
  addBuild,
  deleteBuild,
  inviteToClient,
  linkAsanaProject,
  moveStage,
  removeClientMember,
  requestAsanaProject,
  retrySync,
  revokeInvitation,
  setBuildShared,
  setMemberRole,
} from '@/app/admin/actions';

export const metadata: Metadata = { title: 'Client' };

const ROLES = ['owner', 'approver', 'editor'] as const;
const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function ClientPage(props: PageProps<'/admin/clients/[id]'>) {
  const { id } = await props.params;
  const { error } = await props.searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();

  const [{ data: org }, { data: sites }, { data: members }, { data: invites }, { data: builds }, { data: audit }] =
    await Promise.all([
      supabase.from('organisations').select('id, name, slug, sra_number, created_at').eq('id', id).maybeSingle(),
      supabase.from('sites').select('id, name, stage, stage_changed_at, invoice_on, asana_project_gid').eq('org_id', id).order('created_at'),
      supabase.from('memberships').select('user_id, role, profiles (email, full_name)').eq('org_id', id).order('created_at'),
      supabase
        .from('invitations')
        .select('id, email, role, expires_at, accepted_at, revoked_at, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('builds')
        .select('id, site_id, url, version_label, notes, shared_with_client, status, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('audit_log')
        .select('id, action, entity, before, after, created_at, actor_id')
        .eq('org_id', id)
        .order('id', { ascending: false })
        .limit(25),
    ]);
  if (!org) notFound();
  const [flash, sync] = await Promise.all([takeInviteFlash(), loadClientSync(id)]);
  const problems = sync.jobs.filter((j) => j.status === 'failed');
  const now = new Date();

  return (
    <>
      <Link className="small" href="/admin">← All clients</Link>
      <div className="eyebrow" style={{ marginTop: 14 }}>Client</div>
      <h1>{org.name}</h1>
      <p className="row no-print" style={{ marginBottom: 10 }}>
        <Link className="btn ghost" href={`/admin/clients/${org.id}/content`}>Briefing and content</Link>
      </p>
      <p className="lede">
        <code>{org.slug}</code>
        {org.sra_number && <> · SRA {org.sra_number}</>}
      </p>
      {flash && <InviteFlash {...flash} />}
      {messageFor(error) && (
        <div className="notice err" role="alert">
          {messageFor(error)}
        </div>
      )}

      {(sites ?? []).map((site) => {
        const siteBuilds = (builds ?? []).filter((b) => b.site_id === site.id);
        return (
          <section key={site.id} aria-labelledby={`site-${site.id}`}>
            <div className="card">
              <div className="spread">
                <h2 id={`site-${site.id}`} style={{ marginBottom: 0 }}>{site.name}</h2>
                <span className="pill green">{stageInfo(site.stage).label}</span>
              </div>
              <p className="small" style={{ margin: '6px 0 14px' }}>
                In this stage since {when.format(new Date(site.stage_changed_at))} · Invoicing:{' '}
                {site.invoice_on === 'sign_off' ? 'in full on sign-off' : '50% deposit, balance on sign-off'}
              </p>
              <form action={moveStage} className="row">
                <input type="hidden" name="orgId" value={org.id} />
                <input type="hidden" name="siteId" value={site.id} />
                <label className="sr-only" htmlFor={`stage-${site.id}`}>Stage</label>
                <select id={`stage-${site.id}`} name="stage" defaultValue={site.stage} style={{ width: 'auto' }}>
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <Submit className="btn ghost" pending="Moving…">Move to stage</Submit>
              </form>
            </div>

            <div className="card">
              <div className="spread">
                <h2 style={{ marginBottom: 0 }}>Asana</h2>
                {site.asana_project_gid ? (
                  <a href={asanaProjectUrl(site.asana_project_gid)} target="_blank" rel="noopener noreferrer">
                    Open project<span className="sr-only"> for {site.name}</span>
                  </a>
                ) : (
                  <span className="pill amber">Not set up yet</span>
                )}
              </div>
              <p className="small" style={{ margin: '6px 0 14px' }}>
                {site.asana_project_gid
                  ? 'Submissions become tasks in this project. Completing a content task in Asana approves it here.'
                  : 'The project is created automatically once Asana is connected. You can also link one you already have.'}
              </p>
              <div className="row">
                <form action={linkAsanaProject} className="row">
                  <input type="hidden" name="orgId" value={org.id} />
                  <input type="hidden" name="siteId" value={site.id} />
                  <label className="sr-only" htmlFor={`asana-${site.id}`}>Asana project link or number</label>
                  <input id={`asana-${site.id}`} name="project" required maxLength={300} placeholder="Asana project link or number" style={{ width: 280 }} />
                  <Submit className="btn ghost" pending="Linking…">{site.asana_project_gid ? 'Link a different project' : 'Link existing project'}</Submit>
                </form>
                <form action={requestAsanaProject}>
                  <input type="hidden" name="orgId" value={org.id} />
                  <input type="hidden" name="siteId" value={site.id} />
                  <Submit className="btn link" pending="Queued…">{site.asana_project_gid ? 'Check sections and webhook' : 'Create project now'}</Submit>
                </form>
              </div>
            </div>

            <div className="card">
              <h2>Previews</h2>
              <p className="small" style={{ marginBottom: 14 }}>
                Clients only see previews you share. Vercel protects preview deployments, so paste a{' '}
                <strong>shareable link</strong> (on the deployment in Vercel, choose Share).
              </p>
              {siteBuilds.length > 0 && (
                <div className="table-scroll" style={{ marginBottom: 18 }}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Version</th>
                        <th scope="col">Added</th>
                        <th scope="col">Client can see it</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteBuilds.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <a href={b.url} target="_blank" rel="noopener noreferrer">{b.version_label}</a>
                            {b.notes && <div className="small" style={{ whiteSpace: 'pre-line' }}>{b.notes}</div>}
                          </td>
                          <td className="small">{when.format(new Date(b.created_at))}</td>
                          <td>
                            <form action={setBuildShared} className="row">
                              <input type="hidden" name="orgId" value={org.id} />
                              <input type="hidden" name="buildId" value={b.id} />
                              <input type="hidden" name="share" value={b.shared_with_client ? 'false' : 'true'} />
                              <span className={`pill ${b.shared_with_client ? 'green' : 'amber'}`}>
                                {b.shared_with_client ? 'Shared' : 'Hidden'}
                              </span>
                              <Submit className="btn link">
                                {b.shared_with_client ? 'Hide' : 'Share'}<span className="sr-only"> {b.version_label}</span>
                              </Submit>
                            </form>
                          </td>
                          <td>
                            <form action={deleteBuild}>
                              <input type="hidden" name="orgId" value={org.id} />
                              <input type="hidden" name="buildId" value={b.id} />
                              <Submit className="btn danger">Delete<span className="sr-only"> {b.version_label}</span></Submit>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form action={addBuild}>
                <input type="hidden" name="orgId" value={org.id} />
                <input type="hidden" name="siteId" value={site.id} />
                <h3>Add a preview</h3>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor={`url-${site.id}`}>Preview link</label>
                    <input id={`url-${site.id}`} name="url" type="url" required placeholder="https://…" />
                  </div>
                  <div className="field">
                    <label htmlFor={`label-${site.id}`}>Version label</label>
                    <input id={`label-${site.id}`} name="versionLabel" required maxLength={120} placeholder="v2: homepage revisions" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`notes-${site.id}`}>Notes for the client (optional)</label>
                  <textarea id={`notes-${site.id}`} name="notes" maxLength={4000} placeholder="What changed, and what you’d like them to look at." />
                </div>
                <div className="field">
                  <label className="check">
                    <input type="checkbox" name="share" defaultChecked /> Share with the client now
                  </label>
                </div>
                <Submit pending="Saving…">Add preview</Submit>
              </form>
            </div>
          </section>
        );
      })}

      {problems.length > 0 && (
        <section className="card" aria-labelledby="sync-problems">
          <h2 id="sync-problems">Asana sync problems</h2>
          <ul style={{ listStyle: 'none' }} className="stack">
            {problems.map((j) => (
              <li key={j.id} className="spread">
                <div>
                  <strong>{ACTION_LABELS[j.action] ?? j.action}</strong>{' '}
                  <span className="small">after {j.attempts} attempts · {when.format(new Date(j.updated_at))}</span>
                  {j.last_error && <div className="small mono">{j.last_error}</div>}
                </div>
                <form action={retrySync}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <input type="hidden" name="orgId" value={org.id} />
                  <Submit className="btn ghost" pending="Retrying…">Retry</Submit>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="people">
        <h2 id="people">People</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => {
                const p = m.profiles as unknown as { email: string; full_name: string | null };
                return (
                  <tr key={m.user_id}>
                    <td>
                      {p.full_name && <div>{p.full_name}</div>}
                      <div className="small">{p.email}</div>
                    </td>
                    <td>
                      <form action={setMemberRole} className="row">
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="userId" value={m.user_id} />
                        <label className="sr-only" htmlFor={`r-${m.user_id}`}>Role for {p.email}</label>
                        <select id={`r-${m.user_id}`} name="role" defaultValue={m.role} style={{ width: 'auto' }}>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <Submit className="btn ghost">Save</Submit>
                      </form>
                    </td>
                    <td>
                      <form action={removeClientMember}>
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="userId" value={m.user_id} />
                        <Submit className="btn danger">Remove<span className="sr-only"> {p.email}</span></Submit>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {(invites ?? []).map((i) => {
                const status = i.accepted_at
                  ? null
                  : i.revoked_at
                    ? 'Withdrawn'
                    : new Date(i.expires_at) < now
                      ? 'Expired'
                      : 'Invited';
                if (!status) return null;
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="small">{i.email}</div>
                      <span className={`pill ${status === 'Invited' ? 'amber' : ''}`}>{status}</span>
                    </td>
                    <td>{ROLE_LABELS[i.role as keyof typeof ROLE_LABELS]}</td>
                    <td>
                      {status === 'Invited' && (
                        <form action={revokeInvitation}>
                          <input type="hidden" name="orgId" value={org.id} />
                          <input type="hidden" name="inviteId" value={i.id} />
                          <Submit className="btn danger">Withdraw<span className="sr-only"> invitation for {i.email}</span></Submit>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form action={inviteToClient} style={{ marginTop: 18 }}>
          <input type="hidden" name="orgId" value={org.id} />
          <h3>Invite someone</h3>
          <div className="grid2">
            <div className="field">
              <label htmlFor="inv-email">Email</label>
              <input id="inv-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="inv-role">Role</label>
              <select id="inv-role" name="role" defaultValue="editor">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <Submit pending="Sending…">Send invitation</Submit>
        </form>
        <p className="hint">Re-inviting someone replaces their previous pending invitation.</p>
      </section>

      <section className="card" aria-labelledby="activity">
        <h2 id="activity">Activity</h2>
        {!audit?.length ? (
          <p className="small">Nothing yet.</p>
        ) : (
          <ul style={{ listStyle: 'none' }} className="stack">
            {audit.map((a) => (
              <li key={a.id} className="small">
                <span className="mono">{when.format(new Date(a.created_at))}</span> · {describe(a)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type AuditRow = { action: string; entity: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };

function describe({ action, entity, before, after }: AuditRow) {
  const b = before ?? {};
  const a = after ?? {};
  if (entity === 'sites' && action === 'update' && b.stage !== a.stage) {
    return `Stage moved from ${stageInfo(String(b.stage)).label} to ${stageInfo(String(a.stage)).label}`;
  }
  if (entity === 'memberships') {
    if (action === 'insert') return `Someone joined as ${a.role}`;
    if (action === 'delete') return `Someone was removed (${b.role})`;
    if (action === 'update') return `A role changed from ${b.role} to ${a.role}`;
  }
  if (entity === 'invitations') {
    if (action === 'insert') return `Invitation created for ${a.email} (${a.role})`;
    if (a.accepted_at && !b.accepted_at) return `${a.email} accepted their invitation`;
    if (a.revoked_at && !b.revoked_at) return `Invitation for ${a.email} withdrawn`;
  }
  if (entity === 'builds') {
    if (action === 'insert') return `Preview "${a.version_label}" added${a.shared_with_client ? ' and shared' : ''}`;
    if (action === 'delete') return `Preview "${b.version_label}" deleted`;
    if (b.shared_with_client !== a.shared_with_client) return `Preview "${a.version_label}" ${a.shared_with_client ? 'shared' : 'hidden'}`;
  }
  return `${entity}: ${action}`;
}
