import type { Metadata } from 'next';
import { loadOnboarding, requireMember } from '@/lib/onboarding';
import { BriefingForm } from './briefing-form';

export const metadata: Metadata = { title: 'Briefing' };

export default async function BriefingPage(props: PageProps<'/onboarding/[orgId]/briefing'>) {
  const { orgId } = await props.params;
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const readOnly = o.briefing.status !== 'draft' || !o.canEditDrafts;
  return (
    <>
      <h1>Briefing</h1>
      <p className="lede">
        {readOnly
          ? 'Your briefing has been submitted. Thank you.'
          : 'Tell us about your firm and what you need. Answers save as you type; required questions are marked *.'}
      </p>
      <BriefingForm
        orgId={orgId}
        initial={o.briefing.data as Record<string, Record<string, unknown>>}
        version={o.briefing.version}
        readOnly={readOnly}
      />
    </>
  );
}
