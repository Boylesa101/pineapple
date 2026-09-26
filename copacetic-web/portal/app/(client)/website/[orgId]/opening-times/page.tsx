import type { Metadata } from 'next';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { loadOffices } from '@/lib/website/data';
import { formatIntervals, formatTime, openNow } from '@/lib/website/hours';
import { deleteClosure } from '@/app/(client)/website/actions';
import { ClosureForm, HoursEditor } from './hours-editor';

export const metadata: Metadata = { title: 'Opening times' };

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function OpeningTimesPage(props: PageProps<'/website/[orgId]/opening-times'>) {
  const { orgId } = await props.params;
  const offices = await loadOffices(orgId);

  return (
    <>
      <h1>Opening times</h1>
      <p className="lede">Changes go live on your website within a minute. Times are UK time.</p>
      {!offices.length && (
        <div className="card muted">
          Your offices come from the details you sent during onboarding, and none are set up yet. Tell us and we’ll add them.
        </div>
      )}

      {offices.map((o) => {
        const now = openNow(o.weekly, o.closures, new Date());
        return (
          <section key={o.id} className="card" aria-labelledby={`office-${o.id}`}>
            <div className="spread">
              <h2 id={`office-${o.id}`} style={{ marginBottom: 0 }}>{o.name}</h2>
              <span className={`pill ${now.open ? 'green' : ''}`}>
                {now.open && now.closesAt ? `Open now, until ${formatTime(now.closesAt)}` : 'Closed now'}
              </span>
            </div>
            {o.address && <p className="small" style={{ margin: '6px 0 14px', whiteSpace: 'pre-line' }}>{o.address}</p>}
            <HoursEditor orgId={orgId} officeId={o.id} weekly={o.weekly} note={o.note} />
          </section>
        );
      })}

      {offices.length > 0 && (
        <section className="card" aria-labelledby="special-days">
          <h2 id="special-days">Bank holidays, closures and special hours</h2>
          <p className="small" style={{ marginBottom: 14 }}>These override the weekly hours on that date only.</p>
          {offices.some((o) => o.closures.length) && (
            <div className="table-scroll" style={{ marginBottom: 18 }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Office</th>
                    <th scope="col">Hours</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {offices.flatMap((o) => o.closures.map((c) => ({ ...c, office: o.name })))
                    .sort((a, b) => a.day.localeCompare(b.day))
                    .map((c) => (
                      <tr key={c.id}>
                        <td>{dayFmt.format(new Date(`${c.day}T00:00:00Z`))}{c.note && <div className="small">{c.note}</div>}</td>
                        <td>{c.office}</td>
                        <td>{formatIntervals(c.hours)}</td>
                        <td>
                          <form action={deleteClosure}>
                            <input type="hidden" name="orgId" value={orgId} />
                            <input type="hidden" name="id" value={c.id} />
                            <ConfirmSubmit confirm="Remove this day?">Remove</ConfirmSubmit>
                          </form>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>Add a day</h3>
          <ClosureForm orgId={orgId} offices={offices.map((o) => ({ id: o.id, name: o.name }))} />
        </section>
      )}
    </>
  );
}
