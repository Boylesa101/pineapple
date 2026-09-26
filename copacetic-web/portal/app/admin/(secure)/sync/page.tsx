import type { Metadata } from 'next';
import Link from 'next/link';
import { Submit } from '@/components/submit';
import { asanaConfigured } from '@/lib/jobs';
import { ACTION_LABELS, loadSyncProblems } from '@/lib/sync';
import { retrySync } from '@/app/admin/actions';

export const metadata: Metadata = { title: 'Asana sync' };

const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function SyncPage() {
  const jobs = await loadSyncProblems();
  const failed = jobs.filter((j) => j.status === 'failed');
  const waiting = jobs.filter((j) => j.status !== 'failed');

  return (
    <>
      <div className="eyebrow">Agency admin</div>
      <h1>Asana sync</h1>
      <p className="lede">
        Submissions reach Asana through a queue, so nothing is lost if Asana is slow or down. Anything that
        still fails after several tries waits here for you.
      </p>
      {!asanaConfigured() && (
        <div className="notice" role="status">
          Asana isn’t connected yet, so changes are queued and will be sent once it is.
        </div>
      )}

      <section className="card" aria-labelledby="failed">
        <h2 id="failed">Needs attention</h2>
        {!failed.length ? (
          <p className="small">Nothing has failed.</p>
        ) : (
          <JobTable jobs={failed} retry />
        )}
      </section>

      <section className="card" aria-labelledby="waiting">
        <h2 id="waiting">Waiting to send</h2>
        {!waiting.length ? <p className="small">The queue is empty.</p> : <JobTable jobs={waiting} />}
      </section>
    </>
  );
}

function JobTable({ jobs, retry }: { jobs: Awaited<ReturnType<typeof loadSyncProblems>>; retry?: boolean }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Client</th>
            <th scope="col">What</th>
            <th scope="col">{retry ? 'Last tried' : 'Next try'}</th>
            <th scope="col">Attempts</th>
            {retry && <th scope="col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>
                {j.org_id ? <Link href={`/admin/clients/${j.org_id}`}>{j.organisations?.name ?? 'Client'}</Link> : '—'}
              </td>
              <td>
                {ACTION_LABELS[j.action] ?? j.action}
                {j.last_error && <div className="small mono">{j.last_error}</div>}
              </td>
              <td className="small">{when.format(new Date(retry ? j.updated_at : j.next_attempt_at))}</td>
              <td>{j.attempts}</td>
              {retry && (
                <td>
                  <form action={retrySync}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <Submit className="btn ghost" pending="Retrying…">Retry</Submit>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
