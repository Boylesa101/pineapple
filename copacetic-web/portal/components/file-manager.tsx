'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import type { MediaKind } from '@/lib/content/sections';
import { acceptFor, extOf, KIND_EXTS, KIND_LABELS, MAX_UPLOAD_BYTES } from '@/lib/uploads';
import { deleteMedia, finalizeUpload, requestUpload, updateMedia } from '@/app/(client)/onboarding/actions';

export type FileItem = {
  id: string;
  kind: MediaKind;
  original_name: string;
  size_bytes: number;
  label: string | null;
  alt_text: string | null;
  status: 'pending' | 'clean' | 'rejected';
  previewUrl: string | null;
  downloadUrl: string | null;
};

const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Upload flow: register the file (server), upload straight to private storage (browser, one-time
// link), then ask the server to check the contents and mark it clean.
export function FileManager({
  orgId, sectionId, kinds, files, editable, label, hint,
}: { orgId: string; sectionId: string; kinds: MediaKind[]; files: FileItem[]; editable: boolean; label: string; hint?: string }) {
  return (
    <div className="stack">
      <h2>{label}</h2>
      {hint && <p className="small">{hint}</p>}
      {kinds.map((kind) => (
        <KindGroup
          key={kind}
          orgId={orgId}
          sectionId={sectionId}
          kind={kind}
          files={files.filter((f) => f.kind === kind)}
          editable={editable}
          showHeading={kinds.length > 1}
        />
      ))}
    </div>
  );
}

function KindGroup({ orgId, sectionId, kind, files, editable, showHeading }: {
  orgId: string; sectionId: string; kind: MediaKind; files: FileItem[]; editable: boolean; showHeading: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [licence, setLicence] = useState(false);
  const [alt, setAlt] = useState('');

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    for (const file of Array.from(list)) {
      const ext = extOf(file.name);
      if (!ext || !KIND_EXTS[kind].includes(ext)) {
        setError(`${file.name}: that type isn’t accepted here (use ${KIND_EXTS[kind].join(', ')}).`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`${file.name} is larger than 25 MB.`);
        continue;
      }
      if (kind === 'image' && !alt.trim()) {
        setError('Describe the image first (alt text) so it’s accessible on your site.');
        return;
      }
      setBusy(`Uploading ${file.name}…`);
      const ticket = await requestUpload({
        orgId, sectionId, kind, name: file.name, size: file.size,
        fontLicence: kind === 'font' ? licence : undefined,
        altText: kind === 'image' ? alt : undefined,
      });
      if (!ticket.ok) {
        setError(ticket.message);
        continue;
      }
      const { error: upErr } = await createClient()
        .storage.from('client-files')
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.contentType });
      if (upErr) {
        await deleteMedia(orgId, ticket.mediaId);
        setError(`${file.name} didn’t upload. Check your connection and try again.`);
        continue;
      }
      setBusy(`Checking ${file.name}…`);
      const result = await finalizeUpload(orgId, ticket.mediaId);
      if (result.status === 'rejected') setError(result.message ?? `${file.name} was not accepted.`);
    }
    setBusy(null);
    setAlt('');
    if (input.current) input.current.value = '';
    router.refresh();
  }

  const inputId = `upload-${sectionId}-${kind}`;
  return (
    <section aria-label={KIND_LABELS[kind]}>
      {showHeading && <h3>{KIND_LABELS[kind]}</h3>}
      {files.length > 0 && (
        <div className="files" style={{ marginBottom: 10 }}>
          {files.map((f) => <FileCard key={f.id} orgId={orgId} file={f} editable={editable} />)}
        </div>
      )}
      {editable && (
        <div className="drop">
          {kind === 'image' && (
            <div className="field">
              <label htmlFor={`${inputId}-alt`}>Describe the image (alt text)</label>
              <input id={`${inputId}-alt`} value={alt} maxLength={500} onChange={(e) => setAlt(e.target.value)}
                placeholder="e.g. Partners outside the Leeds office" />
            </div>
          )}
          {kind === 'font' && (
            <label className="check field">
              <input type="checkbox" checked={licence} onChange={(e) => setLicence(e.target.checked)} />
              We hold a licence that lets us share these font files for our website
            </label>
          )}
          <label htmlFor={inputId} className="label">
            Add {KIND_LABELS[kind].toLowerCase()} ({KIND_EXTS[kind].join(', ')}; up to 25 MB each)
          </label>
          <input
            ref={input}
            id={inputId}
            type="file"
            multiple
            accept={acceptFor(kind)}
            disabled={!!busy || (kind === 'font' && !licence)}
            onChange={(e) => upload(e.target.files)}
          />
          {busy && <p className="small" role="status" style={{ marginTop: 8 }}>{busy}</p>}
          {error && <p className="notice err" role="alert" style={{ marginTop: 8, marginBottom: 0 }}>{error}</p>}
        </div>
      )}
      {!editable && files.length === 0 && <p className="small">None.</p>}
    </section>
  );
}

function FileCard({ orgId, file: f, editable }: { orgId: string; file: FileItem; editable: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState(f.label ?? '');
  const [alt, setAlt] = useState(f.alt_text ?? '');
  return (
    <div className="file">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.previewUrl ? <img src={f.previewUrl} alt={f.alt_text ?? ''} /> : <span>{(extOf(f.original_name) ?? 'file').toUpperCase()}</span>}
      </div>
      <div style={{ wordBreak: 'break-all' }}>{f.original_name}</div>
      <div className="small">
        {size(f.size_bytes)} ·{' '}
        {f.status === 'clean' ? 'Checked' : f.status === 'pending' ? 'Checking…' : 'Not accepted'}
      </div>
      {editable ? (
        <>
          <label className="sr-only" htmlFor={`lbl-${f.id}`}>Label for {f.original_name}</label>
          <input id={`lbl-${f.id}`} value={label} placeholder={f.kind === 'logo' ? 'e.g. Primary, Reversed, Icon' : 'Label (optional)'}
            onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== (f.label ?? '') && updateMedia(orgId, f.id, { label })} />
          {f.kind === 'image' && (
            <>
              <label className="sr-only" htmlFor={`alt-${f.id}`}>Alt text for {f.original_name}</label>
              <input id={`alt-${f.id}`} value={alt} placeholder="Alt text"
                onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== (f.alt_text ?? '') && updateMedia(orgId, f.id, { altText: alt })} />
            </>
          )}
        </>
      ) : (
        f.label && <div className="small">{f.label}</div>
      )}
      <div className="spread">
        {f.downloadUrl ? <a href={f.downloadUrl} className="small">Download</a> : <span />}
        {editable && (
          <button type="button" className="btn danger" onClick={async () => {
            if (!window.confirm(`Remove ${f.original_name}?`)) return;
            await deleteMedia(orgId, f.id);
            router.refresh();
          }}>
            Remove<span className="sr-only"> {f.original_name}</span>
          </button>
        )}
      </div>
    </div>
  );
}
