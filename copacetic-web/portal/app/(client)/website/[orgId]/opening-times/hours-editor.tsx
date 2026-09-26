'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DAYS, DAY_LABELS, type Day, type Interval, type Week } from '@/lib/website/hours';
import { addClosure, saveHours } from '@/app/(client)/website/actions';

const DEFAULT: Interval = { open: '09:00', close: '17:30' };

function IntervalsInput({ id, value, onChange }: { id: string; value: Interval[]; onChange: (v: Interval[]) => void }) {
  const update = (i: number, k: keyof Interval, v: string) => onChange(value.map((iv, j) => (j === i ? { ...iv, [k]: v } : iv)));
  return (
    <div className="stack">
      {value.map((iv, i) => (
        <div key={i} className="row">
          <label className="sr-only" htmlFor={`${id}-${i}-open`}>Opens</label>
          <input id={`${id}-${i}-open`} type="time" value={iv.open} required style={{ width: 'auto' }}
            onChange={(e) => update(i, 'open', e.target.value)} />
          <span className="small">to</span>
          <label className="sr-only" htmlFor={`${id}-${i}-close`}>Closes</label>
          <input id={`${id}-${i}-close`} type="time" value={iv.close} required style={{ width: 'auto' }}
            onChange={(e) => update(i, 'close', e.target.value)} />
          <button type="button" className="btn link" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            Remove<span className="sr-only"> this period</span>
          </button>
        </div>
      ))}
      {value.length < 3 && (
        <button type="button" className="btn link" onClick={() => {
          const last = value[value.length - 1];
          onChange([...value, last ? { open: last.close < '23:00' ? last.close : '09:00', close: '17:30' } : DEFAULT]);
        }}>
          {value.length ? 'Add another period (e.g. after lunch)' : 'Add opening hours'}
        </button>
      )}
    </div>
  );
}

export function HoursEditor({ orgId, officeId, weekly, note }: { orgId: string; officeId: string; weekly: Week; note: string | null }) {
  const router = useRouter();
  const [week, setWeek] = useState<Record<Day, Interval[]>>(
    Object.fromEntries(DAYS.map((d) => [d, weekly[d] ?? []])) as Record<Day, Interval[]>,
  );
  const [text, setText] = useState(note ?? '');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await saveHours({ orgId, officeId, weekly: week, note: text });
        setBusy(false);
        setStatus(res.ok ? { ok: true, message: 'Saved. Your site updates within a minute.' } : { ok: false, message: res.message ?? 'Not saved.' });
        if (res.ok) router.refresh();
      }}
    >
      <div className="table-scroll">
        <table>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d}>
                <th scope="row" style={{ width: 130 }}>{DAY_LABELS[d]}</th>
                <td>
                  {!week[d].length && <span className="small" style={{ marginRight: 10 }}>Closed</span>}
                  <IntervalsInput id={`${officeId}-${d}`} value={week[d]} onChange={(v) => setWeek((w) => ({ ...w, [d]: v }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ margin: '10px 0 14px' }}>
        <button type="button" className="btn link" onClick={() =>
          setWeek((w) => ({ ...w, tue: w.mon, wed: w.mon, thu: w.mon, fri: w.mon }))}>
          Copy Monday’s hours to Tuesday–Friday
        </button>
      </div>
      <div className="field">
        <label htmlFor={`${officeId}-note`}>Note (optional)</label>
        <input id={`${officeId}-note`} value={text} maxLength={300} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Saturday appointments by arrangement" />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save opening times'}</button>
        {status && <span className={`pill ${status.ok ? 'green' : 'red'}`} role="status">{status.message}</span>}
      </div>
    </form>
  );
}

export function ClosureForm({ orgId, offices }: { orgId: string; offices: { id: string; name: string }[] }) {
  const router = useRouter();
  const [day, setDay] = useState('');
  const [closed, setClosed] = useState(true);
  const [hours, setHours] = useState<Interval[]>([{ open: '10:00', close: '14:00' }]);
  const [note, setNote] = useState('');
  const [which, setWhich] = useState<string[]>(offices.map((o) => o.id));
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await addClosure({ orgId, officeIds: which, day, closed, hours: closed ? [] : hours, note });
        setBusy(false);
        setStatus(res.ok ? { ok: true, message: 'Added.' } : { ok: false, message: res.message ?? 'Not saved.' });
        if (res.ok) {
          setDay('');
          setNote('');
          router.refresh();
        }
      }}
    >
      <div className="grid2">
        <div className="field">
          <label htmlFor="closure-day">Date</label>
          <input id="closure-day" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="closure-note">Reason (shown on your site)</label>
          <input id="closure-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Christmas Day" />
        </div>
      </div>
      <fieldset className="field" style={{ border: 0 }}>
        <legend className="label">On that day we are</legend>
        <label className="check"><input type="radio" name="closed" checked={closed} onChange={() => setClosed(true)} /> Closed all day</label>
        <label className="check"><input type="radio" name="closed" checked={!closed} onChange={() => setClosed(false)} /> Open with special hours</label>
        {!closed && <div style={{ marginTop: 8 }}><IntervalsInput id="closure" value={hours} onChange={setHours} /></div>}
      </fieldset>
      {offices.length > 1 && (
        <fieldset className="field" style={{ border: 0 }}>
          <legend className="label">Which offices?</legend>
          {offices.map((o) => (
            <label key={o.id} className="check">
              <input type="checkbox" checked={which.includes(o.id)}
                onChange={(e) => setWhich((w) => (e.target.checked ? [...w, o.id] : w.filter((x) => x !== o.id)))} />
              {o.name}
            </label>
          ))}
        </fieldset>
      )}
      <div className="row">
        <button className="btn" type="submit" disabled={busy || !which.length}>{busy ? 'Saving…' : 'Add day'}</button>
        {status && <span className={`pill ${status.ok ? 'green' : 'red'}`} role="status">{status.message}</span>}
      </div>
    </form>
  );
}
