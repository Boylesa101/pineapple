import type { Metadata } from 'next';
import Link from 'next/link';
import { stageInfo, STAGES } from '@/lib/stages';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Clients' };

const days = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default async function AdminHome(props: PageProps<'/admin'>) {
  const { stage } = await props.searchParams;
  const supabase = await createClient();
  const [{ data: orgs }, { data: sites }, { data: builds }, { data: members }, { count: failedSyncs }] = await Promise.all([
    supabase.from('organisations').select('id, name, slug, created_at').order('name'),
    supabase.from('sites').select('id, org_id, name, stage, stage_changed_at'),
    supabase.from('builds').select('site_id, version_label, created_at, shared_with_client').order('created_at', { ascending: false }),
    supabase.from('memberships').select('org_id'),
    supabase.from('integration_events').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);
  const filter = typeof stage === 'string' && STAGES.some((s) => s.id === stage) ? stage : null;
  const rows = (sites ?? [])
    .filter((s) => !filter || s.stage === filter)
    .map((s) => ({
      site: s,
      org: orgs?.find((o) => o.id === s.org_id),
      latest: builds?.find((b) => b.site_id === s.id),
      people: members?.filter((m) => m.org_id === s.org_id).length ?? 0,
    }));

  return (
    <>
      <div className="spread">
        <div>
          <div className="eyebrow">Agency admin</div>
          <h1>Clients</h1>
        </div>
        <Link className="btn" href="/admin/clients/new">
          New client
        </Link>
      </div>
      {!!failedSyncs && (
        <div className="notice err" role="status" style={{ marginTop: 14 }}>
          {failedSyncs === 1 ? '1 change' : `${failedSyncs} changes`} didn’t reach Asana.{' '}
          <Link href="/admin/sync">Review and retry</Link>
        </div>
      )}
      <nav className="row" aria-label="Filter by stage" style={{ margin: '14px 0 18px' }}>
        <Link className={`pill ${!filter ? 'green' : ''}`} href="/admin">All</Link>
        {STAGES.map((s) => (
          <Link key={s.id} className={`pill ${filter === s.id ? 'green' : ''}`} href={`/admin?stage=${s.id}`}>
            {s.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <div className="card muted">
          {filter ? 'No clients at this stage.' : <>No clients yet. <Link href="/admin/clients/new">Add your first client</Link>.</>}
        </div>
      ) : (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Firm</th>
                <th scope="col">Site</th>
                <th scope="col">Stage</th>
                <th scope="col">Days in stage</th>
                <th scope="col">Latest preview</th>
                <th scope="col">People</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ site, org, latest, people }) => (
                <tr key={site.id}>
                  <td>
                    <Link href={`/admin/clients/${site.org_id}`}>{org?.name ?? 'Unknown'}</Link>
                  </td>
                  <td>{site.name}</td>
                  <td><span className="pill">{stageInfo(site.stage).label}</span></td>
                  <td>{days(site.stage_changed_at)}</td>
                  <td>
                    {latest ? (
                      <>
                        {latest.version_label}{' '}
                        {!latest.shared_with_client && <span className="pill amber">Not shared</span>}
                      </>
                    ) : (
                      <span className="small">None</span>
                    )}
                  </td>
                  <td>{people}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
