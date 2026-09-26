'use client';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ColoursEditor, FontsEditor } from '@/components/brand-editors';
import { RichText } from '@/components/rich-text';
import { SaveIndicator, useAutosave } from '@/components/use-autosave';
import { sectionConfig, type Colour, type Font, type SectionField } from '@/lib/content/sections';
import { saveSection, submitSection } from '../../../actions';

type Doc = { type: 'doc'; content?: unknown[] };
type Row = { id: string; type: string; title: string | null; body: Doc | null; fields: Record<string, unknown>; version: number };

export function SectionEditor({ orgId, row, readOnly }: { orgId: string; row: Row; readOnly: boolean }) {
  const cfg = sectionConfig(row.type)!;
  const [title, setTitle] = useState(row.title ?? '');
  const [body, setBody] = useState<Doc | null>(row.body);
  const [fields, setFields] = useState<Record<string, unknown>>(row.fields ?? {});
  const value = useMemo(() => ({ title, body, fields }), [title, body, fields]);
  const save = useCallback(
    (v: typeof value, version: number) =>
      saveSection({ id: row.id, orgId, version, title: cfg.titleLabel ? v.title : row.title, body: v.body as never, fields: v.fields }),
    [row.id, row.title, orgId, cfg.titleLabel],
  );
  const { state, flush } = useAutosave(value, row.version, save);
  const [pending, start] = useTransition();
  const [missing, setMissing] = useState<string[] | null>(null);
  const router = useRouter();
  const locked = readOnly || state === 'locked';
  const set = (key: string, v: unknown) => setFields((f) => ({ ...f, [key]: v }));

  return (
    <div>
      <fieldset disabled={locked} className="fieldset">
        {row.type === 'brand' && (
          <div className="card">
            <ColoursEditor value={(fields.colours as Colour[]) ?? []} onChange={(v) => set('colours', v)} readOnly={locked} />
          </div>
        )}
        {row.type === 'brand' && (
          <div className="card">
            <FontsEditor value={(fields.fonts as Font[]) ?? []} onChange={(v) => set('fonts', v)} readOnly={locked} />
          </div>
        )}
        <div className="card">
          {cfg.titleLabel && (
            <div className="field">
              <label htmlFor="title">{cfg.titleLabel}{cfg.titleRequired && ' *'}</label>
              <input id="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
          {cfg.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={fields[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
          {cfg.bodyLabel && (
            <RichText
              id="body"
              label={`${cfg.bodyLabel}${cfg.bodyRequired ? ' *' : ''}`}
              value={body}
              onChange={setBody}
              readOnly={locked}
            />
          )}
        </div>
      </fieldset>
      <div className="sticky-bar">
        <div className="spread">
          <SaveIndicator state={readOnly ? 'locked' : state} />
          {!locked && (
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await flush();
                  const res = await submitSection(orgId, row.id);
                  if (res.ok) router.refresh();
                  else setMissing(res.missing ?? ['Something went wrong. Try again.']);
                })
              }
            >
              {pending ? 'Submitting…' : 'Submit this section'}
            </button>
          )}
        </div>
        {missing && (
          <div className="notice err" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
            Still needed: {missing.join(', ')}.
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field: f, value, onChange }: { field: SectionField; value: unknown; onChange: (v: unknown) => void }) {
  const id = `f-${f.key}`;
  const label = `${f.label}${f.required ? ' *' : ''}`;
  const hint = f.hint ? <p className="hint" id={`${id}-hint`}>{f.hint}</p> : null;
  if (f.type === 'checkbox') {
    return (
      <div className="field">
        <label className="check">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} /> {label}
        </label>
        {hint}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {f.type === 'select' ? (
        <select id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {f.options!.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea id={id} value={(value as string) ?? ''} maxLength={f.max ?? 5000} onChange={(e) => onChange(e.target.value)}
          aria-describedby={f.hint ? `${id}-hint` : undefined} />
      ) : (
        <input id={id} type={f.type === 'url' ? 'url' : 'text'} value={(value as string) ?? ''} maxLength={f.max ?? 500}
          onChange={(e) => onChange(e.target.value)} aria-describedby={f.hint ? `${id}-hint` : undefined} />
      )}
      {hint}
    </div>
  );
}
