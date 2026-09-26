import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ROLE_LABELS, STAGES, stageIndex, stageInfo } from '@/lib/stages';
import { createClient } from '@/lib/supabase/server';
import { checklist, loadOnboarding } from '@/lib/onboarding';
import { websiteEnabled } from '@/lib/website/load';

export const metadata: Metadata = { title: 'Overview' };

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function Overview(props: PageProps<'/'>) {
  const viewer = await requireUser();
  const { welcome, submitted } = await props.searchParams;
  const supabase = await createClient();

  // RLS limits every query below to the firms this person belongs to, and to shared previews.
  const [{ data: memberships }, { data: sites }, { data: builds }] = await Promise.all([
    supabase.from('memberships').select('role, organisations (id, name)').eq('user_id', viewer.userId),
    supabase.from('sites').select('id, org_id, name, stage, stage_changed_at').order('created_at'),
    supabase
      .from('builds')
      .select('id, site_id, url, version_label, notes, status, created_at')
      .eq('shared_with_client', true)
      .order('created_at', { ascending: false }),
  ]);

  if (!memberships?.length) {
    return (
      <>
        <h1>Welcome</h1>
        <p className="lede">
          Your account isn’t linked to a firm yet. If you were sent an invitation, open the link in that email.
          {viewer.isAgencyAdmin && (
            <>
              {' '}
              Looking for the agency side? <Link href="/admin">Go to agency admin</Link>.
            </>
          )}
        </p>
      </>
    );
  }

  return (
    <>
      {submitted && (
        <div className="notice ok" role="status">
          Thank you. Everything’s with us now, and we’ll be in touch as we start building.
        </div>
      )}
      {welcome && (
        <div className="notice ok" role="status">
          You’ve joined. Welcome to your portal.
        </div>
      )}
      {await Promise.all(memberships.map(async (m) => {
        const org = m.organisations as unknown as { id: string; name: string };
        const orgSites = (sites ?? []).filter((s) => s.org_id === org.id);
        return (
          <section key={org.id} aria-labelledby={`org-${org.id}`}>
            <div className="eyebrow">Your website project</div>
            <div className="spread">
              <h1 id={`org-${org.id}`}>{org.name}</h1>
              <span className="pill">You’re {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS].toLowerCase()}</span>
            </div>
            {await Promise.all(orgSites.map(async (site) => {
              const idx = stageIndex(site.stage);
              const siteBuilds = (builds ?? []).filter((b) => b.site_id === site.id);
              return (
                <div key={site.id}>
                  <div className="card">
                    <div className="spread">
                      <h2 style={{ marginBottom: 0 }}>{site.name}</h2>
                      <span className="pill green">{stageInfo(site.stage).label}</span>
                    </div>
                    <ol className="stages" aria-label={`Stage ${idx + 1} of ${STAGES.length}: ${stageInfo(site.stage).label}`}>
                      {STAGES.map((s, i) => (
                        <li key={s.id} className={i < idx ? 'done' : i === idx ? 'now' : ''} title={s.label} />
                      ))}
                    </ol>
                    <p>{stageInfo(site.stage).client}</p>
                  </div>

                  {websiteEnabled(site.stage) && (
                    <div className="card">
                      <div className="spread">
                        <div>
                          <h2 style={{ marginBottom: 4 }}>Your website</h2>
                          <p className="small">Blog posts, opening times and documents such as your price list.</p>
                        </div>
                        <Link className="btn" href={`/website/${org.id}`}>Manage your website</Link>
                      </div>
                    </div>
                  )}

                  {idx >= stageIndex('onboarding') && (await onboardingCard(org.id))}

                  <div className="card">
                    <h2>Previews</h2>
                    {siteBuilds.length === 0 ? (
                      <p className="small">When a draft of your site is ready to look at, it will appear here.</p>
                    ) : (
                      <ul className="stack" style={{ listStyle: 'none' }}>
                        {siteBuilds.map((b, i) => (
                          <li key={b.id} className="card muted" style={{ marginBottom: 0 }}>
                            <div className="spread">
                              <div>
                                <h3 style={{ marginBottom: 2 }}>
                                  {b.version_label} {i === 0 && <span className="pill green">Latest</span>}
                                </h3>
                                <div className="small">Shared {dateFmt.format(new Date(b.created_at))}</div>
                              </div>
                              <a className="btn" href={b.url} target="_blank" rel="noopener noreferrer">
                                Open preview<span className="sr-only"> of {b.version_label} (opens in a new tab)</span>
                              </a>
                            </div>
                            {b.notes && <p style={{ marginTop: 10, whiteSpace: 'pre-line' }}>{b.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            }))}
          </section>
        );
      }))}
    </>
  );
}

async function onboardingCard(orgId: string) {
  const o = await loadOnboarding(orgId);
  const c = checklist(o);
  const pct = Math.round((c.progress.complete / c.progress.total) * 100);
  const open = o.stage === 'onboarding';
  return (
    <div className="card">
      <div className="spread">
        <h2 style={{ marginBottom: 0 }}>Your content</h2>
        <Link className={open ? 'btn' : 'btn ghost'} href={`/onboarding/${orgId}`}>
          {open ? (pct ? 'Continue' : 'Start') : 'View what you sent'}
        </Link>
      </div>
      {open ? (
        <>
          <p className="small" style={{ margin: '10px 0 6px' }}>
            {c.progress.complete} of {c.progress.total} required parts done: briefing, brand, content and files.
          </p>
          <div className="bar" aria-label={`${pct}% complete`}><span style={{ width: `${pct}%` }} /></div>
        </>
      ) : (
        <p className="small" style={{ marginTop: 10 }}>Submitted. It’s read-only unless we reopen a section for changes.</p>
      )}
    </div>
  );
}
