'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FileItem } from '@/components/file-manager';
import { addDocument, replaceDocumentFile } from '@/app/(client)/website/actions';

// Turn an uploaded (and checked) file into a document on the website.
export function AddDocument({ orgId, files }: { orgId: string; files: FileItem[] }) {
  const router = useRouter();
  const [mediaId, setMediaId] = useState(files[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!files.length) return <p className="small">Upload a file above first. Once it’s been checked you can publish it here.</p>;

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const res = await addDocument({ orgId, mediaId, title, description });
      setBusy(false);
      if (!res.ok) return setMessage(res.message ?? 'Not added.');
      setMessage(null);
      setTitle('');
      setDescription('');
      router.refresh();
    }}>
      <div className="grid2">
        <div className="field">
          <label htmlFor="doc-file">File</label>
          <select id="doc-file" value={mediaId} onChange={(e) => setMediaId(e.target.value)}>
            {files.map((f) => <option key={f.id} value={f.id}>{f.original_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="doc-title">Title shown on your site</label>
          <input id="doc-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Residential conveyancing price list" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="doc-desc">Description (optional)</label>
        <input id="doc-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {message && <p className="notice err" role="alert">{message}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add to website'}</button>
    </form>
  );
}

export function ReplaceFile({ orgId, id, files }: { orgId: string; id: string; files: FileItem[] }) {
  const router = useRouter();
  const [mediaId, setMediaId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  if (!files.length) return null;
  return (
    <div className="row">
      <label className="sr-only" htmlFor={`replace-${id}`}>Replace with</label>
      <select id={`replace-${id}`} value={mediaId} onChange={(e) => setMediaId(e.target.value)} style={{ width: 'auto' }}>
        <option value="">Replace the file with…</option>
        {files.map((f) => <option key={f.id} value={f.id}>{f.original_name}</option>)}
      </select>
      <button type="button" className="btn ghost" disabled={!mediaId} onClick={async () => {
        const res = await replaceDocumentFile(orgId, id, mediaId);
        if (!res.ok) return setMessage(res.message ?? 'Not replaced.');
        setMessage(null);
        setMediaId('');
        router.refresh();
      }}>
        Replace
      </button>
      {message && <span className="pill red" role="alert">{message}</span>}
    </div>
  );
}
