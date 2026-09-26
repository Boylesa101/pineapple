import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileManager } from '@/components/file-manager';
import { Submit } from '@/components/submit';
import { sectionConfig } from '@/lib/content/sections';
import { withFileUrls } from '@/lib/files';
import { loadOnboarding, requireMember } from '@/lib/onboarding';
import { uuid } from '@/lib/validation';
import { deleteSection } from '../../../actions';
import { SectionEditor } from './section-editor';

export const metadata: Metadata = { title: 'Edit section' };

export default async function SectionPage(props: PageProps<'/onboarding/[orgId]/section/[id]'>) {
  const { orgId, id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const row = o.sections.find((s) => s.id === id);
  if (!row) notFound();
  const cfg = sectionConfig(row.type)!;
  const editable = row.status === 'draft' && o.canEditDrafts;
  const files = cfg.media ? await withFileUrls(o.media.filter((m) => m.section_id === row.id)) : [];

  return (
    <>
      <Link className="small" href={`/onboarding/${orgId}/${cfg.slug}`}>← {cfg.label}</Link>
      <div className="spread" style={{ marginTop: 10 }}>
        <h1>{cfg.repeatable ? row.title || `New ${cfg.itemLabel.replace(/^an? /, '')}` : cfg.label}</h1>
        <span className={`pill ${row.status === 'draft' ? '' : 'green'}`}>
          {row.status === 'draft' ? 'Draft' : row.status === 'submitted' ? 'Submitted' : 'Approved'}
        </span>
      </div>
      <p className="lede">{cfg.intro}</p>
      {!editable && (
        <div className="notice info">
          {row.status === 'draft'
            ? 'Editing is closed at this stage of your project.'
            : 'This section has been submitted, so it’s read-only. If it needs changing, we’ll reopen it.'}
        </div>
      )}
      <SectionEditor
        orgId={orgId}
        row={{ id: row.id, type: row.type, title: row.title, body: row.body as never, fields: row.fields ?? {}, version: row.version }}
        readOnly={!editable}
      />
      {cfg.media && (
        <div className="card" style={{ marginTop: 20 }}>
          <FileManager
            orgId={orgId}
            sectionId={row.id}
            kinds={cfg.media.kinds}
            files={files}
            editable={editable}
            label={cfg.media.label}
            hint={cfg.media.hint}
          />
        </div>
      )}
      {cfg.repeatable && editable && o.canAdd && (
        <form action={deleteSection} className="no-print" style={{ marginTop: 20 }}>
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="id" value={row.id} />
          <Submit className="btn danger" pending="Deleting…">Delete this {cfg.itemLabel.replace(/^an? /, '')}</Submit>
        </form>
      )}
    </>
  );
}
