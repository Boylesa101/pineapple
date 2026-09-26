'use client';
import { useCallback, useMemo, useState } from 'react';
import { FileManager, type FileItem } from '@/components/file-manager';
import { RichText } from '@/components/rich-text';
import { SaveIndicator, useAutosave } from '@/components/use-autosave';
import { savePost, setPostSlug } from '@/app/(client)/website/actions';

type Doc = { type: 'doc'; content?: unknown[] };
type Draft = { title: string; summary: string; body: Doc; coverMediaId: string | null };

export function PostEditor({
  orgId, id, version, initial, images, editable, slug, siteUrl,
}: {
  orgId: string; id: string; version: number; initial: Draft; images: FileItem[]; editable: boolean;
  slug: string; siteUrl: string | null;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const save = useCallback(
    (d: Draft, v: number) => savePost({ orgId, id, version: v, ...d }),
    [orgId, id],
  );
  const autosave = useAutosave(draft, version, save);
  const { state } = autosave;
  const covers = useMemo(() => images.filter((i) => i.status === 'clean'), [images]);

  return (
    <div className="stack">
      <div className="spread">
        <span className="small">{editable ? 'Changes save automatically.' : 'Only owners and approvers can change a published post.'}</span>
        <SaveIndicator state={editable ? state : 'locked'} />
      </div>

      <SlugEditor orgId={orgId} id={id} slug={slug} editable={editable} siteUrl={siteUrl} autosave={autosave} />
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" value={draft.title} maxLength={200} readOnly={!editable}
          onChange={(e) => set('title', e.target.value)} placeholder="e.g. Buying your first home: what to expect" />
      </div>
      <div className="field">
        <label htmlFor="summary">Summary</label>
        <textarea id="summary" value={draft.summary} maxLength={500} readOnly={!editable} rows={3}
          onChange={(e) => set('summary', e.target.value)} />
        <p className="hint">One or two sentences shown on the blog page and in search results.</p>
      </div>
      <RichText id="body" label="Post" value={draft.body} readOnly={!editable} onChange={(doc) => set('body', doc)} />

      <fieldset className="fieldset">
        <legend>Cover image</legend>
        {covers.length ? (
          <div className="files" role="radiogroup" aria-label="Cover image">
            <label className="file check" style={{ alignItems: 'flex-start' }}>
              <input type="radio" name="cover" checked={draft.coverMediaId === null} disabled={!editable}
                onChange={() => set('coverMediaId', null)} />
              No cover image
            </label>
            {covers.map((img) => (
              <label key={img.id} className="file" style={{ cursor: editable ? 'pointer' : 'default' }}>
                <div className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img.previewUrl ? <img src={img.previewUrl} alt={img.alt_text ?? ''} /> : <span>IMG</span>}
                </div>
                <span className="check">
                  <input type="radio" name="cover" checked={draft.coverMediaId === img.id} disabled={!editable}
                    onChange={() => set('coverMediaId', img.id)} />
                  <span style={{ wordBreak: 'break-all' }}>{img.alt_text || img.original_name}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="small">Upload an image below, then choose it here.</p>
        )}
      </fieldset>

      {editable && (
        <details>
          <summary>Your website images</summary>
          <div style={{ marginTop: 12 }}>
            <FileManager orgId={orgId} sectionId={null} kinds={['image']} files={images} editable label="Images"
              hint="JPEG, PNG or WebP work best. Describe each image so it’s accessible." />
          </div>
        </details>
      )}
    </div>
  );
}

// The address is saved on its own (it has to be unique), in step with the autosave's version.
function SlugEditor({ orgId, id, slug, editable, siteUrl, autosave }: {
  orgId: string; id: string; slug: string; editable: boolean; siteUrl: string | null;
  autosave: ReturnType<typeof useAutosave<Draft>>;
}) {
  const [value, setValue] = useState(slug);
  const [saved, setSaved] = useState(slug);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const temporary = /^draft-[0-9a-f]{8}$/.test(saved);
  return (
    <div className="field">
      <label htmlFor="slug">Web address</label>
      <div className="row">
        <span className="small mono">{siteUrl ? `${siteUrl.replace(/\/$/, '')}/blog/` : '/blog/'}</span>
        <input id="slug" value={value} maxLength={100} readOnly={!editable} style={{ width: 280 }}
          onChange={(e) => setValue(e.target.value)} />
        {editable && value !== saved && (
          <button type="button" className="btn ghost" disabled={busy} onClick={async () => {
            setBusy(true);
            if (!(await autosave.flush())) {
              setBusy(false);
              setMessage('Your latest changes haven’t saved yet, so the address wasn’t changed. Try again.');
              return;
            }
            const res = await setPostSlug(orgId, id, value, autosave.version.current);
            setBusy(false);
            if (res.ok) {
              autosave.setVersion(res.version);
              setSaved(res.slug);
              setValue(res.slug);
              setMessage(null);
            } else setMessage(res.message);
          }}>
            Save address
          </button>
        )}
      </div>
      {message && <p className="notice err" role="alert" style={{ marginTop: 8 }}>{message}</p>}
      <p className="hint">
        {temporary ? 'We’ll make one from the title when you publish, or set your own.' : 'Changing this after publishing breaks links people have shared.'}
      </p>
    </div>
  );
}
