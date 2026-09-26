import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTIONS } from '@/lib/content/sections';
import { checklist, loadOnboarding, requireMember } from '@/lib/onboarding';
import { uuid } from '@/lib/validation';

export default async function OnboardingLayout(props: LayoutProps<'/onboarding/[orgId]'>) {
  const { orgId } = await props.params;
  if (!uuid.safeParse(orgId).success) notFound();
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const c = checklist(o);
  const pct = Math.round((c.progress.complete / c.progress.total) * 100);
  const briefingDone = o.briefing.status !== 'draft' || c.briefing.complete;
  const dot = (done: boolean, started: boolean) => <span className={`dot ${done ? 'done' : started ? 'part' : ''}`} aria-hidden />;

  return (
    <>
      <Link className="small no-print" href="/">← Overview</Link>
      <div className="eyebrow" style={{ marginTop: 14 }}>Onboarding · {o.org.name}</div>
      <div className="two-col" style={{ marginTop: 10 }}>
        <nav className="side no-print" aria-label="Onboarding sections">
          <div className="small" style={{ marginBottom: 6 }}>{pct}% complete</div>
          <div className="bar" style={{ marginBottom: 14 }} aria-hidden><span style={{ width: `${pct}%` }} /></div>
          <Link href={`/onboarding/${orgId}`}><span>Checklist</span></Link>
          <Link href={`/onboarding/${orgId}/briefing`}>
            <span>Briefing</span>
            {dot(briefingDone, c.briefing.done > 0)}
          </Link>
          {SECTIONS.map((cfg) => {
            const item = c.items.find((i) => i.cfg.type === cfg.type)!;
            return (
              <Link key={cfg.type} href={`/onboarding/${orgId}/${cfg.slug}`}>
                <span>{cfg.label}{!item.required && <span className="small"> (optional)</span>}</span>
                {dot(item.done && item.rows.length > 0, item.rows.length > 0)}
              </Link>
            );
          })}
        </nav>
        <div>{props.children}</div>
      </div>
    </>
  );
}
