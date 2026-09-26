'use client';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BRIEFING, partProgress, type BriefingField } from '@/lib/content/briefing';
import { SaveIndicator, useAutosave } from '@/components/use-autosave';
import { saveBriefing, submitBriefing } from '../../actions';

type Answers = Record<string, Record<string, unknown>>;

export function BriefingForm({ orgId, initial, version, readOnly }: { orgId: string; initial: Answers; version: number; readOnly: boolean }) {
  const [data, setData] = useState<Answers>(initial);
  const save = useCallback((d: Answers, v: number) => saveBriefing(orgId, v, d), [orgId]);
  const { state, flush } = useAutosave(data, version, save);
  const [pending, start] = useTransition();
  const [missing, setMissing] = useState<string[] | null>(null);
  const router = useRouter();

  const set = (part: string, key: string, value: unknown) =>
    setData((d) => ({ ...d, [part]: { ...(d[part] ?? {}), [key]: value } }));

  const locked = readOnly || state === 'locked';

  return (
    <div>
      {BRIEFING.map((part) => {
        const p = partProgress(part, data);
        return (
          <fieldset key={part.id} className="card fieldset" disabled={locked} id={`part-${part.id}`}>
            <legend className="spread" style={{ width: '100%' }}>
              <span>{part.title}</span>
            </legend>
            <div className="small" style={{ marginTop: -6, marginBottom: 12 }}>
              {p.total ? `${p.done} of ${p.total} required answered` : 'All optional'}
            </div>
            {part.intro && <p className="small" style={{ marginBottom: 14 }}>{part.intro}</p>}
            {part.fields.map((f) => (
              <Field key={f.key} id={`${part.id}-${f.key}`} field={f} value={data[part.id]?.[f.key]} onChange={(v) => set(part.id, f.key, v)} />
            ))}
          </fieldset>
        );
      })}
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
                  // Don't submit (and lock) an older copy if the latest edits didn't save.
                  if (!(await flush())) {
                    setMissing(['Your latest changes haven’t saved yet. Check your connection, then try again.']);
                    return;
                  }
                  const res = await submitBriefing(orgId);
                  if (res.ok) router.refresh();
                  else setMissing(res.missing ?? ['Something went wrong. Try again.']);
                })
              }
            >
              {pending ? 'Submitting…' : 'Submit briefing'}
            </button>
          )}
        </div>
        {missing && (
          <div className="notice err" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
            Some required answers are missing in: {missing.join(', ')}.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ id, field: f, value, onChange }: { id: string; field: BriefingField; value: unknown; onChange: (v: unknown) => void }) {
  const label = (
    <>
      {f.label}
      {f.required && <span aria-hidden> *</span>}
      {f.required && <span className="sr-only"> (required)</span>}
    </>
  );
  const hint = f.hint && <p className="hint" id={`${id}-hint`}>{f.hint}</p>;
  const described = f.hint ? `${id}-hint` : undefined;

  if (f.type === 'multi') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="field">
        <legend className="label">{label}</legend>
        <div className="opts">
          {f.options!.map((o) => (
            <label key={o.id}>
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))}
              />
              {o.label}
            </label>
          ))}
        </div>
        {hint}
      </fieldset>
    );
  }
  if (f.type === 'yesno') {
    return (
      <fieldset className="field">
        <legend className="label">{label}</legend>
        <div className="opts">
          {[true, false].map((b) => (
            <label key={String(b)}>
              <input type="radio" name={id} checked={value === b} onChange={() => onChange(b)} /> {b ? 'Yes' : 'No'}
            </label>
          ))}
        </div>
        {hint}
      </fieldset>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {f.type === 'select' ? (
        <select id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} aria-describedby={described}>
          <option value="">Choose…</option>
          {f.options!.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea id={id} value={(value as string) ?? ''} maxLength={5000} onChange={(e) => onChange(e.target.value)} aria-describedby={described} />
      ) : (
        <input
          id={id}
          type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}
          value={(value as string) ?? ''}
          maxLength={500}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={described}
        />
      )}
      {hint}
    </div>
  );
}
