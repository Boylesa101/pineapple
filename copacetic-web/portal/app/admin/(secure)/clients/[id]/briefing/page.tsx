import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BriefingView } from '@/components/briefing-view';
import { PrintButton } from '@/components/print-button';
import { loadOnboarding } from '@/lib/onboarding';
import { uuid } from '@/lib/validation';

export const metadata: Metadata = { title: 'Briefing' };

const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Print-ready briefing: use the browser's Print > Save as PDF.
export default async function BriefingPrintPage(props: PageProps<'/admin/clients/[id]/briefing'>) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  const o = await loadOnboarding(id);
  return (
    <>
      <div className="spread no-print" style={{ marginBottom: 18 }}>
        <p className="small">Use Print, then Save as PDF.</p>
        <PrintButton />
      </div>
      <div className="eyebrow">Client briefing</div>
      <h1>{o.org.name}</h1>
      <p className="lede">
        {o.briefing.status === 'submitted' && o.briefing.submitted_at
          ? `Submitted ${when.format(new Date(o.briefing.submitted_at))}`
          : 'Draft: not yet submitted'}
      </p>
      <BriefingView data={o.briefing.data as Record<string, Record<string, unknown>>} />
    </>
  );
}
