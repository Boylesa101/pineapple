import type { Metadata } from 'next';
import Link from 'next/link';
import { checklist, loadOnboarding, requireMember } from '@/lib/onboarding';
import { SubmitAll } from './submit-all';

export const metadata: Metadata = { title: 'Onboarding' };

export default async function ChecklistPage(props: PageProps<'/onboarding/[orgId]'>) {
  const { orgId } = await props.params;
  const { role } = await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const c = checklist(o);
  const submitted = o.stage !== 'onboarding';

  return (
    <>
      <h1>Your content checklist</h1>
      <p className="lede">
        Everything we need to build your site. Work through it in any order; your changes save automatically.
      </p>
      {submitted && (
        <div className="notice info">
          Your content has been submitted and is read-only. If we need a change, we’ll reopen that section and let you know.
        </div>
      )}
      <ul className="checklist card">
        <li>
          <span className={`dot ${o.briefing.status !== 'draft' || c.briefing.complete ? 'done' : c.briefing.done ? 'part' : ''}`} aria-hidden />
          <div style={{ flex: 1 }}>
            <div className="spread">
              <Link href={`/onboarding/${orgId}/briefing`}><strong>Briefing</strong></Link>
              <span className="small">
                {o.briefing.status !== 'draft' ? 'Submitted' : `${c.briefing.done} of ${c.briefing.total} required answers`}
              </span>
            </div>
            <div className="small">About your firm, goals, pages and timings.</div>
          </div>
        </li>
        {c.items.map((i) => (
          <li key={i.cfg.type}>
            <span className={`dot ${i.done && i.rows.length ? 'done' : i.rows.length ? 'part' : ''}`} aria-hidden />
            <div style={{ flex: 1 }}>
              <div className="spread">
                <Link href={`/onboarding/${orgId}/${i.cfg.slug}`}>
                  <strong>{i.cfg.label}</strong>
                </Link>
                <span className="small">
                  {!i.required && !i.rows.length
                    ? 'Optional'
                    : i.cfg.repeatable
                      ? `${i.rows.length} added${i.submitted ? `, ${i.submitted} submitted` : ''}`
                      : i.submitted
                        ? 'Submitted'
                        : i.rows.length
                          ? 'In progress'
                          : 'Not started'}
                </span>
              </div>
              <div className="small">{i.cfg.intro}</div>
              {(i.requirementMissing || i.incomplete.length > 0) && (
                <div className="small" style={{ color: 'var(--amber)', marginTop: 4 }}>
                  {i.requirementMissing ?? `${i.incomplete.length} still need details`}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!submitted && (
        <div className="card muted">
          <h2>Ready?</h2>
          <SubmitAll orgId={orgId} canSubmit={role === 'owner' || role === 'approver'} />
        </div>
      )}
    </>
  );
}
