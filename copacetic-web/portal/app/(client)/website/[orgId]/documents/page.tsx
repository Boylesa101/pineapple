import type { Metadata } from 'next';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { FileManager } from '@/components/file-manager';
import { Submit } from '@/components/submit';
import { messageFor } from '@/lib/messages';
import { loadDocuments, loadLibrary } from '@/lib/website/data';
import { deleteDocument, updateDocument } from '@/app/(client)/website/actions';
import { AddDocument, ReplaceFile } from './documents-manager';

export const metadata: Metadata = { title: 'Documents' };

export default async function DocumentsPage(props: PageProps<'/website/[orgId]/documents'>) {
  const { orgId } = await props.params;
  const { error } = await props.searchParams;
  const [docs, library] = await Promise.all([loadDocuments(orgId), loadLibrary(orgId, 'document')]);
  const used = new Set(docs.map((d) => d.media_id));
  const unused = library.filter((f) => !used.has(f.id));
  const available = unused.filter((f) => f.status === 'clean');

  return (
    <>
      <h1>Documents</h1>
      <p className="lede">
        Price lists, your complaints procedure, forms and other files for your website. Replacing a file keeps its link the same.
      </p>
      {messageFor(error) && <div className="notice err" role="alert">{messageFor(error)}</div>}

      {docs.length > 0 && (
        <section aria-labelledby="on-site">
          <h2 id="on-site">On your website</h2>
          {docs.map((d) => (
            <article key={d.id} className="card">
              <form action={updateDocument}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="id" value={d.id} />
                <div className="grid2">
                  <div className="field">
                    <label htmlFor={`t-${d.id}`}>Title</label>
                    <input id={`t-${d.id}`} name="title" required maxLength={200} defaultValue={d.title} />
                  </div>
                  <div className="field">
                    <label htmlFor={`d-${d.id}`}>Description</label>
                    <input id={`d-${d.id}`} name="description" maxLength={500} defaultValue={d.description ?? ''} />
                  </div>
                </div>
                <div className="spread">
                  <label className="check">
                    <input type="checkbox" name="visible" defaultChecked={d.visible} /> Show on the website
                  </label>
                  <Submit className="btn ghost" pending="Saving…">Save</Submit>
                </div>
              </form>
              <div className="spread" style={{ marginTop: 12 }}>
                <span className="small">
                  File: {d.file?.downloadUrl ? <a href={d.file.downloadUrl}>{d.file.original_name}</a> : d.file?.original_name ?? 'missing'}
                </span>
                <ReplaceFile orgId={orgId} id={d.id} files={available} />
              </div>
              <form action={deleteDocument} style={{ marginTop: 12 }}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="id" value={d.id} />
                <ConfirmSubmit confirm={`Remove “${d.title}” from your website? The file is deleted too.`}>
                  Remove<span className="sr-only"> {d.title}</span>
                </ConfirmSubmit>
              </form>
            </article>
          ))}
        </section>
      )}

      <section className="card" aria-labelledby="add">
        <h2 id="add">Add a document</h2>
        <FileManager orgId={orgId} sectionId={null} kinds={['document']} files={unused} editable
          label="1. Upload" hint="PDF is best for anything people will download or print." />
        <h3 style={{ marginTop: 18 }}>2. Publish it</h3>
        <AddDocument orgId={orgId} files={available} />
      </section>
    </>
  );
}
