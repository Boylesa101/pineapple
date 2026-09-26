import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Submit } from '@/components/submit';
import { plainText } from '@/lib/content/richtext';
import { sectionBySlug } from '@/lib/content/sections';
import { transparencyLabel } from '@/lib/content/transparency';
import { checklist, loadOnboarding, requireMember, sectionMissing } from '@/lib/onboarding';
import { createSection } from '../../actions';

export const metadata: Metadata = { title: 'Content' };

const STATUS = { draft: 'Draft', submitted: 'Submitted', approved: 'Approved' } as const;

export default async function SectionListPage(props: PageProps<'/onboarding/[orgId]/[slug]'>) {
  const { orgId, slug } = await props.params;
  const cfg = sectionBySlug(slug);
  if (!cfg) notFound();
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const rows = o.sections.filter((s) => s.type === cfg.type);

  // One-per-firm sections go straight to their editor once started.
  if (!cfg.repeatable && rows[0]) redirect(`/onboarding/${orgId}/section/${rows[0].id}`);

  const neededServices =
    cfg.type === 'price_page'
      ? checklist(o).ticked.filter((id) => !rows.some((r) => r.fields?.service === id))
      : [];

  const start = (label: string, service?: string) => (
    <form action={createSection}>
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="type" value={cfg.type} />
      {service && <input type="hidden" name="service" value={service} />}
      <Submit pending="Opening…">{label}</Submit>
    </form>
  );

  return (
    <>
      <h1>{cfg.label}</h1>
      <p className="lede">{cfg.intro}</p>

      {!cfg.repeatable && (o.canAdd ? start(`Start ${cfg.label.toLowerCase()}`) : <p className="small">Not provided.</p>)}

      {cfg.type === 'price_page' && neededServices.length > 0 && o.canAdd && (
        <div className="card muted">
          <h2>Pages you need</h2>
          <p className="small" style={{ marginBottom: 12 }}>From the services you ticked in your briefing:</p>
          <ul style={{ listStyle: 'none' }} className="stack">
            {neededServices.map((s) => (
              <li key={s} className="spread">
                <span>{transparencyLabel(s)}</span>
                {start('Start this page', s)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cfg.repeatable && (
        <>
          {rows.length === 0 ? (
            <div className="card muted small">Nothing added yet.</div>
          ) : (
            <ul className="card checklist">
              {rows.map((r) => {
                const missing = r.status === 'draft' ? sectionMissing(o, r) : [];
                const name =
                  r.title ||
                  (r.type === 'price_page' && r.fields?.service ? transparencyLabel(String(r.fields.service)) : '') ||
                  (r.type === 'faq' && r.fields?.question ? String(r.fields.question) : '') ||
                  (r.type === 'testimonial' && r.fields?.source ? `Testimonial from ${r.fields.source}` : '') ||
                  'Untitled';
                const preview = r.body ? plainText(r.body).slice(0, 120) : '';
                return (
                  <li key={r.id}>
                    <span className={`dot ${r.status !== 'draft' || !missing.length ? 'done' : 'part'}`} aria-hidden />
                    <div style={{ flex: 1 }}>
                      <div className="spread">
                        <Link href={`/onboarding/${orgId}/section/${r.id}`}><strong>{name}</strong></Link>
                        <span className={`pill ${r.status === 'draft' ? '' : 'green'}`}>{STATUS[r.status]}</span>
                      </div>
                      {preview && <div className="small">{preview}{preview.length === 120 ? '…' : ''}</div>}
                      {missing.length > 0 && (
                        <div className="small" style={{ color: 'var(--amber)' }}>Still needed: {missing.join(', ')}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {o.canAdd && start(`Add ${cfg.itemLabel}`)}
        </>
      )}
    </>
  );
}
